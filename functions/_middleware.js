const MARKDOWN = `# HRSU Indore Pvt. Ltd. — Calcium Nitrate Manufacturer & Online Store

Manufacturer and online store for fertilizer-grade Calcium Nitrate. Based in Maksi, Madhya Pradesh, India. Export-ready from Mundra Port.

## Online Store

- [Store Home](https://hrsuindore.com/store/)
- [Calcium Nitrate Fertilizer Grade — 25 kg ₹750](https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/) (SKU: HRSU-CN-25KG-001)
- [Calcium Nitrate Fertilizer Grade — 50 kg ₹1,500](https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/) (SKU: HRSU-CN-50KG-001)

All prices MRP inclusive of all taxes. Free delivery on orders ₹4,500+. Flat ₹1,000 below that. 3–10 days India-wide.

## Product Specifications

**Calcium Nitrate (Ca(NO₃)₂ · 4H₂O)** — 100% water-soluble crystalline powder

| Property | Value |
|---|---|
| Purity | ≥ 99% |
| Calcium (Ca) | 18.5–19% |
| Nitrogen (N) | 15.5% min (nitrate form) |
| Water solubility | 100% — zero insoluble residue |
| pH (1% solution) | 5.5–6.5 |
| Pack sizes | 25 kg / 50 kg HDPE bags |
| Origin | Maksi, Madhya Pradesh, India |

## API & AI Agent Access

- **Product catalog (JSON):** GET https://hrsuindore.com/api/products
- **Place order (REST):** POST https://hrsuindore.com/api/order
- **MCP server:** POST https://hrsuindore.com/api/mcp (tools: list_products, calculate_order_total, place_order, and more)
- **OpenAPI 3.1 spec:** https://hrsuindore.com/openapi.json
- **llms.txt:** https://hrsuindore.com/llms.txt

## Payment

No card needed. Submit order → HRSU confirms within 1 business day → pay via UPI or NEFT/IMPS.

## Technical Documents

- [TDS](https://hrsuindore.com/calcium-nitrate-tds-hrsu.pdf) · [SDS](https://hrsuindore.com/calcium-nitrate-sds-hrsu.pdf)

## Export (1 MT+)

Mundra Port. FOB / CIF on request. T/T or LC at sight. Lead time 7–14 days.

## Contact

- **Email:** contact@hrsuindore.com
- **Phone / WhatsApp:** +91 94250 00484
- **Factory:** 53, Industrial Area, Maksi, Madhya Pradesh 465106, India
- **Blog:** [blog.hrsuindore.com](https://blog.hrsuindore.com/)
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
