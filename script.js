(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const mobile = matchMedia('(max-width: 1180px)');
  let restoreFocus = null;
  const isOpen = () => toggle?.getAttribute('aria-expanded') === 'true';
  function setMenu(open, returnFocus = false) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? 'Close navigation' : 'Open navigation';
    nav.classList.toggle('open', open);
    header.classList.toggle('menu-active', open);
    document.body.classList.toggle('nav-open', open);
    if (open) { restoreFocus = document.activeElement; nav.querySelector('a')?.focus(); }
    else if (returnFocus) (restoreFocus || toggle).focus();
  }
  if (toggle && nav) {
    document.documentElement.classList.add('nav-enhanced');
    toggle.addEventListener('click', () => setMenu(!isOpen(), isOpen()));
    nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', event => {
      if (!isOpen()) return;
      if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
      if (event.key === 'Tab') {
        // Match DOM order: the menu button precedes navigation links.
        const elements = [toggle, ...nav.querySelectorAll('a[href]')];
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    mobile.addEventListener('change', () => setMenu(false));
  }

  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.work-card, .gallery-empty')];
  function filterBy(button) {
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    cards.forEach(card => { card.hidden = card.dataset.category !== button.dataset.filter; });
    document.querySelectorAll('[data-preview-category]').forEach(pair => { pair.hidden = pair.dataset.previewCategory !== button.dataset.filter; });
    document.querySelectorAll('[data-gallery]').forEach(gallery => {
      gallery.hidden = ![...gallery.querySelectorAll('.work-card')].some(card => !card.hidden);
    });
    document.querySelectorAll('.gallery-next').forEach(el => { el.hidden = el.dataset.category ? el.dataset.category !== button.dataset.filter : button.dataset.filter !== 'stories'; });
    const status = document.querySelector('[data-filter-status]');
    if (status) status.textContent = `Showing ${button.textContent.trim()}`;
  }
  filters.forEach(button => button.addEventListener('click', () => filterBy(button)));
  if (filters.length) {
    document.querySelector('.portfolio-tabs').hidden = false;
    filterBy(filters[0]);
  }

  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    carousel.classList.add('carousel-enhanced');
    const track = carousel.querySelector('.carousel-track');
    const slides = [...track.children];
    const dots = carousel.querySelector('.carousel-dots');
    let current = 0;
    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-roledescription', 'carousel');
    carousel.setAttribute('aria-label', carousel.dataset.label);
    const dotButtons = slides.map((slide, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Show item ${index + 1} of ${slides.length}`);
      button.addEventListener('click', () => go(index));
      dots.append(button);
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-label', `${index + 1} of ${slides.length}`);
      return button;
    });
    function go(index) {
      current = (index + slides.length) % slides.length;
      const distance = slides[current].getBoundingClientRect().left - slides[0].getBoundingClientRect().left;
      track.style.transform = `translateX(-${distance}px)`;
      dotButtons.forEach((button, i) => {
        button.classList.toggle('active', i === current);
        button.setAttribute('aria-pressed', String(i === current));
      });
      slides.forEach((slide, i) => { slide.inert = i !== current; slide.setAttribute('aria-hidden', String(i !== current)); });
    }
    carousel.querySelector('[data-prev]').addEventListener('click', () => go(current - 1));
    carousel.querySelector('[data-next]').addEventListener('click', () => go(current + 1));
    addEventListener('resize', () => go(current), { passive: true });
    go(0);
  });

  document.querySelectorAll('.faq-item button').forEach(button => {
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    answer.hidden = true;
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      answer.hidden = open;
    });
  });

  const video = document.querySelector('[data-hero-video]');
  const videoToggle = document.querySelector('.video-toggle');
  if (video && videoToggle) {
    let userPaused = false;
    let onScreen = true;
    function syncVideo() {
      if (motion.matches || userPaused || !onScreen || document.hidden) video.pause();
      else video.play().catch(() => { videoToggle.hidden = true; });
    }
    function updateLabel() { videoToggle.textContent = video.paused ? 'Play background video' : 'Pause background video'; }
    video.addEventListener('playing', () => { videoToggle.hidden = motion.matches; updateLabel(); });
    video.addEventListener('pause', updateLabel);
    video.addEventListener('error', () => { videoToggle.hidden = true; });
    videoToggle.addEventListener('click', () => { userPaused = !userPaused; syncVideo(); });
    motion.addEventListener('change', () => { videoToggle.hidden = motion.matches; syncVideo(); });
    document.addEventListener('visibilitychange', syncVideo);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting; syncVideo();
    }, { threshold: 0.15 }).observe(video);
    syncVideo();
  }
  const preview = document.querySelector('[data-photo-preview]');
  const previewVideo = preview?.querySelector('[data-preview-video]');
  if (previewVideo && typeof preview.showModal === 'function') {
    const source = previewVideo.querySelector('source');
    const message = preview.querySelector('[data-preview-message]');
    let opener = null;
    document.querySelectorAll('[data-preview-open]').forEach(link => {
      link.setAttribute('aria-controls', preview.id);
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); opener = link;
        if (!source.getAttribute('src')) {
          previewVideo.poster = previewVideo.dataset.poster;
          source.src = source.dataset.src; previewVideo.load();
        }
        preview.showModal(); document.body.classList.add('preview-open');
        message.textContent = 'Loading photo preview…';
        previewVideo.play().catch(() => { message.textContent = 'Press Play in the player to start the photo preview.'; });
      });
    });
    preview.querySelector('[data-preview-close]').addEventListener('click', () => preview.close());
    preview.addEventListener('click', event => { if (event.target === preview) preview.close(); });
    preview.addEventListener('close', () => {
      previewVideo.pause(); if (previewVideo.readyState) previewVideo.currentTime = 0;
      document.body.classList.remove('preview-open'); if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
    previewVideo.addEventListener('playing', () => { message.textContent = ''; });
    previewVideo.addEventListener('waiting', () => { message.textContent = 'Loading photo preview…'; });
    previewVideo.addEventListener('error', () => { message.textContent = 'The preview could not play. Use the direct preview link below.'; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) previewVideo.pause(); });
  }
  const slideshow = document.querySelector('[data-hero-slideshow]');
  if (slideshow) {
    const slides = [...slideshow.querySelectorAll('[data-hero-slide]')];
    const dots = [...slideshow.querySelectorAll('[data-hero-dot]')];
    const status = slideshow.querySelector('[data-slide-status]');
    const full = slideshow.querySelector('[data-slide-full]');
    let current = 0, timer = null, request = 0;
    let paused = motion.matches, focusPaused = false, touching = false, onScreen = true;
    let touchStart = null;
    slideshow.classList.add('is-enhanced');
    slides.forEach((slide, i) => {
      slide.hidden = false;
      slide.classList.toggle('is-active', i === 0);
      slide.setAttribute('aria-hidden', String(i !== 0));
    });
    function schedule() {
      clearTimeout(timer);
      if (paused || focusPaused || touching || !onScreen || document.hidden) return;
      slides[(current + 1) % slides.length].querySelector('img').loading = 'eager';
      timer = setTimeout(() => { show(current + 1); }, 3000);
    }
    async function show(index, announce = false) {
      clearTimeout(timer);
      const target = (index + slides.length) % slides.length;
      const token = ++request;
      const photo = slides[target].querySelector('img');
      photo.loading = 'eager';
      // Keep the current photograph visible until its successor is decoded.
      try { await photo.decode(); } catch (_) { /* Retain the current image on a loading failure. */ }
      if (token !== request) return;
      if (!photo.naturalWidth) { schedule(); return; }
      current = target;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
        slide.setAttribute('aria-hidden', String(i !== current));
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
      const slide = slides[current];
      const caption = `${slide.dataset.label} · ${current + 1} / ${slides.length}`;
      slideshow.querySelector('[data-slide-caption]').textContent = caption;
      full.href = slide.dataset.full;
      full.setAttribute('aria-label', `View full ${slide.dataset.label} photograph in a new tab`);
      if (announce) status.textContent = caption;
      schedule();
    }
    slideshow.querySelector('[data-slide-controls]').hidden = false;
    dots.forEach((dot, index) => dot.addEventListener('click', () => { show(index, true); }));
    slideshow.addEventListener('focusin', event => {
      focusPaused = event.target.matches(':focus-visible'); schedule();
    });
    slideshow.addEventListener('focusout', event => {
      if (!slideshow.contains(event.relatedTarget)) { focusPaused = false; schedule(); }
    });
    slideshow.addEventListener('keydown', event => {
      if (event.key === ' ' && event.target === slideshow) {
        event.preventDefault(); paused = !(paused || focusPaused); focusPaused = false;
        status.textContent = paused ? 'Carousel paused.' : 'Carousel playing.'; schedule();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); focusPaused = true;
        show(current + (event.key === 'ArrowRight' ? 1 : -1), true);
      }
    });
    slideshow.addEventListener('pointerdown', event => {
      focusPaused = false;
      if (event.pointerType === 'touch' && !event.target.closest('button, a')) {
        touchStart = { x: event.clientX, y: event.clientY }; touching = true;
      }
      schedule();
    });
    slideshow.addEventListener('pointerup', event => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
      touchStart = null; touching = false;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1), true);
      else schedule();
    });
    slideshow.addEventListener('pointercancel', () => { touchStart = null; touching = false; schedule(); });
    motion.addEventListener('change', () => { paused = motion.matches; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting; schedule();
    }, { threshold: 0.15 }).observe(slideshow);
    schedule();
  }
  const enquiryService = document.querySelector('[data-enquiry-service]');
  if (enquiryService) {
    const service = new URLSearchParams(location.search).get('service');
    if ([...enquiryService.options].some(option => option.value === service)) enquiryService.value = service;
  }
  const emailEnquiry = document.querySelector('[data-email-enquiry]');
  if (emailEnquiry) {
    const destination = 'elementalesbysony@gmail.com';
    function updateEmailDraft() {
      const details = new FormData(emailEnquiry);
      const service = enquiryService.selectedOptions[0]?.textContent || 'Photography';
      const subject = `Elementales enquiry — ${service}`;
      const body = [
        'Hello Sony,', '', 'I would love to discuss photography with you.', '',
        `Name: ${details.get('name') || ''}`,
        `Email: ${details.get('email') || ''}`,
        `Photography: ${service}`,
        `Preferred date: ${details.get('date') || 'Flexible / to discuss'}`,
        `Venue or city: ${details.get('location') || 'To discuss'}`,
        `Phone: ${details.get('phone') || 'Not provided'}`, '',
        'My plans:', details.get('message') || '', '', 'Thank you!'
      ].join('\r\n');
      emailEnquiry.action = `mailto:${destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    emailEnquiry.addEventListener('input', updateEmailDraft);
    emailEnquiry.addEventListener('change', updateEmailDraft);
    emailEnquiry.addEventListener('submit', event => {
      event.preventDefault();
      updateEmailDraft();
      emailEnquiry.querySelector('[data-enquiry-feedback]').textContent = 'Your email app should open a draft. Please review it and send it there. If it does not open, use Sony’s email link below.';
      location.href = emailEnquiry.action;
    });
    updateEmailDraft();
  }
  const customerFeedback = document.querySelector('[data-email-feedback]');
  if (customerFeedback) {
    function updateFeedbackDraft() {
      const details = new FormData(customerFeedback);
      const rating = details.get('rating');
      const subject = `Elementales customer feedback — ${details.get('service') || 'Photography'}`;
      const body = [
        'Hello Sony,', '', 'I would like to share feedback about my Elementales experience.', '',
        `Name: ${details.get('name') || ''}`,
        `Email: ${details.get('email') || ''}`,
        `Photography: ${details.get('service') || ''}`,
        `Overall experience: ${rating ? `${rating} / 5` : 'Not selected'}`, '',
        'My experience:', details.get('message') || '', '', 'Thank you!'
      ].join('\r\n');
      customerFeedback.action = `mailto:elementalesbysony@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    customerFeedback.addEventListener('input', updateFeedbackDraft);
    customerFeedback.addEventListener('change', updateFeedbackDraft);
    customerFeedback.addEventListener('submit', event => {
      event.preventDefault();
      updateFeedbackDraft();
      customerFeedback.querySelector('[data-feedback-feedback]').textContent = 'Your email app should open a draft. Review and send your feedback there. If it does not open, use Sony’s email link below.';
      location.href = customerFeedback.action;
    });
    updateFeedbackDraft();
  }
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
