// lead.js — quote/sample request forms (homepage + /industrial/).
// Posts to /api/quote (emails the enquiry to contact@hrsuindore.com).
// If the API is unavailable, the buyer's entries are NOT lost: we keep the form
// filled in and offer one-click email / WhatsApp with every field pre-written.
(function () {
  var TO = 'contact@hrsuindore.com';
  var WA = '919425000484';

  function attribution() {
    try { return JSON.parse(localStorage.getItem('hrsu_attribution') || 'null') || {}; }
    catch (e) { return {}; }
  }

  function summary(d) {
    var rows = [
      ['Company', d.company], ['Contact', d.name], ['Email', d.email], ['Phone', d.phone],
      ['Country', d.country], ['Product', d.product], ['Application', d.application],
      ['Quantity', d.quantity], ['Incoterm', d.incoterm], ['Message', d.message]
    ];
    return rows.filter(function (r) { return r[1]; })
      .map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
  }

  function fallbackHtml(d) {
    var body = 'Quote / sample request — HRSU Indore\n\n' + summary(d);
    var mail = 'mailto:' + TO + '?subject=' + encodeURIComponent('Quote request — ' + (d.company || '') +
      ' (' + (d.country || '') + ')') + '&body=' + encodeURIComponent(body);
    var wa = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(body);
    return 'We could not send this automatically. Your details are still in the form — ' +
      'send them in one click instead:<br><br>' +
      '<a class="btn" href="' + mail + '">Send by email</a> &nbsp; ' +
      '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + wa + '">Send on WhatsApp</a>';
  }

  document.querySelectorAll('form[data-lead-form]').forEach(function (form) {
    var status = form.parentNode.querySelector('[data-lead-status]');
    var btn = form.querySelector('button[type=submit]');
    var label = btn ? btn.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = Object.fromEntries(new FormData(form).entries());
      var a = attribution();
      d.lead_source = a.source || '';
      d.lead_medium = a.medium || '';
      d.landing_page = a.landing_page || '';
      d.page = location.pathname;
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d)
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.error) || 'failed');
          if (typeof gtag === 'function') {
            gtag('event', 'generate_lead', { lead_type: 'industrial_rfq', country: d.country, quantity: d.quantity });
            gtag('event', 'qualify_lead', { qualify_reason: 'industrial_rfq', quantity: d.quantity });
          }
          form.hidden = true;
          status.hidden = false;
          status.className = 'notice ok';
          status.textContent = 'Thank you. We will reply with pricing, lead time and payment terms (and a sample COA) within one business day.';
        })
        .catch(function () {
          status.hidden = false;
          status.className = 'notice err';
          status.innerHTML = fallbackHtml(d);
          if (btn) { btn.disabled = false; btn.textContent = label; }
        });
    });
  });
})();
