export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const product_id = url.searchParams.get('product_id');

  if (!product_id) {
    return new Response(JSON.stringify({ error: 'product_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const reviews = await env.DB.prepare(
    'SELECT id, name, city, rating, body, created_at FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY created_at DESC LIMIT 50'
  )
    .bind(product_id)
    .all();

  return new Response(JSON.stringify(reviews.results || []), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const d = await request.json();

    // Honeypot: if 'website' field is filled, silently succeed (bot submission)
    if (d.website) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validation
    if (!d.product_id || !d.name || !d.body) {
      return new Response(JSON.stringify({ error: 'product_id, name, body required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rating = parseInt(d.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'rating must be 1-5' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (d.name.length > 100 || d.body.length > 2000) {
      return new Response(JSON.stringify({ error: 'name or body too long' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert review (approved=0 by default)
    const result = await env.DB.prepare(
      'INSERT INTO reviews (product_id, name, city, rating, body) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(d.product_id, d.name, d.city || null, rating, d.body)
      .run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
