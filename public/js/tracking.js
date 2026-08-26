// tracking.js — lead-quality signal events for hrsuindore.com/blog/ and /store/.
//
// These four events (cta_click, scroll_depth_p75, spec_download, technical_dwell)
// existed on the old Blogger blog via a Google Tag Manager container and fed real
// data into the scoring/bandit pipeline. They were never carried over when
// publishing moved on-domain (2026-08-23), so GA4 recorded zero of them on any
// page since — see docs/superpowers/progress/ for the diagnostic. This restores
// them by firing gtag() directly, matching how page_view already works on these
// pages (no GTM container is loaded here — see GT/GA4 <script> tags in <head>).
(function () {
  function fire(name, params) {
    if (typeof gtag === 'function') gtag('event', name, params || {});
  }

  // ── Attribution capture ──────────────────────────────────────────────────
  // GA4 only sees what happens on-site. A lot of real orders close over
  // email/UPI/WhatsApp with zero further site interaction, so "which post
  // produced this lead" has to be captured HERE, at landing, and carried
  // forward — GA4 can't reconstruct it after the fact. First-touch, 30-day
  // window, first-party localStorage only (no cookie banner needed).
  var ATTR_KEY = 'hrsu_attribution';
  var ATTR_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  function captureAttribution() {
    try {
      var existing = JSON.parse(localStorage.getItem(ATTR_KEY) || 'null');
      if (existing && (Date.now() - existing.captured_at) < ATTR_MAX_AGE_MS) return existing;

      var params = new URLSearchParams(location.search);
      var source = params.get('utm_source') || '';
      var medium = params.get('utm_medium') || '';
      var campaign = params.get('utm_campaign') || '';

      if (!source && document.referrer) {
        var refHost = '';
        try { refHost = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
        if (/(^|\.)facebook\.com$/.test(refHost)) { source = 'facebook'; medium = medium || 'referral'; }
        else if (/(^|\.)linkedin\.com$/.test(refHost)) { source = 'linkedin'; medium = medium || 'referral'; }
        else if (/(^|\.)google\./.test(refHost)) { source = 'google'; medium = medium || 'organic'; }
        else if (/(^|\.)bing\.com$/.test(refHost)) { source = 'bing'; medium = medium || 'organic'; }
        else if (/blog\.hrsuindore\.com$/.test(refHost)) { source = 'legacy-blog'; medium = medium || 'referral'; }
        else if (refHost) { source = refHost; medium = medium || 'referral'; }
      }
      if (!source) { source = '(direct)'; medium = medium || '(none)'; }

      var attribution = {
        source: source, medium: medium, campaign: campaign,
        landing_page: location.pathname, landing_title: document.title,
        captured_at: Date.now()
      };
      localStorage.setItem(ATTR_KEY, JSON.stringify(attribution));
      return attribution;
    } catch (e) {
      return null; // localStorage unavailable (private mode etc.) — best-effort only
    }
  }

  var attribution = captureAttribution();

  // Tag every static WhatsApp/mailto CTA with the current page AND the
  // ORIGINAL landing source (from stored attribution, not the live URL —
  // internal navigation drops query params, so reading location.href here
  // would silently lose the source the moment someone browses past the page
  // they first landed on). This is the only way to answer "where did this
  // lead actually come from" for an inquiry that skips the order form
  // entirely — the answer ends up sitting in the email/WhatsApp message
  // itself. Links that already carry a custom message (e.g. the order-form
  // WhatsApp fallback) are left untouched.
  document.querySelectorAll('a[href^="https://wa.me/"], a[href^="mailto:"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (/[?&]text=|[?&]body=/.test(href)) return;
    var pageRef = (document.title || location.pathname).slice(0, 80);
    var sourceLine = attribution
      ? 'Source: ' + attribution.source + '/' + attribution.medium +
        (attribution.campaign ? ' (campaign: ' + attribution.campaign + ')' : '') +
        ' — landed on: ' + attribution.landing_page
      : 'Source: unknown';
    var isMailto = href.indexOf('mailto:') === 0;
    var param = isMailto ? 'body' : 'text';
    var msg = 'Hi, I have a question about: ' + pageRef + '\n\n[' + sourceLine + ']';
    var sep = href.indexOf('?') === -1 ? '?' : '&';
    a.setAttribute('href', href + sep + param + '=' + encodeURIComponent(msg));
  });

  // technical_dwell — fires once a visitor has spent 30s of *visible* time on
  // the page (paused while the tab is hidden/backgrounded), the strongest
  // single signal that a real reader, not a crawler, is here.
  (function () {
    var THRESHOLD_MS = 30000;
    var accumulated = 0;
    var lastStart = document.visibilityState === 'visible' ? Date.now() : null;
    var fired = false;

    function tick() {
      if (fired) return;
      if (lastStart) accumulated += Date.now() - lastStart, lastStart = Date.now();
      if (accumulated >= THRESHOLD_MS) {
        fired = true;
        fire('technical_dwell', { engagement_time_msec: Math.round(accumulated) });
        return;
      }
      setTimeout(tick, 2000);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        lastStart = Date.now();
      } else if (lastStart) {
        accumulated += Date.now() - lastStart;
        lastStart = null;
      }
    });

    setTimeout(tick, 2000);
  })();

  // scroll_depth_p75 — fires once when the reader passes 75% of page depth.
  (function () {
    var fired = false;
    function check() {
      if (fired) return;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return;
      var pct = (window.scrollY || doc.scrollTop) / scrollable;
      if (pct >= 0.75) {
        fired = true;
        fire('scroll_depth_p75', { percent_scrolled: 75 });
        window.removeEventListener('scroll', check);
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  })();

  // spec_download — TDS/SDS PDF clicks (technical due-diligence intent).
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/\.pdf(\?|$)/i.test(href) || /\b(tds|sds)\b/i.test(href)) {
      fire('spec_download', {
        file_url: href,
        link_text: (a.textContent || '').trim().slice(0, 100)
      });
    }
  }, true);

  // cta_click — WhatsApp links, mailto CTAs, and the store's order-form submit.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a[href], button[type="submit"]');
    if (!el) return;
    var href = (el.getAttribute('href') || '').toLowerCase();
    var isCtaLink = href.indexOf('wa.me') !== -1 ||
                    href.indexOf('mailto:') === 0 ||
                    el.classList.contains('lrn-cta') ||
                    el.classList.contains('cta');
    var isOrderSubmit = el.tagName === 'BUTTON' && el.closest('#order-form, .order');
    if (isCtaLink || isOrderSubmit) {
      fire('cta_click', {
        cta_label: (el.textContent || '').trim().slice(0, 100),
        cta_href: href || null
      });
    }
  }, true);
})();
