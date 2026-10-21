(() => {
  'use strict';
  const form = document.querySelector('[data-review-form]');
  if (!form) return;
  const fields = form.querySelector('fieldset');
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector('[data-review-status]');
  const endpoint = window.ELEMENTALES_REVIEWS?.endpoint || '';
  const allowedEndpoint = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
  const allowedResponseOrigin = /^https:\/\/(?:[a-z0-9-]+[.-])?script\.googleusercontent\.com$/;
  let pending = false;
  let previousPayload = '';
  let requestId = '';
  let startedAt = Date.now();

  function showStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  if (!allowedEndpoint.test(endpoint) || !window.crypto?.randomUUID) {
    showStatus('Online reviews are being connected. You can email Sony using the link below.', 'unavailable');
    return;
  }
  fields.disabled = false;
  showStatus('Your email stays private. Sharing your review publicly is optional.', 'ready');

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(form));
    const fingerprint = JSON.stringify(payload);
    if (fingerprint !== previousPayload) {
      requestId = crypto.randomUUID();
      previousPayload = fingerprint;
    }
    payload.requestId = requestId;
    payload.parentOrigin = location.origin;
    payload.startedAt = String(startedAt);
    pending = true;
    fields.disabled = true;
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Submitting…';
    showStatus('Sending your review. Please keep this page open.', 'pending');

    // A form POST and a server acknowledgement avoid cross-origin fetch hacks.
    // An iframe load alone never counts as a successful save.
    const frame = document.createElement('iframe');
    frame.name = `elementales-review-${requestId}`;
    frame.title = 'Review submission response';
    frame.hidden = true;
    const transport = document.createElement('form');
    transport.hidden = true;
    transport.method = 'POST';
    transport.action = endpoint;
    transport.target = frame.name;
    for (const [name, value] of Object.entries(payload)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      transport.append(input);
    }

    let settled = false;
    let timeout;
    function finish(ok, message) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      window.removeEventListener('message', receive);
      transport.remove();
      frame.remove();
      pending = false;
      fields.disabled = false;
      form.removeAttribute('aria-busy');
      button.textContent = 'Submit review';
      if (ok) {
        form.reset();
        previousPayload = '';
        requestId = '';
        startedAt = Date.now();
        showStatus('Thank you — your review has been received. Sony will read it before considering it for publication.', 'success');
      } else {
        showStatus(message, 'error');
      }
      status.focus();
    }
    function receive(event) {
      // Apps Script returns from an inner Google-hosted sandbox, so its window
      // differs from frame.contentWindow. Check its origin AND the random ID.
      if (!allowedResponseOrigin.test(event.origin)) return;
      const data = event.data;
      if (!data || data.type !== 'elementales-review-result' || data.requestId !== requestId) return;
      if (typeof data.ok !== 'boolean') return;
      finish(data.ok, data.code === 'RATE_LIMIT'
        ? 'Several reviews have been submitted recently. Please wait a few minutes and try again.'
        : data.code === 'VALIDATION'
          ? 'Please check your details and rating, then try again. If this page has been open a long time, refresh it first.'
          : 'We could not save your review. Your details are still here; please try again or email Sony.');
    }
    window.addEventListener('message', receive);
    timeout = setTimeout(() => finish(false,
      'We could not confirm whether your review was saved. Your details are still here. Retrying the same review will not create a duplicate; you can also email Sony.'), 45000);
    document.body.append(frame, transport);
    try {
      HTMLFormElement.prototype.submit.call(transport);
    } catch (_) {
      finish(false, 'Your browser could not send the review. Your details are still here; please try again or email Sony.');
    }
  });
})();
