// GET /api/tools — tool definitions in OpenAI function-calling format.
//
// Compatible with ANY OpenAI-compatible framework or model:
//   Hermes, Ollama, DeepSeek, Llama, Mistral, Qwen, Gemma (via vLLM/Ollama),
//   LangChain, LangGraph, AutoGen, Semantic Kernel, CrewAI, Smolagents,
//   Vercel AI SDK, and every other OpenAI-compatible tool-use framework.
//
// Usage:
//   1. GET /api/tools  →  get tools + system prompt
//   2. Add to your model call: { tools: data.tools, tool_choice: "auto" }
//   3. Set system message: data.system_prompt
//   4. When model calls a tool, execute it against data.endpoint_map
//
// Quick wire example (Python):
//   import requests, openai
//   meta = requests.get("https://hrsuindore.com/api/tools").json()
//   client = openai.OpenAI(base_url="...", api_key="...")  # or any compat endpoint
//   resp = client.chat.completions.create(
//       model="...", tools=meta["tools"],
//       messages=[{"role":"system","content":meta["system_prompt"]},
//                 {"role":"user","content":"Order 6 bags of 25kg calcium nitrate"}]
//   )

import { CATALOG, SHIPPING, COMPANY } from './_catalog.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_products',
      description: 'List all products in the HRSU Indore store with names, SKUs, prices (INR), and availability. Call this first before any order workflow.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product',
      description: 'Get full technical specifications, applications, and document links for a product by SKU.',
      parameters: {
        type: 'object',
        properties: {
          sku: {
            type: 'string',
            enum: CATALOG.map(p => p.sku),
            description: 'Product SKU, e.g. HRSU-CN-25KG-001. Use list_products first if unsure.',
          },
        },
        required: ['sku'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_shipping_info',
      description: 'Get shipping rates, free-delivery threshold (₹4,500), and delivery times for India and international.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_order_total',
      description: `Calculate exact price and shipping cost for an order before placing it.
Always call this and show the customer the total BEFORE calling place_order.
Returns: product total, shipping cost (₹0 if order ≥ ₹4,500, else ₹1,000 flat), grand total, delivery estimate.`,
      parameters: {
        type: 'object',
        properties: {
          sku: {
            type: 'string',
            enum: CATALOG.map(p => p.sku),
            description: 'SKU of the product to order',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            description: 'Number of bags',
          },
        },
        required: ['sku', 'quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_order',
      description: `Place an order for Calcium Nitrate from HRSU Indore.

IMPORTANT WORKFLOW — always follow in order:
1. list_products → show options
2. calculate_order_total → confirm price + shipping with customer
3. Get customer details and EXPLICIT confirmation before proceeding
4. place_order → submit

NO PAYMENT at this step. After submission:
- HRSU calls/WhatsApps customer within 1 business day to confirm
- Customer pays via UPI or NEFT/IMPS bank transfer
- HRSU dispatches with tracking after payment`,
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Full name of the customer',
          },
          phone: {
            type: 'string',
            description: 'Phone number (WhatsApp preferred). Format: +91XXXXXXXXXX or 10-digit Indian mobile.',
          },
          email: {
            type: 'string',
            description: 'Email address (optional but recommended)',
          },
          size: {
            type: 'string',
            enum: ['25 kg (₹750)', '50 kg (₹1500)'],
            description: 'Bag size',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            description: 'Number of bags',
          },
          address: {
            type: 'string',
            description: 'Full delivery address including PIN code',
          },
        },
        required: ['name', 'phone', 'size', 'quantity', 'address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_company_info',
      description: 'Get HRSU Indore contact details, address, WhatsApp, and website URLs.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

// Pre-computed tool execution responses for list_products, get_shipping_info,
// get_company_info (static data — no API call needed in the framework)
const STATIC_TOOL_RESPONSES = {
  list_products: {
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
    tax_note: 'All prices MRP inclusive of all taxes (Indian Legal Metrology Act)',
  },
  get_shipping_info: SHIPPING,
  get_company_info: COMPANY,
};

// How to map tool calls to HTTP requests
// Frameworks like LangChain can use this to auto-wire tool execution
const ENDPOINT_MAP = {
  list_products: {
    method: 'GET',
    url: 'https://hrsuindore.com/api/products',
    note: 'Or use static_responses.list_products — no HTTP call needed',
  },
  get_product: {
    method: 'GET',
    url: 'https://hrsuindore.com/api/products',
    query_params: { sku: '{sku}' },
  },
  get_shipping_info: {
    method: 'GET',
    url: 'https://hrsuindore.com/api/products',
    note: 'Use response.shipping, or use static_responses.get_shipping_info',
  },
  get_company_info: {
    method: 'GET',
    url: 'https://hrsuindore.com/api/products',
    note: 'Use response.company, or use static_responses.get_company_info',
  },
  calculate_order_total: {
    method: 'COMPUTE',
    note: 'Compute locally: total = qty * price; shipping = total >= 4500 ? 0 : 1000',
    formula: {
      product_total: 'quantity * unit_price_inr',
      shipping: 'product_total >= 4500 ? 0 : 1000',
      grand_total: 'product_total + shipping',
    },
    skus: Object.fromEntries(CATALOG.map(p => [p.sku, p.price_inr])),
  },
  place_order: {
    method: 'POST',
    url: 'https://hrsuindore.com/api/order',
    content_type: 'application/json',
    body_template: {
      product: 'Calcium Nitrate Fertilizer Grade',
      size: '{size}',
      quantity: '{quantity}',
      name: '{name}',
      phone: '{phone}',
      email: '{email}',
      address: '{address}',
    },
  },
};

const SYSTEM_PROMPT = `You are a helpful shopping assistant for HRSU Indore's Calcium Nitrate store (https://hrsuindore.com/store/).

PRODUCTS:
- 25 kg bag: ₹750 (SKU: HRSU-CN-25KG-001) — ₹30/kg
- 50 kg bag: ₹1,500 (SKU: HRSU-CN-50KG-001) — ₹30/kg
Both: 100% water-soluble crystalline powder, 18.5–19% Ca, 15.5%+ N. For drip irrigation, foliar spray, hydroponics, fertigation. Certificate of Analysis with every batch.

SHIPPING (India):
- FREE delivery on orders ≥ ₹4,500 (6+ bags × 25 kg, or 3+ bags × 50 kg)
- ₹1,000 flat for orders < ₹4,500
- 3–10 business days anywhere in India

PAYMENT: No card needed. Submit order → HRSU confirms by phone/WhatsApp within 1 business day → customer pays via UPI or bank transfer → dispatch with tracking.

ORDERING WORKFLOW:
1. Show customer available products with prices
2. Calculate order total (use calculate_order_total tool)
3. Show total and confirm with customer before proceeding
4. Collect: full name, phone (WhatsApp preferred), optional email, full address with PIN code
5. Call place_order tool
6. Share the order reference (HRSU-XXXXXX) with customer

Never place an order without the customer's explicit confirmation of the total amount.`;

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
  const format = url.searchParams.get('format') || 'openai';

  // Anthropic tool format (for direct Anthropic API usage without MCP)
  if (format === 'anthropic') {
    const anthropic_tools = TOOLS.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
    return new Response(JSON.stringify({
      tools: anthropic_tools,
      system_prompt: SYSTEM_PROMPT,
      endpoint_map: ENDPOINT_MAP,
      static_responses: STATIC_TOOL_RESPONSES,
      note: 'Use with Anthropic Messages API tool_use. For Claude, prefer the MCP server at https://hrsuindore.com/api/mcp',
    }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
    });
  }

  // Cohere Command R format
  if (format === 'cohere') {
    const cohere_tools = TOOLS.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameter_definitions: Object.fromEntries(
        Object.entries(t.function.parameters.properties || {}).map(([k, v]) => [
          k,
          {
            type: v.type === 'integer' ? 'int' : v.type,
            description: v.description || '',
            required: (t.function.parameters.required || []).includes(k),
          },
        ])
      ),
    }));
    return new Response(JSON.stringify({
      tools: cohere_tools,
      preamble: SYSTEM_PROMPT,
      endpoint_map: ENDPOINT_MAP,
      note: 'Use with Cohere chat endpoint tools parameter.',
    }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
    });
  }

  // Default: OpenAI format (also works for Hermes, Ollama, DeepSeek, Llama,
  // Mistral, Qwen, Gemma, LangChain, AutoGen, Semantic Kernel, CrewAI, Smolagents, Vercel AI SDK)
  return new Response(JSON.stringify({
    tools: TOOLS,
    tool_choice: 'auto',
    system_prompt: SYSTEM_PROMPT,
    endpoint_map: ENDPOINT_MAP,
    static_responses: STATIC_TOOL_RESPONSES,
    formats: {
      openai: 'GET /api/tools',
      anthropic: 'GET /api/tools?format=anthropic',
      cohere: 'GET /api/tools?format=cohere',
    },
    mcp_server: 'POST https://hrsuindore.com/api/mcp',
    openapi_spec: 'https://hrsuindore.com/openapi.json',
    catalog: 'GET https://hrsuindore.com/api/products',
    note: 'OpenAI format is compatible with Hermes, Ollama, DeepSeek, Llama, Mistral, Qwen, Gemma (via vLLM/Ollama), LangChain, AutoGen, Semantic Kernel, CrewAI, Smolagents, and Vercel AI SDK.',
  }, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
  });
}
