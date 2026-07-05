// GET/POST /api/indexnow — pings the IndexNow API (used by Bing, and by extension
// ChatGPT/Copilot which lean on Bing's index) with every on-domain URL from sitemap.xml,
// so newly published or updated pages get crawled faster than waiting for a normal
// Googlebot/Bingbot pass. There's no build/CI pipeline in this repo, so this isn't wired
// to run automatically on deploy — trigger it manually after a deploy:
//   curl https://hrsuindore.com/api/indexnow

const INDEXNOW_KEY = 'ea82f8db2c784d18aec9d69a5193f5f3';
const HOST = 'hrsuindore.com';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'GET or POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Read sitemap.xml straight from the assets binding rather than an HTTP
  // subrequest back to our own zone, which is unreliable from inside a Worker.
  const sitemapRes = await env.ASSETS.fetch(new Request(`https://${HOST}/sitemap.xml`));
  const sitemapXml = await sitemapRes.text();

  if (!sitemapRes.ok) {
    return new Response(JSON.stringify({
      error: 'Failed to read sitemap.xml from assets',
      status: sitemapRes.status,
      preview: sitemapXml.slice(0, 300),
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(m => m[1])
    .filter(u => u.startsWith(`https://${HOST}/`)); // on-domain only — excludes blog.hrsuindore.com

  if (!urls.length) {
    return new Response(JSON.stringify({
      error: 'No on-domain URLs found in sitemap.xml',
      preview: sitemapXml.slice(0, 300),
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const indexNowRes = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls,
    }),
  });

  return new Response(JSON.stringify({
    submitted_count: urls.length,
    submitted_urls: urls,
    indexnow_status: indexNowRes.status,
  }, null, 2), {
    status: indexNowRes.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
}
