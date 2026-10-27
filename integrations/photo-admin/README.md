# Elementales private photo studio

This is a **separate Apps Script project** from the public reviews intake. Never paste this code into the reviews project or broaden that project's permissions.

## Deployment

1. While signed in as `elementalesbysony@gmail.com`, create a standalone Apps Script project named **Elementales — Private Photo Studio**.
2. Add `Code.gs`, `Render.gs`, and `Admin.html` from this directory. Enable the manifest in project settings, and replace `appsscript.json` with this directory's manifest.
3. Deploy as a web app: **Execute as: Me (elementalesbysony@gmail.com)**, **Who has access: Only myself**. Verify the owner account before authorizing Drive, external requests, and identity access. Do not select Anyone. Each server operation independently requires the Elementales account.
4. Open the deployment URL. Create folders, then copy the current selection. Setup reads `gallery-manifest.json` at an immutable Git commit, downloads the existing optimized website photos, and creates **copies**, not moves, in six new private Drive folders. Originals in the old selected-photos folder are untouched. Setup resumes after interruption without duplicating completed copies.
5. As GitHub repository owner, create a fine-grained token restricted to **shwetamahendrakar25/elementales** with **Contents: read/write**, **Actions: read**. Choose an expiry. Enter it directly into the private dashboard's publishing connection. Never paste it into chat, tracked files, screenshots, or website JavaScript. The script stores it in Script Properties; only trusted project editors should have project access. The ChatGPT GitHub connector is not a credential the deployed dashboard can reuse.
6. Verify another Google account/signed-out session cannot open the admin application. Test a private sync, preview, and original-selection restore before using Publish for an actual selection change.

The manifest must exist on main before folder setup. Managed-region comments in six HTML pages are inert: installing these files does not alter the current photo selection or styles. No public admin link or public Drive sharing is required.

## Sony's workflow

- Open the appropriate Drive folder. Supported: JPG/PNG/WebP up to 25 MB; direct children only. Keep five slideshow photos, one About portrait, and 1–100 photos in each gallery. All galleries must remain accessible and nonempty. Number filenames `001`, `002`, etc. to set folder order; dashboard ordering can override this per publication.
- Select **Sync & Preview**. Added/changed source images are copied into a private snapshot and resized to WebP (up to 480/960/1600/2048 px) by the browser. Unchanged current photos reuse existing optimized variants. Keep the tab open during preparation.
- Review additions/removals and ordering. Set accessible descriptions and framing, then save. Descriptions remain hidden on the website; no visible captions are added. Header photos use the first category photo. Existing homepage featured choices are retained when available, with missing choices filled from the first photos in that category.
- Open each relevant website preview; toggle desktop/mobile. Preview images stay private until publication. Gallery viewer watermark opacity stays **55%**, with the same responsive font size as the slideshow. The smaller portrait watermark stays as it is. Slideshow remains five photos, 3-second timing, smooth transitions, full width, no manual controls.
- Confirm the selection and **Publish**. Images upload first, then a single Git commit updates the six photo pages and manifest. GitHub Pages deploys that commit. Deployment progress is reported separately; a submitted commit is not reported as a successful live deployment.
- **Version history → Preview restore** creates a draft from a saved selection. Preview, confirm and Publish to restore. Drive folders remain as they are. The next sync explicitly reads their current contents again.

## Storage and rollback

All published photos use retained, immutable paths. No published photo bytes are deleted by sync or restore. Version records store the manifest, order, descriptions, positions and fixed watermark settings, with a Git commit reference. Git retains actual published image bytes; rollback works after a Drive source is removed. Existing website code/text updates are preserved because a restore renders the old photo manifest into current page templates; it is not a whole-site code revert.

There is **no automatic deletion or retention limit in v1**. Private source snapshots, previews and version records use Sony's Drive storage; published variants use repository storage. Review storage growth before extending this to a large client-delivery library. This is a curated portfolio tool, not a full-resolution client gallery.

No automatic folder watcher publishes changes. Source access failures never become mass removals. Source changes during preparation require a fresh sync; changes after a snapshot cannot silently alter the reviewed version. A changed main branch invalidates the preview before publication. Incomplete publishing can be resumed/cancelled; cancellation cannot undo a commit already submitted to main, for which a version restore is the appropriate action.

## Local validation

`node --test tests/photo-admin.test.cjs`

`python checks/site_check.py`

A dashboard browser preview without Apps Script is only visual QA; it has no Google access or working publishing controls. Verify deployed owner-only access and a real Drive sync separately.
