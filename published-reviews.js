(() => {
  'use strict';
  const section = document.querySelector('[data-published-reviews]');
  if (!section) return;
  const grid = section.querySelector('[data-testimonial-grid]');
  const endpoint = window.ELEMENTALES_REVIEWS?.endpoint || '';
  const responseOrigin = /^https:\/\/(?:[a-z0-9-]+[.-])?script\.googleusercontent\.com$/;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint) ||
      !window.crypto?.getRandomValues) return;
  let pending = false;
  let fingerprint = '';

  function requestId() {
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  function clear() {
    grid.replaceChildren();
    section.hidden = true;
    fingerprint = '';
  }
  function valid(review) {
    return review && typeof review.name === 'string' && review.name.length > 0 && review.name.length <= 120 &&
      typeof review.message === 'string' && review.message.length > 0 && review.message.length <= 3000 &&
      typeof review.service === 'string' && review.service.length <= 80 &&
      Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 &&
      Object.keys(review).every(key => ['name', 'service', 'rating', 'message'].includes(key));
  }
  function render(reviews) {
    if (!reviews.length) { clear(); return; }
    const next = JSON.stringify(reviews);
    if (next === fingerprint) return;
    const cards = reviews.map(review => {
      const card = document.createElement('article');
      card.className = 'testimonial-card';
      const rating = document.createElement('p');
      rating.className = 'testimonial-rating';
      rating.setAttribute('aria-label', `${review.rating} out of 5 stars`);
      const stars = document.createElement('span');
      stars.setAttribute('aria-hidden', 'true');
      stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      rating.append(stars);
      const quote = document.createElement('blockquote');
      const message = document.createElement('p');
      // Customer text is always text, never HTML.
      message.textContent = review.message;
      quote.append(message);
      const name = document.createElement('h3');
      name.textContent = review.name;
      const service = document.createElement('p');
      service.className = 'testimonial-service';
      service.textContent = review.service;
      card.append(rating, quote, name, service);
      return card;
    });
    grid.replaceChildren(...cards);
    fingerprint = next;
    section.hidden = false;
  }
  function refresh() {
    if (document.hidden || pending) return;
    pending = true;
    const id = requestId();
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'Approved customer reviews';
    const url = new URL(endpoint);
    url.searchParams.set('action', 'published-reviews');
    url.searchParams.set('parentOrigin', location.origin);
    url.searchParams.set('requestId', id);
    let timeout;
    let settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      window.removeEventListener('message', receive);
      frame.remove();
      pending = false;
    }
    function receive(event) {
      if (!responseOrigin.test(event.origin) || event.data?.type !== 'elementales-published-reviews' ||
          event.data.requestId !== id) return;
      const data = event.data;
      if (data.ok === true && Array.isArray(data.reviews) && data.reviews.every(valid)) render(data.reviews);
      else clear();
      finish();
    }
    window.addEventListener('message', receive);
    timeout = setTimeout(() => { clear(); finish(); }, 45000);
    frame.src = url.href;
    document.body.append(frame);
  }
  document.addEventListener('visibilitychange', refresh);
  setInterval(refresh, 60000);
  refresh();
})();
