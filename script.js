(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const mobile = matchMedia('(max-width: 1023px)');
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
  const cards = [...document.querySelectorAll('.work-card')];
  function filterBy(button) {
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    cards.forEach(card => { card.hidden = card.dataset.category !== button.dataset.filter; });
    const status = document.querySelector('[data-filter-status]');
    if (status) status.textContent = `Showing ${button.textContent.trim()}`;
  }
  filters.forEach(button => button.addEventListener('click', () => filterBy(button)));
  if (filters.length) filterBy(filters[0]);

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
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
