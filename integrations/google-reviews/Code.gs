/** Elementales review intake. The spreadsheet remains private to its owner.
 * Bind this project to Sony's private review spreadsheet, run setupReviews_
 * from the editor, then deploy as Sony with access set to Anyone.
 * Only explicitly approved, consented testimonial fields are public.
 * Emails, private notes and spreadsheet identifiers are never returned.
 */
const REVIEW_HEADERS_ = [
  'Submission ID', 'Submitted at (UTC)', 'Name', 'Email (private)',
  'Photography type', 'Rating', 'Review', 'Permission to publish',
  'Status', 'Private notes'
];
const REVIEW_SERVICES_ = [
  'Weddings', 'Maternity', 'Family', 'Family portraits',
  'Professional headshots', 'Dreamy Projects', 'Films & Reels', 'Other'
];
const REVIEW_ORIGINS_ = [
  'https://elementales.biz', 'https://www.elementales.biz',
  'https://shwetamahendrakar25.github.io'
];

// Editor-only initialization: underscore functions are not available through
// google.script.run. It never creates a public file or changes sharing.
function setupReviews_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open this script from the private review spreadsheet.');
  const properties = PropertiesService.getScriptProperties();
  const configured = properties.getProperty('REVIEW_SPREADSHEET_ID');
  if (configured && configured !== spreadsheet.getId()) {
    throw new Error('This project already points to another spreadsheet.');
  }
  let sheet = spreadsheet.getSheetByName('Reviews');
  if (!sheet) sheet = spreadsheet.insertSheet('Reviews');
  if (!sheet.getLastRow()) sheet.getRange(1, 1, 1, REVIEW_HEADERS_.length).setValues([REVIEW_HEADERS_]);
  assertHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, REVIEW_HEADERS_.length)
    .setBackground('#DDE4D9').setFontColor('#2B2926').setFontWeight('bold');
  sheet.setColumnWidths(1, REVIEW_HEADERS_.length, 170);
  sheet.setColumnWidth(7, 420);
  sheet.setColumnWidth(10, 300);
  sheet.getRange(1, 1, sheet.getMaxRows(), REVIEW_HEADERS_.length).setWrap(true);
  properties.setProperty('REVIEW_SPREADSHEET_ID', spreadsheet.getId());
  return 'Review intake is configured. Keep the spreadsheet Restricted.';
}

// Generic GET reveals nothing; the public feed contains only consented reviews.
function doGet(event) {
  const data = event && event.parameter || {};
  if (data.action === 'published-reviews') return publishedReviewsReply_(event);
  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="en"><meta charset="utf-8"><title>Elementales reviews</title>' +
    '<p>Elementales review submission service. Please submit a review from the Elementales website.</p></html>'
  );
}

