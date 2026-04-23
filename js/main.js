/* ================================================================
   HRSU INDORE — Main JavaScript
   ================================================================ */

/* ── Preloader ─────────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('exit');
  }, 1700);
});

/* ── Navbar scroll ──────────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Hamburger / Menu Overlay ───────────────────────────────── */
const hamBtn     = document.querySelector('.ham-btn');
const overlay    = document.getElementById('menu-overlay');
const menuLinks  = document.querySelectorAll('.menu-nav-link');

function openMenu() {
  hamBtn.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMenu() {
  hamBtn.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

hamBtn.addEventListener('click', () => {
  overlay.classList.contains('open') ? closeMenu() : openMenu();
});
document.querySelector('.menu-close-btn')?.addEventListener('click', closeMenu);
menuLinks.forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ── Scroll Reveal (IntersectionObserver) ───────────────────── */
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObs.observe(el));

/* ── Heritage timeline sweep ────────────────────────────────── */
const sweepEl = document.getElementById('tl-sweep');
if (sweepEl) {
  new IntersectionObserver(([e]) => { if (e.isIntersecting) sweepEl.classList.add('visible'); }, { threshold: 0.5 }).observe(sweepEl);
}

/* ── Counter animation ──────────────────────────────────────── */
function animateCounter(el) {
  const target = +el.dataset.target;
  const duration = 1800;
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}
const counters = document.querySelectorAll('.counter[data-target]');
if (counters.length) {
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); counterObs.unobserve(e.target); } });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObs.observe(c));
}

/* ── Particle Canvas (hero) ─────────────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  for (let i = 0; i < 55; i++) {
    particles.push({
      x: Math.random() * 1, y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: -(Math.random() * 0.0002 + 0.00008),
      size: Math.random() * 1.4 + 0.4,
      alpha: Math.random() * 0.5 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -0.02) p.y = 1.02;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,168,76,${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── STACKING INDUSTRIES ────────────────────────────────────── */
(function initStack() {
  const section   = document.getElementById('industries');
  const stickyWrap = section?.querySelector('.stack-sticky');
  const cards      = section?.querySelectorAll('.stack-card');
  const progressFill = section?.querySelector('.stack-progress-fill');
  const dots       = section?.querySelectorAll('.s-dot');
  if (!section || !cards.length) return;

  const N = cards.length;
  let raf = null;
  let lastProgress = -1;

  function updateStack() {
    const scrollY = window.scrollY;
    const sectionTop    = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const vh = window.innerHeight;
    const totalScrollable = sectionHeight - vh;
    const rawScrolled = scrollY - sectionTop;
    const scrolled = Math.max(0, Math.min(totalScrollable, rawScrolled));
    const progress = scrolled / totalScrollable; // 0 → 1

    if (Math.abs(progress - lastProgress) < 0.001) { raf = requestAnimationFrame(updateStack); return; }
    lastProgress = progress;

    // Progress bar
    if (progressFill) progressFill.style.width = (progress * 100) + '%';

    // Which card is in transition
    const floatIdx   = progress * (N - 1); // 0 → N-1
    const activeIdx  = Math.min(N - 1, Math.floor(floatIdx));
    const enterFrac  = floatIdx - activeIdx; // 0 → 1 within current transition

    cards.forEach((card, i) => {
      let translateY, scaleVal, opacity;
      const depth = activeIdx - i; // how many cards are stacked on top of this one

      if (i < activeIdx) {
        // Past cards: scale back into a stack
        const d = Math.min(depth, 4);
        scaleVal   = 1 - d * 0.025;
        translateY = -d * 6;
        opacity    = Math.max(0, 1 - d * 0.18);
      } else if (i === activeIdx) {
        // Current active card (fully in)
        scaleVal   = 1;
        translateY = 0;
        opacity    = 1;
      } else if (i === activeIdx + 1) {
        // Next card: sliding in from below
        translateY = (1 - enterFrac) * 100;
        scaleVal   = 1;
        opacity    = 1;
      } else {
        // Future cards off-screen
        translateY = 100;
        scaleVal   = 1;
        opacity    = 0;
      }
      card.style.transform = `translateY(${translateY}%) scale(${scaleVal})`;
      card.style.opacity   = opacity;
      card.style.zIndex    = i + 1;
    });

    // Dots
    const dotIdx = Math.round(floatIdx);
    dots.forEach((d, i) => d.classList.toggle('active', i === dotIdx));

    raf = requestAnimationFrame(updateStack);
  }

  // Start loop on scroll (RAF stays alive to smooth any inertia)
  window.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(updateStack);
  }, { passive: true });
  // Initial call
  updateStack();

  // Dot click navigation
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const sectionTop    = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const vh = window.innerHeight;
      const totalScrollable = sectionHeight - vh;
      const targetProgress = i / (N - 1);
      window.scrollTo({ top: sectionTop + targetProgress * totalScrollable, behavior: 'smooth' });
    });
  });
})();

