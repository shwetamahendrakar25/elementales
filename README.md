# Elementales

A buildless HTML, CSS, and JavaScript photography portfolio.

## Preview

From this directory run `python3 -m http.server 8080`, then open http://localhost:8080.
No dependencies or build step are required. Use a local preview for this development branch; do not deploy it publicly until approved.

## Phase 1

- Homepage and dedicated Weddings, Maternity, Family, Films, About, Contact, and Booking Information pages.
- Shared editorial colors, typography, galleries, and footer styles.
- Stock imagery is explicitly temporary. Biography, contact details, packages, policies, and approved assets are pending.
- No inquiry submission, scheduling, or payment processing is enabled.
- Essential content and mobile navigation remain available without JavaScript.
- Background video has an image fallback, pause control, and reduced-motion handling.

## Validation

Run `python3 checks/site_check.py` for local link, fragment, duplicate ID, and shared page checks. Run `node --check script.js` for JavaScript syntax.
Browser layout and assistive-technology checks are still required before launch.

## Next decisions

Confirm photographer biography/portrait, business contact information, service area, approved client work, package names and inclusions, prices, deposits, availability, session lengths, buffers, and cancellation/rescheduling policies. Verify managed booking service behavior in a test environment before selecting it.

## Publishing

Keep `main` unchanged until review and merge approval. Existing GitHub Pages publication uses `main`; this branch adds no deployment workflow. Production hosting and domain are still to be selected.
