// GET /api/geo — returns the visitor's country as seen by Cloudflare (IP based,
// nothing stored, no cookie). The page uses it only to reorder contact options
// (e.g. email-first for US/EU/AU, WhatsApp-first elsewhere). Never cached.
export async function onRequest(context) {
  const country = (context.request.cf && context.request.cf.country) || '';
  return new Response(JSON.stringify({ country }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
