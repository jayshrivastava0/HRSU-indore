// quick.js — low-friction, country-aware contact (homepage + /industrial/).
// 1) Country layout: /api/geo (Cloudflare, IP based, nothing stored) decides whether
//    the page leads with WhatsApp (India, Middle East, SE Asia, Africa, LatAm, ...) or
//    with email + a booked call (US, Canada, UK, EU, Australia/NZ, East Asia), where
//    WhatsApp is not how a business first contacts a supplier. The static page and
//    all indexed text stay identical for everyone; only the contact buttons reorder.
// 2) One-field form: an email or a phone number -> /api/quote (Resend).
// 3) Sticky bottom bar on phones, hidden while the quote block is on screen.
// Test any country with ?geo=US (or DE, AU, AE, IN ...).
(function () {
  var WA = '919425000484';
  var MAIL = 'contact@hrsuindore.com';
  var CAL = 'https://calendar.app.google/aQ8ioyAbckEuVqZe6';
  var PRODUCT = 'industrial grade calcium nitrate';
  var SMS = '+919425000484';
  var LINKEDIN = 'https://www.linkedin.com/company/hrsu-indore';
  var TOUCH = (window.matchMedia && matchMedia('(pointer:coarse)').matches);

  // Countries where email / a scheduled call is the normal first B2B contact.
  var EMAIL_FIRST = ('US CA GB IE AU NZ DE FR NL BE LU AT CH SE NO DK FI IS PL CZ SK HU RO BG HR SI EE LV LT MT CY GR IT ES PT JP KR CN TW HK').split(' ');
  var EU = ('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE').split(' ');

  function regionNote(c) {
    var need = 'Need REACH, TSCA or AICIS documentation? Contact us with your destination country and we will go through the requirements with you.';
    if (c === 'US') return 'Importing into the US? We quote CIF or DDP to your port. Need TSCA documentation? Contact us and we will go through the requirements with you.';
    if (c === 'AU') return 'Importing into Australia? We quote CIF or DDP to your port. Need AICIS documentation? Contact us and we will go through the requirements with you.';
    if (c === 'GB') return 'Importing into the UK? We quote CIF or DDP to your port. Need UK REACH documentation? Contact us and we will go through the requirements with you.';
    if (EU.indexOf(c) !== -1) return 'Importing into the EU? We quote CIF or DDP to your port. Need REACH documentation? Contact us and we will go through the requirements with you.';
    if (c === 'CA' || c === 'NZ') return 'Importing into ' + (c === 'CA' ? 'Canada' : 'New Zealand') + '? We quote CIF or DDP to your port. Need regulatory documentation for your country? Contact us.';
    return '';
  }

  function qs(name) { try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; } }

  function getGeo() {
    var forced = (qs('geo') || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(forced)) return Promise.resolve(forced);
    try { var c = sessionStorage.getItem('hrsu_geo'); if (c !== null) return Promise.resolve(c); } catch (e) {}
    var timeout = new Promise(function (res) { setTimeout(function () { res(''); }, 900); });
    var req = fetch('/api/geo', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var c = (j && j.country) || '';
        try { sessionStorage.setItem('hrsu_geo', c); } catch (e) {}
        return c;
      }).catch(function () { return ''; });
    return Promise.race([req, timeout]);
  }

  function attribution() {
    try { return JSON.parse(localStorage.getItem('hrsu_attribution') || 'null') || {}; }
    catch (e) { return {}; }
  }
  function fire(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }

  // Pre-written message: just the greeting. No source line, no blank fields to fill in.
  var MSG = 'Hello HRSU Indore, I would like a quote for ' + PRODUCT + '.';
  var MAILTO = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Quote request: calcium nitrate') + '&body=' + encodeURIComponent(MSG);

  function render(host, country, layout) {
    var west = layout === 'mail';
    var note = regionNote(country);
    var inputLabel = west ? 'Your work email' : 'Your email or WhatsApp number';
    var wa = west ? '' : '<a class="qk-btn qk-wa" data-wa target="_blank" rel="noopener" href="https://wa.me/' + WA + '?text=' + encodeURIComponent(MSG) + '">Message us on WhatsApp</a><div class="qk-or"><span>or</span></div>';
    host.innerHTML =
      '<div class="qk ' + (west ? 'qk-west' : 'qk-wa-first') + '">' +
        '<p class="qk-h">Request a price quote</p>' +
        '<p class="qk-sub">A real person on our team replies within one business day with price, lead time and a sample COA.</p>' +
        wa +
        '<form class="qk-form" data-qk-form novalidate>' +
          '<input class="qk-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<label class="qk-fl" for="qk-msg">What do you need? <span>(optional)</span></label>' +
          '<textarea id="qk-msg" name="message" rows="2" maxlength="600" placeholder="e.g. 1 container for concrete, delivered to Houston"></textarea>' +
          '<label class="qk-fl" for="qk-contact">' + (west ? 'Where should we send the quote?' : 'Where should we reply?') + '</label>' +
          '<input id="qk-contact" type="text" name="contact" inputmode="email" autocomplete="email" placeholder="' + inputLabel + '" maxlength="120">' +
          '<button type="submit" class="qk-send">Send quote request</button>' +
          '<p class="qk-priv">Used only to reply to this request. No newsletters, no marketing emails.</p>' +
        '</form>' +
        '<div class="qk-status" data-qk-status hidden></div>' +
        '<p class="qk-alt">Rather write or talk? <a data-mail href="' + MAILTO + '">Email us</a> &middot; <a data-cal href="' + CAL + '" target="_blank" rel="noopener">Book a call</a>' + (west && TOUCH ? ' &middot; <a data-sms href="sms:' + SMS + '?&body=' + encodeURIComponent(MSG) + '">Text us</a>' : '') + '</p>' +
        (note ? '<p class="qk-region">' + note + '</p>' : '') +
        '<a class="qk-li" href="' + LINKEDIN + '" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>Find us on LinkedIn</a>' +
      '</div>';

    host.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-cal]')) fire('book_call_click', { page: location.pathname, layout: layout });
      if (e.target.closest && e.target.closest('[data-sms]')) fire('sms_click', { page: location.pathname, visitor_country: country || 'unknown' });
    });

    var form = host.querySelector('[data-qk-form]');
    var status = host.querySelector('[data-qk-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (form.contact.value || '').trim();
      var isMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      var isPhone = /^[0-9+\-\s()]{6,20}$/.test(v);
      if (!isMail && !isPhone) {
        status.hidden = false; status.className = 'qk-status err';
        status.textContent = 'Please enter an email address' + (west ? '.' : ' or a phone / WhatsApp number.');
        return;
      }
      var a = attribution();
      var btn = form.querySelector('.qk-send');
      btn.disabled = true; btn.textContent = '...';
      fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: form.website.value,
          contact: v,
          message: (form.message.value || '').trim(),
          product: 'Calcium Nitrate Tetrahydrate — Industrial Grade',
          lead_source: a.source || '', lead_medium: a.medium || '', landing_page: a.landing_page || '', page: location.pathname
        })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.error) || 'failed');
          fire('generate_lead', { lead_type: 'quick_contact', contact_kind: isMail ? 'email' : 'phone', visitor_country: country || 'unknown', layout: layout });
          fire('qualify_lead', { qualify_reason: 'quick_contact' });
          form.hidden = true;
          status.hidden = false; status.className = 'qk-status ok';
          status.textContent = 'Request received. We will reply to ' + v + ' within one business day.';
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Send quote request';
          status.hidden = false; status.className = 'qk-status err';
          status.innerHTML = 'That did not go through. Please use the Email link below instead.';
        });
    });
  }

  // Swap the page-wide WhatsApp-first elements for visitors where WhatsApp is not the norm.
  function adaptPage(layout) {
    if (layout !== 'mail') return;
    var hero = document.querySelector('.hero-btns .btn-wa');
    if (hero) {
      hero.removeAttribute('target');
      hero.setAttribute('href', CAL);
      hero.setAttribute('target', '_blank');
      hero.setAttribute('data-cal', '');
      hero.textContent = 'Book a call';
      hero.addEventListener('click', function () { fire('book_call_click', { page: location.pathname, where: 'hero', layout: layout }); });
    }
    document.querySelectorAll('.nav-wa, .fab-wa').forEach(function (el) { el.style.display = 'none'; });
    document.querySelectorAll('.menu-foot a[href*="wa.me"]').forEach(function (el) { el.style.display = 'none'; });
  }

  function addBar(layout) {
    var quote = document.querySelector('[data-quick]') || document.getElementById('quote');
    if (!quote) return;
    var west = layout === 'mail';
    var bar = document.createElement('div');
    bar.className = 'qk-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Contact');
    var waHref = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(MSG);
    var mailHref = MAILTO;
    var smsHref = 'sms:' + SMS + '?&body=' + encodeURIComponent(MSG);
    bar.innerHTML = west
      ? '<a class="qk-bar-main" href="' + mailHref + '">Email us for a quote</a>' + (TOUCH ? '<a class="qk-bar-alt qk-bar-sms" href="' + smsHref + '">Text us</a>' : '') + '<a class="qk-bar-alt qk-bar-book" target="_blank" rel="noopener" href="' + CAL + '">Book a call</a>'
      : '<a class="qk-bar-main qk-bar-green" target="_blank" rel="noopener" href="' + waHref + '">Get a quote on WhatsApp</a><a class="qk-bar-alt qk-bar-book" target="_blank" rel="noopener" href="' + CAL + '">Book a call</a>';
    document.body.appendChild(bar);
    document.body.classList.add('has-qk-bar');
    (bar.querySelector('.qk-bar-book') || bar.querySelector('.qk-bar-alt')).addEventListener('click', function () { fire('book_call_click', { page: location.pathname, where: 'sticky_bar', layout: layout }); });
    var visible = false;
    function update() { bar.classList.toggle('show', window.scrollY > 260 && !visible); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(quote);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  getGeo().then(function (country) {
    var layout = EMAIL_FIRST.indexOf(country) !== -1 ? 'mail' : 'wa';
    document.documentElement.setAttribute('data-contact-layout', layout);
    fire('contact_layout', { layout: layout, visitor_country: country || 'unknown', non_interaction: true });
    document.querySelectorAll('[data-quick]').forEach(function (h) { render(h, country, layout); });
    adaptPage(layout);
    addBar(layout);
  });
})();
