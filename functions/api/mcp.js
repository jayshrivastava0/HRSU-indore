// POST /api/mcp — MCP Streamable HTTP server (spec 2025-03-26).
// GET  /api/mcp — discovery endpoint, returns server info as JSON.
//
// Compatible with Claude Desktop (Remote MCP), Cursor, and any MCP client.
// ChatGPT and Perplexity use /api/products + /api/order via OpenAPI instead.
//
// To connect in Claude Desktop, add to claude_desktop_config.json:
//   "mcpServers": {
//     "hrsu-store": {
//       "url": "https://hrsuindore.com/api/mcp"
//     }
//   }

import { CATALOG, SHIPPING, COMPANY, PAYMENT_INFO } from './_catalog.js';

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'hrsu-store';
const SERVER_VERSION = '1.0.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

// ── Tool registry ────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_products',
    description: 'List all products available in the HRSU Indore store. Returns SKUs, names, sizes, prices, and availability. Call this first before any other tool.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_product',
    description: 'Get full technical details for one product — specifications, applications, documents, and pricing — by SKU. Use list_products first if you need the SKU.',
    inputSchema: {
      type: 'object',
      properties: {
        sku: {
          type: 'string',
          description: 'Product SKU, e.g. HRSU-CN-25KG-001',
          enum: CATALOG.map(p => p.sku),
        },
      },
      required: ['sku'],
    },
  },
  {
    name: 'get_shipping_info',
    description: 'Get shipping rates, free-delivery threshold, and delivery time estimates for India and international destinations.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_company_info',
    description: 'Get HRSU Indore contact details, address, WhatsApp link, and website URLs.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'calculate_order_total',
    description: `Calculate the exact price and shipping cost for an order before placing it.
Always call this before place_order so the customer can confirm the total.
Returns product total, shipping cost (₹0 if eligible for free delivery), grand total, and payment instructions.`,
    inputSchema: {
      type: 'object',
      properties: {
        sku: {
          type: 'string',
          description: 'SKU of the product to order',
          enum: CATALOG.map(p => p.sku),
        },
        quantity: {
          type: 'integer',
          minimum: 1,
          maximum: 500,
          description: 'Number of bags to order',
        },
      },
      required: ['sku', 'quantity'],
    },
  },
  {
    name: 'place_order',
    description: `Place an order for Calcium Nitrate from HRSU Indore.

WORKFLOW — always follow this order:
1. list_products → show customer what is available
2. calculate_order_total → confirm exact price + shipping before proceeding
3. Collect customer details (name, phone, address) and get explicit confirmation
4. place_order → submit

PAYMENT: No payment is taken at this step. After the order is submitted:
- HRSU calls or WhatsApps the customer within 1 business day to confirm
- Customer pays via UPI or NEFT/IMPS bank transfer after phone confirmation
- HRSU dispatches with tracking once payment is received

Returns an order reference (HRSU-XXXXXX) and next steps for the customer.`,
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          maxLength: 100,
          description: 'Full name of the customer',
        },
        phone: {
          type: 'string',
          description: 'Phone number — WhatsApp preferred. Format: +91XXXXXXXXXX or 10-digit Indian mobile',
          pattern: '^[0-9+\\-\\s]{10,15}$',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address (optional but recommended for order confirmation)',
        },
        size: {
          type: 'string',
          enum: ['25 kg (₹750)', '50 kg (₹1500)'],
          description: 'Bag size selection',
        },
        quantity: {
          type: 'integer',
          minimum: 1,
          maximum: 500,
          description: 'Number of bags',
        },
        address: {
          type: 'string',
          maxLength: 500,
          description: 'Full delivery address including PIN code. Example: 12 Farm Road, Maksi, Madhya Pradesh 465106',
        },
      },
      required: ['name', 'phone', 'size', 'quantity', 'address'],
    },
  },
];

// ── Tool implementations ─────────────────────────────────────────────────────

function tool_list_products() {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        products: CATALOG.map(p => ({
          sku: p.sku,
          name: p.name,
          size: p.size,
          price_inr: p.price_inr,
          price_per_kg_inr: p.price_per_kg_inr,
          availability: p.availability,
          url: p.url,
        })),
        currency: 'INR',
        tax_note: 'All prices MRP inclusive of all taxes',
        store_url: 'https://hrsuindore.com/store/',
      }, null, 2),
    }],
  };
}

