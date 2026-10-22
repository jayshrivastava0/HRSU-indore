// POST /api/quote — bulk/export RFQ submissions (FCL/LCL container orders,
// wire/LC payment). Separate from /api/order, which is the retail 25/50kg
// UPI checkout — international buyers can't use UPI, and container-scale
// export needs an individually quoted price/Incoterm, not a cart.
// Secrets: RESEND_API_KEY (npx wrangler secret put RESEND_API_KEY).

const QUOTE_TO_DEFAULT = 'contact@hrsuindore.com'; // override with the QUOTE_TO env var once quotes@ receives mail
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

  // One-field quick form sends `contact` (an email or a phone/WhatsApp number);
  // the long form still sends email/phone separately. Everything else is optional.
  const contact = String(d.contact || '').trim();
  if (contact) {
    if (contact.includes('@')) d.email = d.email || contact;
    else d.phone = d.phone || contact;
  }
  for (const k of Object.keys(d)) {
    if (typeof d[k] === 'string' && d[k].length > 800) return json({ error: `Invalid field: ${k}` }, 400);
  }
  const hasEmail = d.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email);
  const hasPhone = d.phone && /^[0-9+\-\s()]{6,20}$/.test(d.phone);
  if (d.email && !hasEmail) return json({ error: 'Invalid email' }, 400);
  if (d.phone && !hasPhone) return json({ error: 'Invalid phone' }, 400);
  if (!hasEmail && !hasPhone) return json({ error: 'Please give an email or a phone number' }, 400);

  if (!env.RESEND_API_KEY) {
    return json({ error: 'Quote system not configured' }, 503);
  }

  const ref = 'HRSU-RFQ-' + Date.now().toString(36).toUpperCase();
  const html = `
    <h2>New export/bulk quote request ${ref}</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Company</th><td>${esc(d.company || '—')}</td></tr>
      <tr><th>Country (typed)</th><td>${esc(d.country || '—')}</td></tr>
      <tr><th>Country (from network)</th><td>${esc((request.cf && request.cf.country) || '—')}</td></tr>
      <tr><th>Contact name</th><td>${esc(d.name || '—')}</td></tr>
      <tr><th>Email</th><td>${esc(d.email || '—')}</td></tr>
      <tr><th>Phone</th><td>${esc(d.phone || '—')}</td></tr>
      <tr><th>Product</th><td>${esc(d.product || 'Calcium Nitrate')}</td></tr>
      <tr><th>Application</th><td>${esc(d.application || '—')}</td></tr>
      <tr><th>Quantity</th><td>${esc(d.quantity || '—')}</td></tr>
      <tr><th>Preferred Incoterm</th><td>${esc(d.incoterm || '—')}</td></tr>
      <tr><th>Message</th><td>${esc(d.message || '—')}</td></tr>
      <tr><th>Lead source</th><td>${esc(d.lead_source || 'unknown')}${d.lead_medium ? ' / ' + esc(d.lead_medium) : ''}</td></tr>
      <tr><th>Landing page</th><td>${esc(d.landing_page || '—')}</td></tr>
      <tr><th>Submitted from</th><td>${esc(d.page || '—')}</td></tr>
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
      to: [env.QUOTE_TO || QUOTE_TO_DEFAULT],
      ...(hasEmail ? { reply_to: d.email } : {}),
      subject: `Export/bulk quote request ${ref} — ${esc(d.company || d.email || d.phone)}${d.country ? ' (' + esc(d.country) + ')' : ''}`,
      html,
    }),
  });

  if (!r.ok) {
    return json({ error: 'Failed to record quote request' }, 502);
  }

  // Acknowledgement to the buyer: a reference number, the documents and a reply address in their inbox.
  // Best-effort; the internal notification above has already gone out. Nothing typed by the visitor is echoed.
  if (hasEmail) {
    try {
      const base = 'https://hrsuindore.com';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'HRSU Indore <contact@hrsuindore.com>',
          to: [d.email],
          reply_to: 'contact@hrsuindore.com',
          subject: `We received your request ${ref} | HRSU Indore`,
          html: `<p>Thank you for your enquiry about industrial-grade calcium nitrate.</p>
            <p>Your reference is <strong>${ref}</strong>. We will reply to this address within one business day with price, lead time and payment terms for your quantity and destination.</p>
            <p>In the meantime, the documents we supply are here:</p>
            <ul>
              <li><a href="${base}/calcium-nitrate-tds-hrsu.pdf">Technical data sheet (TDS)</a></li>
              <li><a href="${base}/calcium-nitrate-sds-hrsu.pdf">Safety data sheet (SDS)</a></li>
              <li><a href="${base}/calcium-nitrate-coa-hrsu.pdf">Sample certificate of analysis (COA)</a></li>
            </ul>
            <p>You can reply to this email with your specification, quantity and destination port.</p>
            <p>HRSU Indore Pvt. Ltd.<br>Plot No. 62, MPIDC Industrial Area, Maksi, Madhya Pradesh 465106, India<br>
            <a href="mailto:contact@hrsuindore.com">contact@hrsuindore.com</a> | +91 94250 00484 | <a href="${base}">hrsuindore.com</a></p>
            <p style="color:#666;font-size:12px">You are receiving this one message because a quote request was submitted with this email address. If that was not you, ignore it; nothing further will be sent.</p>`,
        }),
      });
    } catch (e) { /* acknowledgement is best-effort */ }
  }

  // Optional instant phone alert (free ntfy.sh push). Dormant unless NTFY_TOPIC is set as a secret:
  //   npx wrangler secret put NTFY_TOPIC   (use a long random topic name, then subscribe to it in the ntfy app)
  if (env.NTFY_TOPIC) {
    try {
      const line = [d.application, d.quantity, d.country || (request.cf && request.cf.country), d.email || d.phone]
        .filter(Boolean).join(' | ');
      await fetch('https://ntfy.sh/' + encodeURIComponent(env.NTFY_TOPIC), {
        method: 'POST',
        headers: { Title: 'New HRSU quote request ' + ref, Priority: 'high', Tags: 'incoming_envelope' },
        body: line || ref,
      });
    } catch (e) { /* alert is best-effort; the email already went out */ }
  }
  return json({ ok: true, ref });
}
