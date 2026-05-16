/* ═══════════════════════════════════════
   HRSU INDORE v3 - JavaScript
   ═══════════════════════════════════════ */

/* ── Preloader ── */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('exit');
    setTimeout(() => { document.getElementById('preloader').style.display = 'none'; }, 900);
  }, 2000);
});

/* ── Navbar scroll ── */
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 50);
}, { passive: true });

/* ── Hamburger Menu ── */
const ham = document.querySelector('.ham');
const menu = document.getElementById('menu');
const menuLinks = menu.querySelectorAll('a');

function openMenu() { ham.classList.add('open'); menu.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeMenu() { ham.classList.remove('open'); menu.classList.remove('open'); document.body.style.overflow = ''; }
ham.addEventListener('click', () => menu.classList.contains('open') ? closeMenu() : openMenu());
menuLinks.forEach(l => l.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ── Scroll Reveal ── */
const revEls = document.querySelectorAll('.rv');
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); revObs.unobserve(e.target); } });
}, { threshold: 0.12 });
revEls.forEach(el => revObs.observe(el));

/* ── Counter Animation (legacy, no longer used after stats redesign) ── */

/* ── Stacking Cards (wallet-style with peek) ── */
(function() {
  const section = document.getElementById('industries');
  const wrap = document.querySelector('.stack-wrap');
  const sticky = document.querySelector('.stack-sticky');
  const cards = document.querySelectorAll('.stack-card');
  const tabs = document.querySelectorAll('.stab');
  const countEl = document.querySelector('.stack-count');
  if (!section || !cards.length) return;

  const N = cards.length;

  function update() {
    const rect = wrap.getBoundingClientRect();
    const wrapH = wrap.offsetHeight;
    const vh = window.innerHeight;
    const totalScroll = wrapH - vh;
    const scrolled = Math.max(0, Math.min(totalScroll, -rect.top));
    const progress = scrolled / totalScroll;

    const floatIdx = progress * (N - 1);
    const activeIdx = Math.min(N - 1, Math.floor(floatIdx));
    const frac = floatIdx - activeIdx;

    cards.forEach((card, i) => {
      let ty, scale, opacity, z;
      if (i < activeIdx) {
        // Past: stack up with peek offset
        const depth = activeIdx - i;
        const maxDepth = Math.min(depth, 3);
        scale = 1 - maxDepth * 0.035;
        ty = -maxDepth * 18; // peek: shift up so top edge shows
        opacity = Math.max(0.3, 1 - maxDepth * 0.2);
        z = i;
      } else if (i === activeIdx) {
        // Active: interpolate slight push-up as next card arrives
        scale = 1 - frac * 0.035;
        ty = -frac * 18;
        opacity = 1;
        z = i;
      } else if (i === activeIdx + 1) {
        // Next: slide in from bottom
        ty = (1 - frac) * 105;
        scale = 1;
        opacity = 1;
        z = N + 1;
      } else {
        ty = 110;
        scale = 1;
        opacity = 0;
        z = i;
      }
      card.style.transform = `translateY(${ty}%) scale(${scale})`;
      card.style.opacity = opacity;
      card.style.zIndex = z;
    });

    // Tabs
    const dotIdx = Math.round(floatIdx);
    tabs.forEach((t, i) => {
      t.classList.toggle('active', i === dotIdx);
      t.classList.toggle('passed', i < dotIdx);
    });

    // Count
    if (countEl) countEl.innerHTML = `<strong>${dotIdx + 1}</strong> / ${N}`;

    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);

  // Click tabs to scroll
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      const wrapTop = wrap.offsetTop;
      const wrapH = wrap.offsetHeight;
      const vh = window.innerHeight;
      const totalScroll = wrapH - vh;
      const targetProgress = i / (N - 1);
      window.scrollTo({ top: wrapTop + targetProgress * totalScroll, behavior: 'smooth' });
    });
  });
})();

/* ── Horizontal Scroll (desktop: scroll-driven; mobile: native snap carousel) ── */
(function() {
  const section = document.getElementById('advantage');
  const wrap = document.querySelector('.h-wrap');
  const track = document.querySelector('.h-track');
  const slides = document.querySelectorAll('.h-slide');
  const progFill = document.querySelector('.h-prog-fill');
  if (!section || !track || !slides.length) return;

  const N = slides.length;
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  // Pre-render counters once
  slides.forEach((s, i) => {
    const c = s.querySelector('.h-counter');
    if (c) c.innerHTML = `<strong>${i + 1}</strong> / ${N}`;
  });

  // Mobile: update progress bar from native horizontal scroll on .h-sticky
  const sticky = section.querySelector('.h-sticky');
  if (sticky) {
    sticky.addEventListener('scroll', () => {
      if (!isMobile()) return;
      const maxScroll = sticky.scrollWidth - sticky.clientWidth;
      if (maxScroll <= 0) return;
      const progress = sticky.scrollLeft / maxScroll;
      if (progFill) progFill.style.width = (Math.min(1, progress) * 100) + '%';
    }, { passive: true });
  }

  // Desktop: scroll-driven translateX
  function update() {
    if (isMobile()) {
      track.style.transform = '';
      requestAnimationFrame(update);
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const wrapH = wrap.offsetHeight;
    const vh = window.innerHeight;
    const totalScroll = wrapH - vh;
    const scrolled = Math.max(0, Math.min(totalScroll, -rect.top));
    const progress = scrolled / totalScroll;

    const vw = window.innerWidth;
    track.style.transform = `translateX(${-progress * (N - 1) * vw}px)`;

    if (progFill) progFill.style.width = (progress * 100) + '%';

    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);

  /* Convert horizontal trackpad/wheel into vertical page scroll on desktop */
  wrap.addEventListener('wheel', (e) => {
    if (isMobile()) return;
    const rect = wrap.getBoundingClientRect();
    const wrapH = wrap.offsetHeight;
    const vh = window.innerHeight;
    const totalScroll = wrapH - vh;
    const scrolled = Math.max(0, Math.min(totalScroll, -rect.top));
    const pinned = rect.top <= 0 && rect.bottom >= vh;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 0) {
      const goingForward = e.deltaX > 0;
      const atEnd = scrolled >= totalScroll - 1;
      const atStart = scrolled <= 1;
      if (pinned || (goingForward && !atEnd) || (!goingForward && !atStart)) {
        e.preventDefault();
        window.scrollBy({ top: e.deltaX, behavior: 'auto' });
      }
    }
  }, { passive: false });
})();

/* ── Spec Tabs ── */
(function() {
  const tabs = document.querySelectorAll('.spec-tab');
  const panels = document.querySelectorAll('.spec-panel');
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      if (panels[i]) panels[i].classList.add('active');
    });
  });
})();

/* ── FAQ ── */
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(fi => fi.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

/* ── Trust card cursor glow ── */
document.querySelectorAll('.trust-item').forEach(el => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--cx', ((e.clientX - r.left) / r.width * 100) + '%');
    el.style.setProperty('--cy', ((e.clientY - r.top) / r.height * 100) + '%');
  });
});

/* ── Blog featured image parallax ── */
(function() {
  const featured = document.querySelector('.blog-featured');
  if (!featured) return;
  const img = featured.querySelector('.bf-img img');
  if (!img) return;
  function loop() {
    const r = featured.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = (vh - r.top) / (vh + r.height);
    const offset = (progress - 0.5) * 60;
    img.style.setProperty('--py', offset + 'px');
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
