# Private customer reviews in Google Sheets

Status: source is ready for deployment. `reviews-config.js` deliberately has no
endpoint until the service is deployed under `elementalesbysony@gmail.com` and
a real browser submission is confirmed in the private spreadsheet. Do not merge
the website change with an empty endpoint.

## Owner setup

1. Sign in to Google as **elementalesbysony@gmail.com**. Create/import the private
   review spreadsheet under that account. Leave sharing **Restricted**; do not
   publish the spreadsheet or give website visitors edit access.
2. In that spreadsheet, open **Extensions → Apps Script**. Copy `Code.gs` into
   the bound project. In Project Settings enable the manifest view and copy
   `appsscript.json`. The only requested OAuth scope is Google Sheets; no Gmail,
   Contacts, Drive-wide, or Calendar scope is needed.
3. Save the project as **Elementales — Private Review Intake**. Select and run
   `setupReviews_` from the editor. The owner must authorize spreadsheet access.
   Setup records the spreadsheet ID in private Script Properties. It never
   changes file sharing. Do not put that ID or OAuth tokens in website code.
4. Deploy a **Web app**, execute as **Me (elementalesbysony@gmail.com)**, access
   **Anyone** (including visitors who are not signed in). The deployment exposes
   submission handling, not the spreadsheet. Copy the deployment's `/exec` URL.
5. Set `endpoint` in `reviews-config.js` to that exact URL. Keep the website
   form, its script, and the deployment's allowed parent origins in sync. Current
   origins are the main domain, its www variant, and the existing GitHub Pages
   host. This list only validates where acknowledgements can be sent; it is not
   authentication or a substitute for spam protection.
6. Before publication, use a clearly labeled test review, verify the saved row
   and on-page acknowledgement, and try one repeat submission with the same ID.
   Verify private feedback with consent unchecked is also saved. Do not invent
   or publish customer testimonials.
7. Only after verification, merge the website change and confirm GitHub Pages
   deployment. Changing Apps Script code later requires an updated deployment
   version; the deployment URL can remain the same.

## Stored data and approval

The `Reviews` tab stores Submission ID, UTC timestamp, name, private email,
photography type, 1–5 rating, review, publication consent, Pending status, and
private notes. Setup preserves existing rows and rejects unexpected headers.

Every new submission starts **Pending**, including submissions with permission
to publish. The backend has no public read/review-list endpoint. Nothing is
automatically published, and changing a status cell does not update the static
website. Approved reviews can be selected for a separate publication change;
emails and private notes must never be included. The website displays no fake
sample reviews. This change does not modify the Hire Me enquiry form.

## Submission protocol

The custom form sends a normal POST into a temporary hidden iframe. Apps Script
validates fields, locks the write, checks the request ID, writes and flushes a
row, then sends an acknowledgement to the exact allowed website origin. The
client accepts only a Google Apps Script response origin and the unpredictable
ID for its current request. An iframe load or elapsed timeout is not treated as
success. Failed or uncertain requests preserve the customer's input. Identical
retries use the same ID and are deduplicated.

Server checks include length/type/enum validation, duplicated-parameter checks,
a honeypot, minimum completion time, formula-injection escaping, and best-effort
rate limits (three submissions per email during an active ten-minute cache
window; twenty per minute overall). Google cache eviction can relax limits;
these measures reduce basic spam but do not prove a visitor is a customer.
Customer input is never echoed as HTML or returned through GET. Consent is
optional and defaults to No. Do not use a `no-cors` fetch that assumes success.

The service uses Google Apps Script quotas. Owner account authorization,
deployment permissions, quota availability, and the exact live iframe response
must be verified during activation. No notification emails are sent by this
version, and its scope does not permit reading or sending Gmail.

## Checks

```sh
node --test tests/reviews-server.test.cjs tests/reviews-client.test.cjs
node --check reviews.js
node --check reviews-config.js
node --check script.js
node --check portfolio.js
python checks/site_check.py
git diff --check
```

Unit tests use isolated in-memory Google service stubs, not the live owner
account. They do not substitute for the final anonymous browser POST and
spreadsheet readback after deployment.