/* ── HORIZONTAL SCROLL FEATURES ─────────────────────────────── */
(function initHScroll() {
  const section   = document.getElementById('advantage');
  const sticky    = section?.querySelector('.h-sticky');
  const track     = section?.querySelector('.h-track');
  const slides    = section?.querySelectorAll('.h-slide');
  const progFill  = section?.querySelector('.h-prog-fill');
  if (!section || !track || !slides.length) return;

  const N = slides.length;

  function update() {
    const sectionTop    = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const vh = window.innerHeight;
    const totalScrollable = sectionHeight - vh;
    const scrolled = Math.max(0, Math.min(totalScrollable, window.scrollY - sectionTop));
    const progress = scrolled / totalScrollable; // 0 → 1

    // Translate the track: 0 → -(N-1)*100vw
    const vw = window.innerWidth;
    const maxTranslate = -(N - 1) * vw;
    const translateX = progress * maxTranslate;
    track.style.transform = `translateX(${translateX}px)`;

    // Progress bar
    if (progFill) progFill.style.width = (progress * 100) + '%';

    // Counter in each slide
    const floatSlide = progress * (N - 1);
    slides.forEach((slide, i) => {
      const counter = slide.querySelector('.h-slide-counter');
      if (counter) counter.innerHTML = `<strong>${i + 1}</strong> / ${N}`;
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();

/* ── FAQ Alpine supplement (vanilla fallback) ────────────────── */
// Alpine.js handles FAQ if loaded; this is a no-op safety fallback.

/* ── Float contact widget ────────────────────────────────────── */
(function initFloatContact() {
  const trigger = document.getElementById('fc-trigger');
  const card    = document.getElementById('fc-card');
  const iconOpen  = document.getElementById('fc-icon-open');
  const iconClose = document.getElementById('fc-icon-close');
  if (!trigger || !card) return;

  let open = false;
  trigger.addEventListener('click', () => {
    open = !open;
    card.classList.toggle('fc-open', open);
    trigger.classList.toggle('fc-open', open);
    trigger.setAttribute('aria-expanded', open);
    iconOpen.classList.toggle('hidden', open);
    iconClose.classList.toggle('hidden', !open);
  });
  document.addEventListener('click', e => {
    if (open && !trigger.contains(e.target) && !card.contains(e.target)) {
      open = false;
      card.classList.remove('fc-open');
      trigger.classList.remove('fc-open');
      trigger.setAttribute('aria-expanded', false);
      iconOpen.classList.remove('hidden');
      iconClose.classList.add('hidden');
    }
  });
})();

/* ── Applications Carousel (drag-to-scroll) ─────────────────── */
(function initCarousel() {
  const wrap  = document.getElementById('app-carousel');
  const track = document.getElementById('app-carousel-track');
  const dots  = document.querySelectorAll('.c-dot');
  if (!wrap || !track) return;

  let isDown = false, startX = 0, scrollLeft = 0;
  wrap.addEventListener('mousedown', e => { isDown = true; wrap.classList.add('active'); startX = e.pageX - wrap.offsetLeft; scrollLeft = wrap.scrollLeft; });
  wrap.addEventListener('mouseleave', () => { isDown = false; wrap.classList.remove('active'); });
  wrap.addEventListener('mouseup', () => { isDown = false; wrap.classList.remove('active'); });
  wrap.addEventListener('mousemove', e => { if (!isDown) return; e.preventDefault(); wrap.scrollLeft = scrollLeft - (e.pageX - wrap.offsetLeft - startX); });

  // Dots
  const cards = track.querySelectorAll('.app-card');
  const cardW = () => (cards[0]?.offsetWidth || 300) + 20;

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { wrap.scrollTo({ left: i * cardW(), behavior: 'smooth' }); });
  });
  wrap.addEventListener('scroll', () => {
    const idx = Math.round(wrap.scrollLeft / cardW());
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }, { passive: true });
})();

/* ── Spec tabs ───────────────────────────────────────────────── */
(function initTabs() {
  const tabs   = document.querySelectorAll('.spec-tab');
  const panels = document.querySelectorAll('.spec-panel');
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      panels[i]?.classList.add('active');
    });
  });
})();
