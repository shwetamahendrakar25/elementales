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
    const pause = slideshow.querySelector('[data-slide-pause]');
    const status = slideshow.querySelector('[data-slide-status]');
    const full = slideshow.querySelector('[data-slide-full]');
    let current = 0, timer = null, paused = motion.matches, hovering = false, onScreen = true, pointerPauseIntent = null;
    function schedule() {
      clearTimeout(timer);
      pause.textContent = paused ? 'Resume slideshow' : 'Pause slideshow';
      if (paused || hovering || !onScreen || document.hidden) return;
      // Prepare only the next photograph, keeping the initial page light.
      slides[(current + 1) % slides.length].querySelector('img').loading = 'eager';
      timer = setTimeout(() => { show(current + 1); }, 5000);
    }
    function show(index, announce = false) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== current; });
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
      const slide = slides[current];
      slide.querySelector('img').loading = 'eager';
      const caption = `${slide.dataset.label} · ${current + 1} / ${slides.length}`;
      slideshow.querySelector('[data-slide-caption]').textContent = caption;
      full.href = slide.dataset.full;
      full.setAttribute('aria-label', `View full ${slide.dataset.label} photograph in a new tab`);
      if (announce) status.textContent = caption;
      schedule();
    }
    slideshow.querySelector('[data-slide-controls]').hidden = false;
    pause.addEventListener('pointerdown', () => { pointerPauseIntent = !paused; });
    pause.addEventListener('click', () => {
      paused = pointerPauseIntent === null ? !paused : pointerPauseIntent;
      pointerPauseIntent = null; schedule();
    });
    dots.forEach((dot, index) => dot.addEventListener('click', () => { paused = true; show(index, true); }));
    slideshow.querySelector('[data-slide-prev]').addEventListener('click', () => { paused = true; show(current - 1, true); });
    slideshow.querySelector('[data-slide-next]').addEventListener('click', () => { paused = true; show(current + 1, true); });
    slideshow.addEventListener('focusin', event => {
      // Pause on entry. Keep the pause/resume button operable on repeated clicks.
      if (!slideshow.contains(event.relatedTarget)) { paused = true; schedule(); }
    });
    slideshow.addEventListener('mouseenter', () => { hovering = true; schedule(); });
    slideshow.addEventListener('mouseleave', () => { hovering = false; schedule(); });
    slideshow.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); paused = true;
      show(current + (event.key === 'ArrowRight' ? 1 : -1), true);
    });
    motion.addEventListener('change', () => { if (motion.matches) paused = true; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting; schedule();
    }, { threshold: 0.15 }).observe(slideshow);
    show(0);
  }
  const enquiryService = document.querySelector('[data-enquiry-service]');
  if (enquiryService) {
    const service = new URLSearchParams(location.search).get('service');
    if ([...enquiryService.options].some(option => option.value === service)) enquiryService.value = service;
  }
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
