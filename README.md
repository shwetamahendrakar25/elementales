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