function publishedReviewsReply_(event) {
  const data = event.parameter || {};
  const origin = REVIEW_ORIGINS_.indexOf(data.parentOrigin) !== -1 ? data.parentOrigin : '';
  const requestId = validRequestId_(data.requestId) ? data.requestId : '';
  const result = { type: 'elementales-published-reviews', requestId: requestId, ok: false, reviews: [] };
  try {
    const repeated = Object.keys(event.parameters || {}).some(function (key) {
      return event.parameters[key].length !== 1;
    });
    if (!origin || !requestId || repeated) throw reviewError_('VALIDATION');
    const id = PropertiesService.getScriptProperties().getProperty('REVIEW_SPREADSHEET_ID');
    if (!id) throw reviewError_('CONFIGURATION');
    const sheet = SpreadsheetApp.openById(id).getSheetByName('Reviews');
    if (!sheet) throw reviewError_('CONFIGURATION');
    assertHeaders_(sheet);
    const last = sheet.getLastRow();
    const rows = last > 1 ? sheet.getRange(2, 1, last - 1, REVIEW_HEADERS_.length).getValues() : [];
    // Read moderation on every request: withdrawing approval/consent removes it.
    result.reviews = rows.filter(function (row) {
      const name = String(row[2]).trim();
      const message = String(row[6]).trim();
      return String(row[7]).trim().toLowerCase() === 'yes' &&
        String(row[8]).trim().toLowerCase() === 'approved' &&
        !/integration[\s_-]*test|synthetic[\s_-]*test/i.test(name + ' ' + message) &&
        name && name.length <= 120 && message && message.length <= 3000 &&
        REVIEW_SERVICES_.indexOf(String(row[4])) !== -1 && /^[1-5]$/.test(String(row[5]));
    }).reverse().map(function (row) {
      // Explicit allowlist. Never serialize complete rows or add private fields.
      return { name: String(row[2]).trim(), service: String(row[4]),
        rating: Number(row[5]), message: String(row[6]).trim() };
    });
    result.ok = true;
  } catch (_) {
    result.reviews = [];
  }
  const serialized = JSON.stringify(result).replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const reply = origin && requestId ? '<script>window.top.postMessage(' + serialized + ',' + JSON.stringify(origin) + ');</script>' : '';
  return HtmlService.createHtmlOutput('<!doctype html><html lang="en"><meta charset="utf-8"><title>Elementales testimonials</title>' + reply + '</html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(event) {
  const parameters = event && event.parameter || {};
  const origin = REVIEW_ORIGINS_.indexOf(parameters.parentOrigin) !== -1 ? parameters.parentOrigin : '';
  const requestId = validRequestId_(parameters.requestId) ? parameters.requestId : '';
  let result = { type: 'elementales-review-result', requestId: requestId, ok: false, code: 'VALIDATION' };
  try {
    if (!origin || !event.postData || event.postData.length > 60000) throw reviewError_('VALIDATION');
    // Reject ambiguous duplicated fields rather than silently taking one value.
    const repeated = Object.keys(event.parameters || {}).some(function (key) {
      return event.parameters[key].length !== 1;
    });
    if (repeated) throw reviewError_('VALIDATION');
    const review = validateReview_(parameters, Date.now());
    saveReview_(review);
    result.ok = true;
    result.code = 'SAVED';
  } catch (error) {
    // No submitted names, email addresses or review text appear in responses/logs.
    result.code = error.reviewCode || 'SAVE_FAILED';
  }
  return reviewReply_(result, origin);
}

function validRequestId_(value) {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}

function reviewError_(code) {
  const error = new Error(code);
  error.reviewCode = code;
  return error;
}

function validateReview_(data, now) {
  function text(key, limit) {
    const value = typeof data[key] === 'string' ? data[key].trim() : '';
    if (!value || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
      throw reviewError_('VALIDATION');
    }
    return value;
  }
  if (!validRequestId_(data.requestId) || String(data.website || '').trim()) throw reviewError_('VALIDATION');
  const started = Number(data.startedAt);
  if (!Number.isFinite(started) || now - started < 2000 || now - started > 86400000) throw reviewError_('VALIDATION');
  const name = text('name', 120);
  const email = text('email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(name)) throw reviewError_('VALIDATION');
  const service = text('service', 80);
  const message = text('message', 3000);
  if (REVIEW_SERVICES_.indexOf(service) === -1 || !/^[1-5]$/.test(String(data.rating))) throw reviewError_('VALIDATION');
  if (data.consent && data.consent !== 'yes') throw reviewError_('VALIDATION');
  return { requestId: data.requestId, name: name, email: email, service: service,
    rating: Number(data.rating), message: message, consent: data.consent === 'yes' };
}

function sheetText_(value) {
  // Treat customer input as text even when it begins like a sheet formula.
  const text = String(value);
  return /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
}

function assertHeaders_(sheet) {
  const actual = sheet.getRange(1, 1, 1, REVIEW_HEADERS_.length).getValues()[0];
  if (actual.join('\u001f') !== REVIEW_HEADERS_.join('\u001f')) throw reviewError_('CONFIGURATION');
}

function saveReview_(review) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw reviewError_('SAVE_FAILED');
  try {
    const id = PropertiesService.getScriptProperties().getProperty('REVIEW_SPREADSHEET_ID');
    if (!id) throw reviewError_('CONFIGURATION');
    const sheet = SpreadsheetApp.openById(id).getSheetByName('Reviews');
    if (!sheet) throw reviewError_('CONFIGURATION');
    assertHeaders_(sheet);
    const last = sheet.getLastRow();
    // The ID remains stable when the browser retries after an uncertain timeout.
    if (last > 1) {
      const duplicate = sheet.getRange(2, 1, last - 1, 1).createTextFinder(review.requestId)
        .matchEntireCell(true).findNext();
      if (duplicate) {
        const row = sheet.getRange(duplicate.getRow(), 1, 1, REVIEW_HEADERS_.length).getValues()[0];
        const expected = [sheetText_(review.name), sheetText_(review.email), review.service,
          review.rating, sheetText_(review.message), review.consent ? 'Yes' : 'No'];
        const same = expected.every(function (value, index) {
          const cell = String(row[index + 2]);
          return cell === String(value) || (typeof value === 'string' && value.charAt(0) === "'" && cell === value.slice(1));
        });
        if (!same) {
          throw reviewError_('VALIDATION');
        }
        return;
      }
    }
    const cache = CacheService.getScriptCache();
    const emailHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, review.email)
      .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
    const emailKey = 'review-email-' + emailHash;
    const minuteKey = 'review-minute-' + Math.floor(Date.now() / 60000);
    const byEmail = Number(cache.get(emailKey) || 0);
    const byMinute = Number(cache.get(minuteKey) || 0);
    if (byEmail >= 3 || byMinute >= 20) throw reviewError_('RATE_LIMIT');
    const row = [review.requestId, new Date().toISOString(), sheetText_(review.name),
      sheetText_(review.email), review.service, review.rating, sheetText_(review.message),
      review.consent ? 'Yes' : 'No', 'Pending', ''];
    const next = last + 1;
    if (next > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    sheet.getRange(next, 1, 1, REVIEW_HEADERS_.length).setNumberFormat('@').setValues([row]);
    SpreadsheetApp.flush();
    // Rate counters are written only after the review has been saved.
    cache.put(emailKey, String(byEmail + 1), 600);
    cache.put(minuteKey, String(byMinute + 1), 120);
  } finally {
    lock.releaseLock();
  }
}

function reviewReply_(result, origin) {
  const serialized = JSON.stringify(result).replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const acknowledgement = origin
    ? '<script>window.top.postMessage(' + serialized + ',' + JSON.stringify(origin) + ');</script>' : '';
  const message = result.ok ? 'Thank you. Your review has been received.' : 'The review could not be saved. Please return to the form and try again.';
  return HtmlService.createHtmlOutput('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Elementales review</title>' +
    '</head><body><p>' + message + '</p>' + acknowledgement + '</body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
