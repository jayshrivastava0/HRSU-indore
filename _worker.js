// _worker.js — Cloudflare Worker entry point (Workers with Assets)
//
// Routes /api/* to the appropriate handler functions.
// Serves everything else as static assets from env.ASSETS.
//
// This file is required because wrangler.jsonc uses "assets" (Workers with Assets),
// which does not auto-route the functions/ directory. The functions/ directory is
// a Cloudflare Pages-only feature.

import { onRequest as handleMiddleware } from './functions/_middleware.js';
import { onRequest as handleProducts } from './functions/api/products.js';
import { onRequestOptions as handleOrderOptions, onRequestPost as handleOrderPost } from './functions/api/order.js';
import { onRequest as handleMcp } from './functions/api/mcp.js';
import { onRequest as handleTools } from './functions/api/tools.js';
import { onRequest as handleIndexNow } from './functions/api/indexnow.js';
import { onRequestGet as handleReviewsGet, onRequestPost as handleReviewsPost } from './functions/api/reviews.js';
import { onRequest as handleStore } from './functions/store/[[path]].js';
import blogRedirectMap from './blog_redirect_map.json';

// Old blog.hrsuindore.com (Blogger) permalinks -> new on-site /blog/<slug>/ paths.
// Built once from ./blog_redirect_map.json so a request path like
// "/2026/08/betonbeschleuniger-reducing-cold.html" (the part after the
// blog.hrsuindore.com host) 301s to the migrated page instead of 404ing.
const BLOG_REDIRECTS = new Map(
  blogRedirectMap.map(({ old_url, new_path }) => [new URL(old_url).pathname, new_path])
);

function makeCtx(request, env, ctx, params = {}) {
  return {
    request,
    env,
    ctx,
    params,
    data: {},
    functionPath: new URL(request.url).pathname,
    next: () => env.ASSETS.fetch(request),
  };
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const { pathname, method } = url;

      // Old blog.hrsuindore.com (Blogger) posts — 301 to the migrated page.
      // Only fires if DNS for that host is ever routed to this Worker; harmless otherwise.
      if (url.hostname === 'blog.hrsuindore.com' && BLOG_REDIRECTS.has(pathname)) {
        return Response.redirect(`https://hrsuindore.com${BLOG_REDIRECTS.get(pathname)}`, 301);
      }

      // API routes
      if (pathname === '/api/products') return handleProducts(makeCtx(request, env, ctx));
      if (pathname === '/api/mcp')      return handleMcp(makeCtx(request, env, ctx));
      if (pathname === '/api/tools')    return handleTools(makeCtx(request, env, ctx));
      if (pathname === '/api/indexnow') return handleIndexNow(makeCtx(request, env, ctx));

      if (pathname === '/api/order') {
        if (method === 'OPTIONS') return handleOrderOptions();
        if (method === 'POST')    return handleOrderPost(makeCtx(request, env, ctx));
        return new Response('Method Not Allowed', { status: 405 });
      }

      if (pathname === '/api/reviews') {
        if (method === 'GET')  return handleReviewsGet(makeCtx(request, env, ctx));
        if (method === 'POST') return handleReviewsPost(makeCtx(request, env, ctx));
        return new Response('Method Not Allowed', { status: 405 });
      }

      // Store routes — review injection via HTMLRewriter
      if (pathname.startsWith('/store/')) {
        const pathParts = pathname.replace(/^\/store\//, '').replace(/\/$/, '').split('/').filter(Boolean);
        return handleStore(makeCtx(request, env, ctx, { path: pathParts }));
      }

      // Root — handle Accept: text/markdown for AI crawlers (middleware checks this)
      if (pathname === '/' || pathname === '/index.html') {
        return handleMiddleware(makeCtx(request, env, ctx));
      }

      // Everything else: serve from static assets
      if (!env.ASSETS) {
        console.error('ASSETS binding not available');
        return new Response('Internal Server Error: ASSETS not configured', { status: 500 });
      }
      try {
        const response = await env.ASSETS.fetch(request);
        return response;
      } catch (assetError) {
        console.error('ASSETS fetch error:', assetError);
        return new Response(`Internal Server Error: ${assetError.message}`, { status: 500 });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
  },
};
