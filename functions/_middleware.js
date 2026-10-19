import { CATALOG, SHIPPING, rupee } from './api/_catalog.js';

// Markdown view of the homepage for AI agents (served when Accept: text/markdown).
// Retail prices/shipping come from the catalog, which reads pricing.json — never hard-code them here.
const RETAIL_LINES = CATALOG
  .map((p) => `- ${p.size} bag — ${rupee(p.price_inr)} (${rupee(p.price_per_kg_inr)}/kg, SKU: ${p.sku})`)
  .join('\n');

const MARKDOWN = `# HRSU Indore Pvt. Ltd. — Industrial Grade Calcium Nitrate Manufacturer & Exporter

Manufacturer and exporter of industrial-grade calcium nitrate tetrahydrate (CAS 13477-34-4). Plant at Maksi, Madhya Pradesh (Indore region), India; head office in Indore. Export-ready from Mundra Port or Nhava Sheva. About the company and plant: https://hrsuindore.com/calcium-nitrate-manufacturer-india/ .  Industrial buyers: request a quote and sample COA at https://hrsuindore.com/industrial/ .

## Industrial grade (core business)

- [Industrial grade: specifications, documents and quote form](https://hrsuindore.com/industrial/)
- Calcium nitrate tetrahydrate, Ca(NO₃)₂·4H₂O, assay 99–103%, soluble calcium 16.4% min, nitrate nitrogen 11.7% min, white crystals.
- Certificate of analysis with every lot. UN1454, Class 5.1, PG III. HS code 28342990.
- Uses: concrete admixtures, wastewater H₂S control, cold-weather concrete for mining sites, oil and gas fluids, process industries.
- Calcium nitrate melt (liquid) planned for early 2027.
- Export: Mundra Port or Nhava Sheva, EXW / FOB / CIF / DDP quoted per order, T/T or LC. Container-scale supply (TDS minimum 10 MT).
- India vs China sourcing guide: https://hrsuindore.com/calcium-nitrate-india-vs-china/
- Quote form: https://hrsuindore.com/industrial/#quote

## Technical Documents

- [TDS](https://hrsuindore.com/calcium-nitrate-tds-hrsu.pdf) · [SDS](https://hrsuindore.com/calcium-nitrate-sds-hrsu.pdf) · [Sample COA](https://hrsuindore.com/calcium-nitrate-coa-hrsu.pdf)

## Retail store (small packs, India only — not for industrial buyers)

- [Retail Store](https://hrsuindore.com/store/)
${RETAIL_LINES}

All retail prices MRP inclusive of all taxes. Free delivery on orders ${rupee(SHIPPING.india.free_threshold_inr)}+. Flat ${rupee(SHIPPING.india.flat_rate_inr)} below that. 3–10 days India-wide. Retail checkout: UPI or NEFT/IMPS after confirmation.

## API & AI Agent Access (retail store)

- **Product catalog (JSON):** GET https://hrsuindore.com/api/products
- **Place order (REST):** POST https://hrsuindore.com/api/order
- **MCP server:** POST https://hrsuindore.com/api/mcp (tools: list_products, calculate_order_total, place_order, and more)
- **OpenAPI 3.1 spec:** https://hrsuindore.com/openapi.json
- **llms.txt:** https://hrsuindore.com/llms.txt

## Contact

- **Email:** contact@hrsuindore.com
- **Phone / WhatsApp:** +91 94250 00484
- **Factory:** Plot No. 62, MPIDC Industrial Area, Maksi, Madhya Pradesh 465106, India
- **Blog:** [hrsuindore.com/blog](https://hrsuindore.com/blog/) — technical guides & market insights, full directory at /blog/posts-index.json
`;

export async function onRequest(context) {
  const { request, next } = context;
  const accept = request.headers.get('Accept') || '';
  const url = new URL(request.url);

  if (
    accept.includes('text/markdown') &&
    (url.pathname === '/' || url.pathname === '/index.html')
  ) {
    return new Response(MARKDOWN, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return next();
}
