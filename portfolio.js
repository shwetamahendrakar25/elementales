(() => {
  'use strict';
  const links = [...document.querySelectorAll('[data-gallery-item]')];
  if (!links.length || typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;

  const viewer = document.createElement('dialog');
  viewer.className = 'image-viewer';
  viewer.setAttribute('aria-labelledby', 'viewer-title');
  viewer.setAttribute('aria-describedby', 'viewer-disclosure');
  viewer.innerHTML = `<div class="viewer-header"><h2 id="viewer-title">Photography preview</h2><button type="button" class="viewer-close" autofocus aria-label="Close image viewer">Close ×</button></div><p id="viewer-disclosure">Elementales photography · Selected work.</p><figure class="viewer-figure"><img class="viewer-image" alt=""><figcaption id="viewer-caption"></figcaption></figure><p class="viewer-loading" role="status"></p><div class="viewer-controls"><button type="button" data-viewer-prev aria-label="Previous photograph">← Previous</button><p class="viewer-position" role="status" aria-live="polite" aria-atomic="true"></p><button type="button" data-viewer-next aria-label="Next photograph">Next →</button></div>`;
  document.body.append(viewer);
  const image = viewer.querySelector('.viewer-image');
  const caption = viewer.querySelector('figcaption');
  const position = viewer.querySelector('.viewer-position');
  const loading = viewer.querySelector('.viewer-loading');
  const previous = viewer.querySelector('[data-viewer-prev]');
  const next = viewer.querySelector('[data-viewer-next]');
  let collection = [], current = 0, opener = null;

  function show(index) {
    current = (index + collection.length) % collection.length;
    const link = collection[current];
    loading.textContent = 'Loading photograph…';
    image.alt = link.querySelector('img').alt;
    caption.textContent = link.dataset.caption;
    position.textContent = `Photograph ${current + 1} of ${collection.length}`;
    previous.disabled = next.disabled = collection.length < 2;
    image.src = link.href;
  }
  image.addEventListener('load', () => { loading.textContent = ''; });
  image.addEventListener('error', () => { loading.textContent = 'This photograph could not load. Try the next image or close the viewer.'; });
  links.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    collection = links.filter(item => !item.closest('[hidden]'));
    opener = link;
    show(collection.indexOf(link));
    viewer.showModal();
    document.body.classList.add('viewer-open');
  }));
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
  });
  // Native modal dialog handles Escape and keeps the rest of the page inert.
  viewer.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus({ preventScroll: true });
  });
})();
