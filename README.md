# Elementales

A buildless HTML, CSS, and JavaScript photography portfolio for Sony Kurapati.

## Current experience

- Home and dedicated Weddings, Maternity, Family, Dreamy Projects, Films & Reels, About, Hire Me, Feedback, and session-information pages.
- A full-width homepage carousel cycles through five approved photographs every three seconds with a one-second overlapping crossfade. It waits for the next image to decode before changing photographs.
- Only photo-selection dots are visible. Keyboard arrows and touch swipe select photographs. Space pauses/resumes when the carousel region is focused. Keyboard focus, reduced-motion preferences, off-screen content, and hidden tabs suspend automatic rotation as appropriate; hovering does not pause it.
- Preview notices have been removed from every page. Functional email-draft and pending scheduling information remain where relevant.
- Near-ivory, pale sage, and faint blush backgrounds blend gently between sections, with charcoal text.
- Sony’s supplied portrait and first-person introduction appear on Home and About. No qualifications or career history have been inferred.

## Photographs and media

The approved selection contains 72 photographs: 24 wedding, 16 maternity, 12 family, and 20 classical-dance photographs. Publication was approved on October 19, 2026. Gallery images preserve complete frames and accessible descriptions. Responsive WebP assets omit source metadata. Original approved photographs remain in Drive.

The homepage now fills the image stage edge to edge with a responsive cover crop; its height stays within the viewport. Full-photograph links preserve access to the complete frames. Sony’s portrait remains uncropped in three responsive WebP sizes, with the uploaded source unchanged.

Films & Reels contains two films and three portrait reels from Sony’s public @lyckaklickzbysony YouTube channel. YouTube oEmbed confirmed each title, creator, and available embed. Responsive privacy-enhanced players load lazily, do not autoplay, and retain native playback/fullscreen controls. Every player has a direct YouTube link. The earlier silent photo montage remains in the assets as historical media, but has been replaced in the page.

## Enquiries and prices

Enquire/enquiry spelling is used consistently. Category-specific links below the galleries preselect the photography type on Hire Me. The enquiry form appears before pricing and prepares a mailto draft to elementalesbysony@gmail.com. Visitors review and send through their own email app. A direct email link is available; there is no server submission or delivery confirmation.

Detailed service pricing is currently hidden. Hire Me shows only “Pricing starts from $150” with a smaller “for 30 minutes” note. The pricing anchor and links remain available.

Google Calendar consultation booking needs Sony’s public appointment-booking link. Scheduling, shoot reservations, and payment collection are not enabled.

## Validation and preview

Run `python3 checks/site_check.py`, `node --check script.js`, `node --check portfolio.js`, and `git diff --check` for the static checks. Use the managed Sites preview workflow in this environment for browser QA; no dependencies or build are required.

## Publication and remaining details

The public site uses GitHub Pages from `main`. Changes are published through reviewed branch commits and pull-request merges within the user’s authorised scope. A custom domain, service area, package inclusions, deposits, availability, session lengths, buffers, delivery details, and cancellation/rescheduling policies remain to be confirmed.

## Brand and social profiles

The supplied original Elementales logo and Instagram QR artwork are stored unchanged in `assets/brand/`. The header uses a CSS-framed lens emblem beside the wordmark; the footer displays the complete original logo at a larger size to retain its five-element detailing. Every page includes Instagram @wedding.elementales, YouTube @wedding-elementales, and the supplied Instagram QR card with a full-size link. Profile links omit tracking parameters and open in a new tab. No third-party social embed or tracking script is loaded.

## Customer feedback and updated biography

The Feedback page has a pastel custom review form for name, private email, photography type, 1–5 rating, comments, and optional permission to publish. The Google Apps Script integration in `integrations/google-reviews/` validates and stores submissions in Sony’s private Google Sheet with Pending status; it exposes only reviews with Status Approved and publication consent Yes through a filtered public feed. Emails, private notes, IDs and timestamps stay private. The browser waits for an acknowledgement after a successful save and preserves input on failures or uncertain timeouts. Identical retries are deduplicated. The endpoint in `reviews-config.js` is deployed under elementalesbysony@gmail.com. Browser acknowledgement, private spreadsheet storage, unchecked publication consent, Pending status, and identical retry deduplication were verified with synthetic data. A direct email alternative remains available. The Feedback page automatically displays approved and consented reviews, refreshing about every 60 seconds while visible. Withdrawing approval or consent removes a review on refresh. Clearly labeled integration tests are excluded. The Hire Me enquiry form continues to prepare an email draft. No notification email is sent by the review integration.

Sony supplied the updated biography, including seven years in photography, four years in videography, and her interest in drone cinematography. About contains her complete copy; Home uses an excerpt. The header wordmark uses Cinzel and social profile links use accessible Instagram and YouTube SVG icons.

## Balanced previews and persistent navigation

Each homepage filter now has four approved photographs. An extra bride portrait (140), maternity portrait (193), child portrait (057), and stage performance (107) are reused from the existing curated galleries. Portrait and landscape pairs are arranged in two columns whose widths account for native aspect ratios, aligning their lower edges without cropping photographs. Single-column phone layouts preserve complete frames. Dedicated galleries and their 72 unique photographs are unchanged.

The header is sticky on all ten pages. Anchor offsets account for its height, and the About portrait remains below it when sticky. The mobile navigation retains keyboard focus handling and Escape support.
