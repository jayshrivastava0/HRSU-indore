// Markdown content for various routes
const MARKDOWN = `# HRSU Indore Pvt. Ltd. — Calcium Nitrate Manufacturer, India

India's precision-grade Calcium Nitrate manufacturer. 100% water-soluble powder. Export-ready from Mundra Port, Gujarat.

## Product

**Calcium Nitrate (Ca(NO₃)₂)** — Technical-grade, 100% water-soluble powder

| Property | Value |
|---|---|
| Purity | ≥ 99% |
| Calcium (CaO) | 26.5% |
| Nitrogen (N) | 15.5% |
| Solubility | Fully water-soluble |
| Pack sizes | 25 kg / 50 kg HDPE bags |
| Export port | Mundra, Gujarat, India |

## Applications

- Industrial wastewater treatment (heavy metals removal)
- Concrete curing & acceleration
- Hydroponics & fertirrigation
- Soil remediation
- Cold-weather construction

## Technical Documents

- [Technical Data Sheet (TDS)](https://hrsuindore.com/calcium-nitrate-tds-hrsu.pdf)
- [Safety Data Sheet / MSDS (SDS)](https://hrsuindore.com/calcium-nitrate-sds-hrsu.pdf)

## Procurement & Export

- Minimum order: 1 MT
- Lead time: 7–14 days ex-factory
- Export ready: Mundra Port (JNPT/Mumbai available on request)
- Certifications: ISO-compliant, Indian Legal Metrology Act compliant
- Payment: T/T, LC at sight

## Online Store

[hrsuindore.com/store](https://hrsuindore.com/store/)

## Contact

- **Email:** contact@hrsuindore.com
- **Phone:** +91 94250 00484
- **Factory:** 53, Industrial Area, Maksi, Madhya Pradesh 465106, India
- **Blog:** [blog.hrsuindore.com](https://blog.hrsuindore.com/)
`;

const STORE_MD = `# HRSU Indore Store — Buy Calcium Nitrate Online

Direct-from-manufacturer store. Prices are MRP inclusive of all taxes.

## Products

### Calcium Nitrate — Fertilizer Grade
- URL: https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/
- 25 kg bag: ₹750 | 50 kg bag: ₹1,500 (₹30/kg)
- 100% water-soluble powder, 18.5–19% Ca, 15.5%+ N, ≥99% purity
- Shipping (India): ₹20 flat, 4–10 days door-to-door
- Payment: UPI / bank transfer after phone confirmation (no card needed)
- Returns: all sales final; damaged/incorrect shipments replaced or refunded (48h claim window)
- TDS: https://hrsuindore.com/calcium-nitrate-tds-hrsu.pdf
- SDS: https://hrsuindore.com/calcium-nitrate-sds-hrsu.pdf

## How to order
1. Submit the order form on the product page, or WhatsApp +91 94250 00484.
2. HRSU confirms by phone within 1 business day.
3. Pay via UPI or bank transfer; goods dispatch with tracking.

## Contact
contact@hrsuindore.com · +91 94250 00484 · 53 Industrial Area, Maksi, MP 465106, India
`;

const MD_ROUTES = {
  '/': MARKDOWN,
  '/index.html': MARKDOWN,
  '/store': STORE_MD,
  '/store/': STORE_MD,
  '/store/calcium-nitrate-fertilizer-grade': STORE_MD,
  '/store/calcium-nitrate-fertilizer-grade/': STORE_MD,
};

export async function onRequest(context) {
  const { request } = context;
  const accept = request.headers.get('Accept') || '';
  const url = new URL(request.url);

  const md = MD_ROUTES[url.pathname];
  if (md && accept.includes('text/markdown')) {
    return new Response(md, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return context.next();
}
