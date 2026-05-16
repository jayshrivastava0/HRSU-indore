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

[store.hrsuindore.com](https://store.hrsuindore.com/)

## Contact

- **Email:** contact@hrsuindore.com
- **Phone:** +91 94250 00484
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
