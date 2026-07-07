(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');

  const setHeader = () => header.classList.toggle('scrolled', scrollY > 48);
  addEventListener('scroll', setHeader, { passive: true }); setHeader();

  const closeMenu = (returnFocus = false) => {
    menuButton.setAttribute('aria-expanded', 'false'); nav.classList.remove('open');
    header.classList.remove('menu-active'); document.body.classList.remove('nav-open');
    menuButton.querySelector('.sr-only').textContent = 'Open navigation';
    if (returnFocus) menuButton.focus();
  };
  menuButton.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') === 'false';
    menuButton.setAttribute('aria-expanded', String(opening)); nav.classList.toggle('open', opening);
    header.classList.toggle('menu-active', opening); document.body.classList.toggle('nav-open', opening);
    menuButton.querySelector('.sr-only').textContent = opening ? 'Close navigation' : 'Open navigation';
    if (opening) nav.querySelector('a').focus();
  });
  nav.addEventListener('click', e => { if (e.target.matches('a')) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) closeMenu(true);
    if (e.key === 'Tab' && nav.classList.contains('open')) {
      const focusable = [...nav.querySelectorAll('a'), menuButton];
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  addEventListener('resize', () => { if (innerWidth > 768 && nav.classList.contains('open')) closeMenu(); }, { passive: true });

  const reveals = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) reveals.forEach(el => el.classList.add('visible'));
  else (() => {
    const observer = new IntersectionObserver((entries, obs) => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => observer.observe(el));
  })();

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const cards = [...document.querySelectorAll('.work-card')];
  const status = document.querySelector('[data-filter-status]');
  const applyFilter = tab => {
    tabs.forEach(item => item.setAttribute('aria-selected', String(item === tab)));
    cards.forEach(card => card.classList.add('is-leaving'));
    setTimeout(() => cards.forEach(card => {
      const show = card.dataset.category === tab.dataset.filter;
      card.classList.toggle('is-hidden', !show); card.classList.remove('is-leaving');
      if (show) requestAnimationFrame(() => card.classList.add('visible'));
    }), reducedMotion ? 0 : 250);
    status.textContent = `Showing ${tab.textContent}`;
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => applyFilter(tab));
    tab.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault(); let next = index;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0; if (e.key === 'End') next = tabs.length - 1;
      tabs[next].focus(); applyFilter(tabs[next]);
    });
  });

  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const track = carousel.querySelector('.carousel-track'); const slides = [...track.children];
    const dots = carousel.querySelector('.carousel-dots'); let current = 0; let startX = 0;
    slides.forEach((_, i) => { const dot = document.createElement('button'); dot.type = 'button'; dot.setAttribute('aria-label', `Show ${carousel.dataset.label.slice(0,-1)} ${i + 1}`); dot.addEventListener('click', () => go(i)); dots.append(dot); });
    const dotButtons = [...dots.children];
    const go = index => { current = (index + slides.length) % slides.length; track.style.transform = `translateX(-${slides[current].offsetLeft}px)`; dotButtons.forEach((d,i) => d.classList.toggle('active', i === current)); slides.forEach((s,i) => s.setAttribute('aria-hidden', String(i !== current))); };
    carousel.querySelector('[data-prev]').addEventListener('click', () => go(current - 1));
    carousel.querySelector('[data-next]').addEventListener('click', () => go(current + 1));
    carousel.tabIndex = 0; carousel.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(current - 1); if (e.key === 'ArrowRight') go(current + 1); });
    track.addEventListener('pointerdown', e => { startX = e.clientX; track.setPointerCapture(e.pointerId); });
    track.addEventListener('pointerup', e => { const delta = e.clientX - startX; if (Math.abs(delta) > 45) go(current + (delta < 0 ? 1 : -1)); });
    addEventListener('resize', () => go(current), { passive: true }); go(0);
  });

  document.querySelectorAll('.faq-item button').forEach(button => button.addEventListener('click', () => {
    const answer = document.getElementById(button.getAttribute('aria-controls')); const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open)); answer.hidden = open; answer.classList.toggle('opening', !open);
  }));

  const video = document.querySelector('[data-hero-video]');
  if (video && 'IntersectionObserver' in window && !reducedMotion) new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting ? video.play().catch(() => {}) : video.pause()), { threshold: .15 }).observe(video);
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
})();
