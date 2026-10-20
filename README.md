# Elementales

A buildless HTML, CSS, and JavaScript photography portfolio.

## Preview

From this directory run `python3 -m http.server 8080`, then open http://localhost:8080.
No dependencies or build step are required. Use a local preview for this development branch; do not deploy it publicly until approved.

## Phase 1

- Homepage and dedicated Weddings, Maternity, Family, Dreamy Projects, Films, About, Contact, and Booking Information pages.
- Shared editorial colors, typography, galleries, and footer styles.
- This checkout contains the approved 72-photo selection from the supplied Drive collection: 24 wedding, 16 maternity, 12 family, and 20 dance photographs.
- Responsive WebP files retain complete frames, convert embedded color profiles to sRGB, and omit source EXIF metadata. Original files remain in Drive.
- The user approved the photograph selection and publication on October 19, 2026.
- Biography, contact details, packages, and policies are pending.
- No inquiry submission, scheduling, or payment processing is enabled.
- Essential content and mobile navigation remain available without JavaScript.
- The homepage opens with approved floral wedding décor and leads directly into the portfolio. Mobile shows the complete décor frame before the heading.
- Collection pages pair compact headings with prominent photographs; on mobile, photographs come before descriptions and links.
- The shared palette uses ivory, soft sage, dusty blush, and charcoal.
- Home and Films include a silent 15-second photo preview with native controls, a direct MP4 fallback, and no automatic video download. It uses approved still images, not filmed footage.

## Validation

Run `python3 checks/site_check.py` for local links, image assets, fragments, duplicate IDs, and shared page checks. Run `node --check script.js` and `node --check portfolio.js` for JavaScript syntax.
Browser layout and assistive-technology checks are still required before launch.

## Next decisions

Confirm photographer biography/portrait, business contact information, service area, approved client work, package names and inclusions, prices, deposits, availability, session lengths, buffers, and cancellation/rescheduling policies. Verify managed booking service behavior in a test environment before selecting it.

## Publishing

Keep `main` unchanged until review and merge approval. Existing GitHub Pages publication uses `main`; this branch adds no deployment workflow. Production hosting and domain are still to be selected.

## Homepage slideshow and enquiry flow

The homepage cycles through five approved photographs every three seconds. It provides pause/resume, direct slide selection, previous/next, and full-image links. Manual navigation pauses rotation; off-screen content and hidden tabs suspend it. Reduced-motion visitors start paused. The previous photo montage remains on Films & Reels only.

The existing contact URL now presents Hire Me, with the wedding enquiry process moved there and category-specific links directly below all four galleries. The enquiry fields are enabled and prepare a mailto draft to the supplied business email, Lyckaclicksbysony@gmail.com. Visitors review and send from their own email app; there is no server submission or delivery confirmation. A direct email link is also available. Google Calendar scheduling still requires Sony’s appointment-booking URL.

## Full-width pastel revision

The slideshow spans the viewport, with a cropped cover presentation on desktop and complete 3:2 frames on smaller screens. Full-photograph links remain available. Hero copy, controls, film section, and footer use ivory, sage, and blush with charcoal text. Sony Kurapati’s supplied name and contact address are shown without adding an unapproved biography. The mailbox has not been tested by sending a message.

## Three-second slideshow and starting prices

The slideshow advances every 3 seconds and no longer pauses when hovered. Explicit pause/play, keyboard focus, manual photo selection, reduced-motion preferences, off-screen state, and hidden tabs continue to control rotation. The pastel controls are inside the image. Numbered labels beneath portfolio photos are removed while image alt descriptions and viewer captions remain.

Owner-supplied starting rates: wedding photography $300/hour; basic family sessions $380/hour; family portraits $380/hour; professional headshots $380/hour. All starting prices appear only on Hire Me. Home and session information link to that central pricing section. Each is a starting guide, with final quotes tailored to each customer. No maternity or dance rate is inferred. Family portraits and professional headshots are available as enquiry selections.

## Gallery copy cleanup

Collection pages omit the redundant Explore N photographs links and photo-count toolbars. Image-viewer counts and accessible descriptions remain. Numeric prices and the tailored-pricing explanation appear in a single location on Hire Me. Home and session information link there; gallery pages lead to the shared enquiry flow. Pastel colours and the three-second slideshow remain intact.
