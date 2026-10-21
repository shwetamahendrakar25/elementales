const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID, webcrypto } = require('node:crypto');
const source = fs.readFileSync('reviews.js', 'utf8');

function client(endpoint = 'https://script.google.com/macros/s/test-deployment/exec', cryptoApi = { randomUUID }) {
  const listeners = {};
  const timers = new Map();
  const sent = [];
  let reset = 0;
  let timerId = 0;
  const status = { textContent: '', dataset: {}, focus() {} };
  const button = { textContent: 'Submit review' };
  const fieldset = { disabled: true };
  const form = {
    data: { name: 'Test client', email: 'client@example.com', service: 'Family', rating: '5', message: 'Lovely session', website: '' },
    querySelector: selector => selector === 'fieldset' ? fieldset : selector === '[type="submit"]' ? button : status,
    reportValidity: () => true,
    addEventListener: (type, fn) => { listeners['form:' + type] = fn; },
    setAttribute() {}, removeAttribute() {}, reset() { reset++; }
  };
  const document = {
    querySelector: () => form,
    createElement(tag) { return { tag, children: [], append(node) { this.children.push(node); }, remove() {} }; },
    body: { append() {} }
  };
  const window = {
    ELEMENTALES_REVIEWS: { endpoint }, crypto: cryptoApi,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: type => { delete listeners[type]; }
  };
  const context = vm.createContext({
    document, window, crypto: window.crypto, location: { origin: 'https://elementales.biz' },
    Date, Object, JSON, String,
    FormData: class { constructor() { return Object.entries(form.data); } },
    HTMLFormElement: { prototype: { submit() {
      sent.push(Object.fromEntries(this.children.map(x => [x.name, x.value])));
    } } },
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id)
  });
  vm.runInContext(source, context);
  return { form, fieldset, status, button, sent, reset: () => reset,
    submit() { listeners['form:submit']?.({ preventDefault() {} }); },
    ack(data, origin = 'https://n-123-script.googleusercontent.com') { listeners.message?.({ data, origin }); },
    timeout() { [...timers.values()].forEach(fn => fn()); }
  };
}
function reply(c, overrides = {}) {
  return { type: 'elementales-review-result', requestId: c.sent.at(-1).requestId, ok: true, code: 'SAVED', ...overrides };
}
test('does not activate an unconfigured endpoint or send to arbitrary hosts', () => {
  for (const endpoint of ['', 'https://attacker.example/exec', 'https://script.google.com/macros/s/test/dev']) {
    const c = client(endpoint);
    assert.equal(c.fieldset.disabled, true);
    c.submit();
    assert.equal(c.sent.length, 0);
    assert.equal(c.status.dataset.state, 'unavailable');
  }
});
test('waits for a matching Google acknowledgement; spoofed messages cannot clear fields', () => {
  const c = client();
  c.submit();
  assert.equal(c.status.dataset.state, 'pending');
  assert.equal(c.reset(), 0);
  assert.equal(c.fieldset.disabled, true);
  c.ack(reply(c), 'https://attacker.example');
  c.ack(reply(c, { requestId: randomUUID() }));
  c.ack(reply(c, { ok: 'true' }));
  assert.equal(c.reset(), 0);
  assert.equal(c.status.dataset.state, 'pending');
  c.ack(reply(c));
  assert.equal(c.reset(), 1);
  assert.equal(c.status.dataset.state, 'success');
  assert.equal(c.fieldset.disabled, false);
});
test('save failure preserves the form and reports an error', () => {
  const c = client();
  c.submit();
  c.ack(reply(c, { ok: false, code: 'SAVE_FAILED' }));
  assert.equal(c.reset(), 0);
  assert.equal(c.form.data.message, 'Lovely session');
  assert.equal(c.status.dataset.state, 'error');
  assert.equal(c.fieldset.disabled, false);
});
test('uncertain timeouts keep the review and reuse the ID only for identical retries', () => {
  const c = client();
  c.submit();
  const id = c.sent[0].requestId;
  c.timeout();
  assert.equal(c.reset(), 0);
  assert.match(c.status.textContent, /could not confirm/);
  c.submit();
  assert.equal(c.sent[1].requestId, id);
  c.ack(reply(c, { ok: false, code: 'VALIDATION' }));
  c.form.data.message = 'Changed feedback';
  c.submit();
  assert.notEqual(c.sent[2].requestId, id);
});
test('double submission is prevented while a save is pending', () => {
  const c = client();
  c.submit(); c.submit();
  assert.equal(c.sent.length, 1);
  assert.equal(c.sent[0].parentOrigin, 'https://elementales.biz');
  assert.equal(c.sent[0].email, 'client@example.com');
  assert.equal(c.sent[0].consent, undefined);
});
test('secure random UUID fallback works when randomUUID is unavailable', () => {
  const c = client(undefined, { getRandomValues: bytes => webcrypto.getRandomValues(bytes) });
  c.submit();
  assert.match(c.sent[0].requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  c.ack(reply(c));
  assert.equal(c.status.dataset.state, 'success');
});