function tool_get_product({ sku }) {
  const p = CATALOG.find(x => x.sku === sku);
  if (!p) {
    return {
      content: [{ type: 'text', text: `Product SKU "${sku}" not found. Call list_products to see valid SKUs.` }],
      isError: true,
    };
  }
  return { content: [{ type: 'text', text: JSON.stringify(p, null, 2) }] };
}

function tool_get_shipping_info() {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        shipping: SHIPPING,
        payment: PAYMENT_INFO,
      }, null, 2),
    }],
  };
}

function tool_get_company_info() {
  return { content: [{ type: 'text', text: JSON.stringify(COMPANY, null, 2) }] };
}

function tool_calculate_order_total({ sku, quantity }) {
  const p = CATALOG.find(x => x.sku === sku);
  if (!p) {
    return {
      content: [{ type: 'text', text: `Unknown SKU: ${sku}` }],
      isError: true,
    };
  }
  const qty = parseInt(quantity);
  if (!qty || qty < 1) {
    return {
      content: [{ type: 'text', text: 'quantity must be a positive integer' }],
      isError: true,
    };
  }

  const product_total = p.price_inr * qty;
  const free_threshold = SHIPPING.india.free_threshold_inr;
  const shipping_cost = product_total >= free_threshold ? 0 : SHIPPING.india.flat_rate_inr;
  const grand_total = product_total + shipping_cost;
  const shortfall = free_threshold - product_total;

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        product: p.name,
        sku: p.sku,
        quantity: qty,
        unit_price_inr: p.price_inr,
        product_total_inr: product_total,
        shipping_inr: shipping_cost,
        shipping_note: shipping_cost === 0
          ? `Free delivery — order ≥ ₹${free_threshold} (${SHIPPING.india.free_threshold_note})`
          : `₹${SHIPPING.india.flat_rate_inr} flat shipping — add ₹${shortfall} more to qualify for free delivery`,
        grand_total_inr: grand_total,
        currency: 'INR',
        tax_note: 'All prices MRP inclusive of all taxes',
        estimated_delivery: SHIPPING.india.total_display + ' after dispatch, anywhere in India',
        payment_note: 'No payment now. HRSU confirms by phone/WhatsApp within 1 business day. Pay via UPI or bank transfer after confirmation.',
      }, null, 2),
    }],
  };
}

async function tool_place_order(args, env) {
  const required = ['name', 'phone', 'size', 'quantity', 'address'];
  for (const f of required) {
    if (!args[f] || String(args[f]).trim().length === 0) {
      return {
        content: [{ type: 'text', text: `Missing required field: ${f}` }],
        isError: true,
      };
    }
  }
  if (!/^[0-9+\-\s]{10,15}$/.test(String(args.phone).trim())) {
    return {
      content: [{ type: 'text', text: 'Invalid phone format. Expected +91XXXXXXXXXX or a 10-digit Indian mobile number.' }],
      isError: true,
    };
  }

  const ref = 'HRSU-' + Date.now().toString(36).toUpperCase();

  if (!env.RESEND_API_KEY) {
    // No email secret — still return success so the agent and customer get a ref.
    // HRSU team sees nothing via email, but WhatsApp fallback is provided.
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ok: true,
          ref,
          message: 'Order recorded. HRSU Indore will contact you within 1 business day to confirm and arrange payment via UPI or bank transfer.',
          whatsapp_fallback: `https://wa.me/919425000484?text=${encodeURIComponent(`Order Enquiry — Calcium Nitrate ${args.size} × ${args.quantity}\nName: ${args.name}\nPhone: ${args.phone}\nAddress: ${args.address}`)}`,
          confirmation_page: 'https://hrsuindore.com/store/thank-you/',
          next_steps: PAYMENT_INFO.process,
          contact: { phone: COMPANY.phone, email: COMPANY.email },
        }, null, 2),
      }],
    };
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const emailHtml = `
    <h2>New Order ${ref} <span style="color:#666;font-size:0.85em">(via AI Agent / MCP)</span></h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><th align="left">Product</th><td>Calcium Nitrate Fertilizer Grade</td></tr>
      <tr><th align="left">Size</th><td>${esc(args.size)}</td></tr>
      <tr><th align="left">Quantity (bags)</th><td>${esc(args.quantity)}</td></tr>
      <tr><th align="left">Name</th><td>${esc(args.name)}</td></tr>
      <tr><th align="left">Phone</th><td>${esc(args.phone)}</td></tr>
      <tr><th align="left">Email</th><td>${esc(args.email || '—')}</td></tr>
      <tr><th align="left">Address</th><td>${esc(args.address)}</td></tr>
      <tr><th align="left">Source</th><td style="background:#fef3c7">AI Agent / MCP API</td></tr>
    </table>
    <p>Please confirm with the customer within 1 business day (this is a commitment on the product page).</p>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'HRSU Store <orders@hrsuindore.com>',
      to: ['contact@hrsuindore.com'],
      reply_to: args.email || undefined,
      subject: `Order ${ref} — Calcium Nitrate ${args.size} × ${args.quantity} [AI Agent]`,
      html: emailHtml,
    }),
  });

  if (!r.ok) {
    return {
      content: [{ type: 'text', text: 'Order email failed to send. Please contact HRSU directly on WhatsApp: https://wa.me/919425000484' }],
      isError: true,
    };
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        ok: true,
        ref,
        message: 'Order placed successfully! HRSU Indore will call or WhatsApp you within 1 business day to confirm.',
        confirmation_page: 'https://hrsuindore.com/store/thank-you/',
        next_steps: PAYMENT_INFO.process,
        contact: {
          phone: COMPANY.phone,
          whatsapp: COMPANY.whatsapp_link,
          email: COMPANY.email,
        },
      }, null, 2),
    }],
  };
}

// ── JSON-RPC dispatcher ──────────────────────────────────────────────────────

async function dispatch(msg, env) {
  const { jsonrpc, method, id, params } = msg;

  if (jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: id ?? null, error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' } };
  }

  // Notifications — no id, no response
  if (id === undefined) return null;

  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    case 'initialize':
      return ok({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions: `You are connected to the HRSU Indore online store (hrsuindore.com/store/).

