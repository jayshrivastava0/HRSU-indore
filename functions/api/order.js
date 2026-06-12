// POST /api/order — receives order form JSON, emails it via Resend.
// Secrets: RESEND_API_KEY (npx wrangler secret put RESEND_API_KEY).
// Without the key, returns 503 so the client falls back to WhatsApp ordering.

const ORDER_TO = 'contact@hrsuindore.com';
const ORDER_FROM = 'orders@hrsuindore.com'; // domain must be verified in Resend

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequestPost(context) {
  const { request, env } = context;

  let d;
  try {
    d = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (d.website) return json({ ok: true, ref: 'OK' }); // honeypot: pretend success to bots

  for (const f of ['name', 'phone', 'product', 'size', 'quantity', 'address']) {
    if (!d[f] || String(d[f]).length > 600) return json({ error: `Invalid field: ${f}` }, 400);
  }
  if (!/^[0-9+\-\s]{10,15}$/.test(d.phone)) return json({ error: 'Invalid phone' }, 400);

  if (!env.RESEND_API_KEY) {
    return json({ error: 'Order system not configured' }, 503);
  }

  const ref = 'HRSU-' + Date.now().toString(36).toUpperCase();
  const html = `
    <h2>New store order ${ref}</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Product</th><td>${esc(d.product)}</td></tr>
      <tr><th>Size</th><td>${esc(d.size)}</td></tr>
      <tr><th>Quantity (bags)</th><td>${esc(d.quantity)}</td></tr>
      <tr><th>Name</th><td>${esc(d.name)}</td></tr>
      <tr><th>Phone</th><td>${esc(d.phone)}</td></tr>
      <tr><th>Email</th><td>${esc(d.email || '—')}</td></tr>
      <tr><th>Address</th><td>${esc(d.address)}</td></tr>
    </table>
    <p>Confirm with the customer within 1 business day (commitment made on the product page).</p>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `HRSU Store <${ORDER_FROM}>`,
      to: [ORDER_TO],
      reply_to: d.email || undefined,
      subject: `Store order ${ref} — ${d.product} ${d.size} × ${d.quantity}`,
      html,
    }),
  });

  if (!r.ok) {
    return json({ error: 'Failed to record order' }, 502);
  }
  return json({ ok: true, ref });
}
