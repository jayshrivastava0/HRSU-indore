// POST /api/quote — bulk/export RFQ submissions (FCL/LCL container orders,
// wire/LC payment). Separate from /api/order, which is the retail 25/50kg
// UPI checkout — international buyers can't use UPI, and container-scale
// export needs an individually quoted price/Incoterm, not a cart.
// Secrets: RESEND_API_KEY (npx wrangler secret put RESEND_API_KEY).

const QUOTE_TO = 'contact@hrsuindore.com';
const QUOTE_FROM = 'quotes@hrsuindore.com'; // domain must be verified in Resend

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let d;
  try {
    d = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (d.website) return json({ ok: true, ref: 'OK' }); // honeypot: pretend success to bots

  for (const f of ['company', 'country', 'name', 'email', 'quantity']) {
    if (!d[f] || String(d[f]).length > 300) return json({ error: `Invalid field: ${f}` }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json({ error: 'Invalid email' }, 400);
  if (d.phone && !/^[0-9+\-\s()]{6,20}$/.test(d.phone)) return json({ error: 'Invalid phone' }, 400);

  if (!env.RESEND_API_KEY) {
    return json({ error: 'Quote system not configured' }, 503);
  }

  const ref = 'HRSU-RFQ-' + Date.now().toString(36).toUpperCase();
  const html = `
    <h2>New export/bulk quote request ${ref}</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Company</th><td>${esc(d.company)}</td></tr>
      <tr><th>Country</th><td>${esc(d.country)}</td></tr>
      <tr><th>Contact name</th><td>${esc(d.name)}</td></tr>
      <tr><th>Email</th><td>${esc(d.email)}</td></tr>
      <tr><th>Phone</th><td>${esc(d.phone || '—')}</td></tr>
      <tr><th>Product</th><td>${esc(d.product || 'Calcium Nitrate')}</td></tr>
      <tr><th>Quantity</th><td>${esc(d.quantity)}</td></tr>
      <tr><th>Preferred Incoterm</th><td>${esc(d.incoterm || '—')}</td></tr>
      <tr><th>Message</th><td>${esc(d.message || '—')}</td></tr>
      <tr><th>Lead source</th><td>${esc(d.lead_source || 'unknown')}${d.lead_medium ? ' / ' + esc(d.lead_medium) : ''}</td></tr>
      <tr><th>Landing page</th><td>${esc(d.landing_page || '—')}</td></tr>
    </table>
    <p><strong>Export/bulk RFQ — respond with a quoted price, MOQ, lead time, and payment terms (wire/LC).</strong></p>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `HRSU Export RFQ <${QUOTE_FROM}>`,
      to: [QUOTE_TO],
      reply_to: d.email,
      subject: `Export/bulk quote request ${ref} — ${esc(d.company)} (${esc(d.country)})`,
      html,
    }),
  });

  if (!r.ok) {
    return json({ error: 'Failed to record quote request' }, 502);
  }
  return json({ ok: true, ref });
}
