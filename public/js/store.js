// store.js — order form + analytics for /store pages
window.dataLayer = window.dataLayer || [];

// Fire view_item on product pages (page declares window.HRSU_PRODUCT)
if (window.HRSU_PRODUCT) {
  dataLayer.push({
    event: 'view_item',
    ecommerce: { currency: 'INR', items: [window.HRSU_PRODUCT] }
  });
}

function waOrderLink(d) {
  var msg = 'Order — HRSU Indore\nProduct: ' + d.product +
    '\nSize: ' + d.size + '\nQty (bags): ' + d.quantity +
    '\nName: ' + d.name + '\nPhone: ' + d.phone +
    (d.email ? '\nEmail: ' + d.email : '') +
    (d.address ? '\nAddress: ' + d.address : '') +
    (d.upi_ref ? '\nUPI Ref: ' + d.upi_ref : '');
  return 'https://wa.me/919425000484?text=' + encodeURIComponent(msg);
}

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('order-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = Object.fromEntries(new FormData(form).entries());
    var status = document.getElementById('order-status');
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Placing order…';

    dataLayer.push({
      event: 'begin_checkout',
      ecommerce: { currency: 'INR', items: [window.HRSU_PRODUCT] }
    });

    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'failed');
        dataLayer.push({ event: 'purchase_intent', value: Number(d.quantity || 1), currency: 'INR' });
        window.location.href = '/store/thank-you/';
      })
      .catch(function () {
        // API down or Resend not configured — fall back to WhatsApp
        status.className = 'notice';
        status.innerHTML = 'Our order system is busy — tap below to place the same order on WhatsApp:<br><br><a class="btn btn-wa" target="_blank" rel="noopener" href="' + waOrderLink(d) + '">Order on WhatsApp →</a>';
        btn.disabled = false; btn.textContent = 'Confirm Order';
      });
  });
});

// Review form — POST to /api/reviews, goes to moderation queue
document.addEventListener('DOMContentLoaded', function () {
  var rform = document.getElementById('review-form');
  if (!rform) return;
  rform.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = Object.fromEntries(new FormData(rform).entries());
    var status = document.getElementById('review-status');
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(function (r) {
      if (!r.ok) throw new Error('failed');
      rform.hidden = true;
      status.hidden = false;
      status.className = 'notice ok';
      status.textContent = 'Thank you! Your review has been submitted and will appear after moderation.';
      dataLayer.push({ event: 'submit_review', rating: Number(d.rating) });
    }).catch(function () {
      status.hidden = false;
      status.className = 'notice err';
      status.textContent = 'Could not submit your review right now. Please try again later or WhatsApp us at +91 94250 00484.';
    });
  });
});
