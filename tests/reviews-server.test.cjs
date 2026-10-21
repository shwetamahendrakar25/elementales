const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync('integrations/google-reviews/Code.gs', 'utf8');

function app(options = {}) {
  const rows = [['Submission ID', 'Submitted at (UTC)', 'Name', 'Email (private)',
    'Photography type', 'Rating', 'Review', 'Permission to publish', 'Status', 'Private notes']];
  const cache = new Map();
  let writes = 0;
  let released = 0;
  const sheet = {
    getLastRow: () => rows.length,
    getMaxRows: () => 1000,
    getRange(row, column, height, width) {
      return {
        getValues: () => rows.slice(row - 1, row - 1 + height).map(r => r.slice(column - 1, column - 1 + width)),
        setNumberFormat() { return this; },
        setValues(values) {
          if (options.writeFails) throw new Error('Storage unavailable');
          writes++;
          values.forEach((r, i) => { rows[row - 1 + i] = r; });
          return this;
        },
        createTextFinder(id) {
          return { matchEntireCell() { return this; }, findNext() {
            const index = rows.findIndex(r => r[0] === id);
            return index > 0 ? { getRow: () => index + 1 } : null;
          } };
        }
      };
    }
  };
  const context = vm.createContext({
    Date, JSON, Number, String, Object, Error,
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => options.unconfigured ? null : 'private-sheet-id' }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => !options.lockFails, releaseLock: () => { released++; } }) },
    CacheService: { getScriptCache: () => ({ get: key => cache.get(key), put: (key, value) => cache.set(key, value) }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, data) => [...crypto.createHash('sha256').update(data).digest()] },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 'all' }, createHtmlOutput(html) {
      return { html, setXFrameOptionsMode() { return this; } };
    } }
  });
  vm.runInContext(source, context);
  return { context, rows, cache, writes: () => writes, released: () => released };
}
function payload(overrides = {}) {
  return { name: 'Test client', email: 'client@example.com', service: 'Family', rating: '5',
    message: 'A thoughtful photography experience.', consent: 'yes', website: '',
    requestId: crypto.randomUUID(), startedAt: String(Date.now() - 5000),
    parentOrigin: 'https://elementales.biz', ...overrides };
}
function submit(instance, data) {
  const event = { parameter: data, parameters: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, [v]])), postData: { length: 2000 } };
  const result = instance.context.doPost(event).html;
  const match = result.match(/postMessage\((\{.*?\}),/);
  return { html: result, ack: match && JSON.parse(match[1]) };
}

test('saves private feedback without publication consent as Pending', () => {
  const instance = app();
  const result = submit(instance, payload({ consent: '' }));
  assert.equal(result.ack.ok, true);
  assert.equal(instance.rows.length, 2);
  assert.equal(instance.rows[1][7], 'No');
  assert.equal(instance.rows[1][8], 'Pending');
  assert.equal(instance.released(), 1);
  assert.ok(!result.html.includes('client@example.com'));
  assert.ok(!result.html.includes('private-sheet-id'));
});
test('retrying the same request saves exactly once; conflicting reuse is rejected', () => {
  const instance = app();
  const data = payload();
  assert.equal(submit(instance, data).ack.ok, true);
  assert.equal(submit(instance, data).ack.ok, true);
  assert.equal(instance.writes(), 1);
  assert.equal(submit(instance, { ...data, message: 'Different review' }).ack.ok, false);
  assert.equal(instance.writes(), 1);
});
test('protects sheet cells from formulas and accepts duplicate after Sheets strips a quote', () => {
  const instance = app();
  const data = payload({ name: '=IMPORTXML("https://example.invalid", "x")', message: '@SUM(A1)' });
  assert.equal(submit(instance, data).ack.ok, true);
  assert.ok(instance.rows[1][2].startsWith("'="));
  assert.ok(instance.rows[1][6].startsWith("'@"));
  instance.rows[1][2] = instance.rows[1][2].slice(1);
  instance.rows[1][6] = instance.rows[1][6].slice(1);
  assert.equal(submit(instance, data).ack.ok, true);
  assert.equal(instance.writes(), 1);
});
test('rejects invalid fields, spam trap, short completion, oversized text, and forged consent', () => {
  for (const bad of [{ rating: '0' }, { rating: '6' }, { email: 'broken' }, { service: 'Unknown' },
    { website: 'spam' }, { name: '' }, { message: 'x'.repeat(3001) },
    { consent: 'approved' }, { startedAt: String(Date.now()) }, { requestId: 'not-an-id' }]) {
    const instance = app();
    const result = submit(instance, payload(bad));
    assert.equal(result.ack.ok, false);
    assert.equal(instance.writes(), 0);
  }
});
test('no success on storage failure, unconfigured spreadsheet, or lock failure', () => {
  for (const option of [{ writeFails: true }, { unconfigured: true }, { lockFails: true }]) {
    const instance = app(option);
    const result = submit(instance, payload());
    assert.equal(result.ack.ok, false);
    assert.equal(instance.rows.length, 1);
  }
});
test('rate limiting rejects new attempts while still acknowledging saved retries', () => {
  const instance = app();
  const data = payload();
  assert.equal(submit(instance, data).ack.ok, true);
  assert.equal(submit(instance, payload()).ack.ok, true);
  assert.equal(submit(instance, payload()).ack.ok, true);
  assert.equal(submit(instance, payload()).ack.code, 'RATE_LIMIT');
  assert.equal(submit(instance, data).ack.ok, true);
  assert.equal(instance.writes(), 3);
});
test('public GET and invalid origins expose no private records', () => {
  const instance = app();
  submit(instance, payload());
  const get = instance.context.doGet().html;
  assert.ok(!get.includes('client@example.com'));
  assert.ok(!get.includes('private-sheet-id'));
  const before = instance.writes();
  const result = submit(instance, payload({ parentOrigin: 'https://attacker.example' }));
  assert.equal(result.ack, null);
  assert.equal(instance.writes(), before);
});
test('only a unique valid POST can write, and replies contain no user HTML', () => {
  const instance = app();
  const data = payload({ message: '</script><img src=x onerror=alert(1)>' });
  const event = { parameter: data, parameters: { name: ['A', 'B'] }, postData: { length: 2000 } };
  assert.match(instance.context.doPost(event).html, /"ok":false/);
  assert.equal(instance.writes(), 0);
  const result = submit(instance, data);
  assert.equal(result.ack.ok, true);
  assert.ok(!result.html.includes('<img'));
});
