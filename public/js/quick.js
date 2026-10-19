// quick.js — low-friction contact for phone visitors (homepage + /industrial/).
// 1) Tap-to-chat block: two optional chip rows (use, quantity) build a pre-written
//    WhatsApp / email message, so a visitor never has to type to start a conversation.
// 2) One-field form: just an email or WhatsApp number -> /api/quote (Resend).
// 3) A sticky bottom bar on phones with WhatsApp + Book a call, hidden while the
//    quote block itself is on screen.
(function () {
  var WA = '919425000484';
  var MAIL = 'contact@hrsuindore.com';
  var CAL = 'https://calendar.app.google/aQ8ioyAbckEuVqZe6';
  var PRODUCT = 'industrial grade calcium nitrate';

  var USES = ['Concrete', 'Wastewater', 'Mining', 'Oil & gas', 'Other'];
  var QTYS = ['1 container (about 20 MT)', 'More than 1 container', 'Not sure yet'];

  function attribution() {
    try { return JSON.parse(localStorage.getItem('hrsu_attribution') || 'null') || {}; }
    catch (e) { return {}; }
  }
  function sourceLine() {
    var a = attribution();
    return a.source ? '[Source: ' + a.source + '/' + (a.medium || '') + ' - landed on: ' + (a.landing_page || location.pathname) + ']' : '';
  }
  function fire(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }

  function message(state) {
    var lines = ['Hello HRSU Indore, I would like a quote for ' + PRODUCT + '.'];
    if (state.use) lines.push('Use: ' + state.use);
    if (state.qty) lines.push('Quantity: ' + state.qty);
    var s = sourceLine();
    if (s) lines.push('', s);
    return lines.join('\n');
  }

  function chips(group, items) {
    return items.map(function (t) {
      return '<button type="button" class="qk-chip" data-group="' + group + '" data-v="' + t.replace(/"/g, '&quot;') + '">' + t.replace(/&/g, '&amp;') + '</button>';
    }).join('');
  }

  function render(host) {
    host.innerHTML =
      '<div class="qk">' +
        '<p class="qk-h">Get a quote in 30 seconds. No form needed.</p>' +
        '<p class="qk-l">What will you use it for? <span>(optional, tap one)</span></p>' +
        '<div class="qk-chips">' + chips('use', USES) + '</div>' +
        '<p class="qk-l">How much do you need?</p>' +
        '<div class="qk-chips">' + chips('qty', QTYS) + '</div>' +
        '<div class="qk-actions">' +
          '<a class="qk-btn qk-wa" data-wa target="_blank" rel="noopener">Message us on WhatsApp</a>' +
          '<a class="qk-btn qk-mail" data-mail>Email us</a>' +
          '<a class="qk-btn qk-cal" data-cal href="' + CAL + '" target="_blank" rel="noopener">Book a call</a>' +
        '</div>' +
        '<p class="qk-note">Your message is already written. Just press send.</p>' +
        '<div class="qk-or"><span>or leave one contact and we will reach out</span></div>' +
        '<form class="qk-form" data-qk-form novalidate>' +
          '<input class="qk-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<input type="text" name="contact" inputmode="email" autocomplete="email" placeholder="Your email or WhatsApp number" aria-label="Your email or WhatsApp number" maxlength="120">' +
          '<button type="submit" class="qk-send">Send</button>' +
        '</form>' +
        '<div class="qk-status" data-qk-status hidden></div>' +
      '</div>';

    var state = { use: '', qty: '' };
    var wa = host.querySelector('[data-wa]');
    var mail = host.querySelector('[data-mail]');

    function refresh() {
      var msg = message(state);
      wa.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
      var subj = 'Quote request: calcium nitrate' + (state.use ? ' (' + state.use + ')' : '');
      mail.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(msg + '\n\nCompany:\nDestination country:');
    }
    refresh();

    host.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('.qk-chip');
      if (c) {
        var g = c.getAttribute('data-group');
        var on = c.classList.contains('on');
        host.querySelectorAll('.qk-chip[data-group="' + g + '"]').forEach(function (x) { x.classList.remove('on'); });
        state[g] = on ? '' : c.getAttribute('data-v');
        if (!on) c.classList.add('on');
        refresh();
        return;
      }
      if (e.target.closest && e.target.closest('[data-cal]')) fire('book_call_click', { page: location.pathname });
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
        status.textContent = 'Please enter an email address or a phone / WhatsApp number.';
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
          product: 'Calcium Nitrate Tetrahydrate — Industrial Grade',
          application: state.use, quantity: state.qty,
          lead_source: a.source || '', lead_medium: a.medium || '', landing_page: a.landing_page || '', page: location.pathname
        })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.error) || 'failed');
          fire('generate_lead', { lead_type: 'quick_contact', contact_kind: isMail ? 'email' : 'phone' });
          fire('qualify_lead', { qualify_reason: 'quick_contact' });
          form.hidden = true;
          status.hidden = false; status.className = 'qk-status ok';
          status.textContent = 'Thank you. We will reply within one business day.';
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Send';
          status.hidden = false; status.className = 'qk-status err';
          status.innerHTML = 'That did not go through. Please use the WhatsApp or Email button above instead.';
        });
    });
  }

  document.querySelectorAll('[data-quick]').forEach(render);

  // ---- sticky bottom bar on phones ----
  var quote = document.querySelector('[data-quick]') || document.getElementById('quote');
  if (!quote) return;
  var bar = document.createElement('div');
  bar.className = 'qk-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Contact');
  var barMsg = message({ use: '', qty: '' });
  bar.innerHTML =
    '<a class="qk-bar-wa" target="_blank" rel="noopener" href="https://wa.me/' + WA + '?text=' + encodeURIComponent(barMsg) + '">Get a quote on WhatsApp</a>' +
    '<a class="qk-bar-cal" target="_blank" rel="noopener" href="' + CAL + '">Book a call</a>';
  document.body.appendChild(bar);
  bar.querySelector('.qk-bar-cal').addEventListener('click', function () { fire('book_call_click', { page: location.pathname, where: 'sticky_bar' }); });

  var quoteVisible = false;
  function update() {
    var show = window.scrollY > 260 && !quoteVisible;
    bar.classList.toggle('show', show);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      quoteVisible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.15 }).observe(quote);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();