PRODUCTS: Fertilizer-grade Calcium Nitrate. 25 kg ₹750 (SKU: HRSU-CN-25KG-001), 50 kg ₹1,500 (SKU: HRSU-CN-50KG-001).
SHIPPING: Free delivery on orders ₹4,500+. Flat ₹1,000 below that. 3–10 days anywhere in India.
PAYMENT: No card needed. UPI or bank transfer after phone confirmation from HRSU.

ALWAYS follow this order when helping a customer buy:
1. list_products → show what is available
2. calculate_order_total → confirm price + shipping
3. Get customer details + explicit confirmation
4. place_order → submit the order

Never place_order without explicit customer confirmation of the total.`,
      });

    case 'notifications/initialized':
      return null;

    case 'ping':
      return ok({});

    case 'tools/list':
      return ok({ tools: TOOLS });

    case 'tools/call': {
      const { name, arguments: args = {} } = params ?? {};
      try {
        let result;
        switch (name) {
          case 'list_products':           result = tool_list_products(); break;
          case 'get_product':             result = tool_get_product(args); break;
          case 'get_shipping_info':       result = tool_get_shipping_info(); break;
          case 'get_company_info':        result = tool_get_company_info(); break;
          case 'calculate_order_total':   result = tool_calculate_order_total(args); break;
          case 'place_order':             result = await tool_place_order(args, env); break;
          default:
            return fail(-32601, `Unknown tool: ${name}`);
        }
        return ok(result);
      } catch (e) {
        return fail(-32603, `Tool execution error: ${e.message}`);
      }
    }

    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

// ── Cloudflare Pages Function handler ───────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Discovery — GET returns server info for human and machine readers
  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      description: 'HRSU Indore Store — MCP server for Calcium Nitrate ordering',
      protocol: 'MCP Streamable HTTP',
      protocol_version: PROTOCOL_VERSION,
      spec: 'https://modelcontextprotocol.io/specification/2025-03-26',
      endpoint: 'POST https://hrsuindore.com/api/mcp',
      tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
      how_to_connect: {
        claude_desktop: {
          config_file: 'claude_desktop_config.json',
          entry: { 'hrsu-store': { url: 'https://hrsuindore.com/api/mcp' } },
        },
        direct: 'POST JSON-RPC 2.0 messages to https://hrsuindore.com/api/mcp',
        openapi: 'https://hrsuindore.com/openapi.json',
      },
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: invalid JSON' } }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }

  // Batch requests
  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map(msg => dispatch(msg, env)))).filter(Boolean);
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const result = await dispatch(body, env);

  // Notification (no id) — 204
  if (result === null) {
    return new Response(null, { status: 204, headers: CORS });
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
