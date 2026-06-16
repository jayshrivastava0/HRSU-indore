// GET /api/products — machine-readable product catalog for AI agents and integrations.
// Returns full catalog with prices, specs, shipping, and company info.

import { CATALOG, SHIPPING, COMPANY, PAYMENT_INFO } from './_catalog.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const url = new URL(request.url);
  const sku = url.searchParams.get('sku');

  // Single product lookup
  if (sku) {
    const product = CATALOG.find(p => p.sku === sku);
    if (!product) {
      return new Response(JSON.stringify({ error: `Product not found: ${sku}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    return new Response(JSON.stringify(product, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        ...CORS,
      },
    });
  }

  // Full catalog
  const body = {
    store: 'HRSU Indore Online Store',
    store_url: 'https://hrsuindore.com/store/',
    currency: 'INR',
    tax_note: 'All prices are MRP inclusive of all taxes (Indian Legal Metrology Act)',
    products: CATALOG,
    shipping: SHIPPING,
    payment: PAYMENT_INFO,
    company: COMPANY,
    api: {
      products: 'GET https://hrsuindore.com/api/products',
      products_single: 'GET https://hrsuindore.com/api/products?sku=HRSU-CN-25KG-001',
      place_order: 'POST https://hrsuindore.com/api/order',
      mcp_server: 'POST https://hrsuindore.com/api/mcp',
      openapi_spec: 'https://hrsuindore.com/openapi.json',
    },
    last_updated: '2026-06-17',
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      ...CORS,
    },
  });
}
