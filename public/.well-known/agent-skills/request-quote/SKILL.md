# Order or Request a Quote

Place a retail order instantly via API, or request a bulk/export quote by email.

## Retail Orders (1 bag and above — no minimum)

Place directly via API:

```
POST https://hrsuindore.com/api/order
Content-Type: application/json

{
  "product": "Calcium Nitrate Tetrahydrate",
  "size": "25 kg (₹1200)",
  "quantity": 6,
  "name": "Customer Name",
  "phone": "+919876543210",
  "email": "customer@example.com",
  "address": "Full address with PIN code"
}
```

Or use the MCP server at `POST https://hrsuindore.com/api/mcp` (tools: `calculate_order_total`, `place_order`).

**No payment at submission.** HRSU confirms by phone/WhatsApp within 1 business day, then customer pays via UPI or bank transfer.

Prices: 25 kg ₹1,200 · 50 kg ₹2,400. Free delivery on orders ₹14,400+.

## Bulk / Export Quote (container scale; TDS minimum order 10 MT)

Fastest: `POST https://hrsuindore.com/api/quote` with JSON `{"contact": "buyer email or phone", "application": "concrete | wastewater | mining | oil and gas | other", "quantity": "e.g. 1 x 20ft container", "country": "destination"}`. Only `contact` is required. Or book a call: https://calendar.app.google/aQ8ioyAbckEuVqZe6

Or send email to contact@hrsuindore.com with:

- **Subject:** Quote Request — Calcium Nitrate
- **Quantity** (MT or bags)
- **Pack size:** 50 kg woven bags (export standard)
- **Destination port** (for export) or delivery address (domestic)
- **Incoterms preference:** FOB / CIF / DAP
- **Required delivery date**

Quick link: `mailto:contact@hrsuindore.com?subject=Quote%20Request%20%E2%80%94%20Calcium%20Nitrate`

Response within 1 business day (IST, GMT+5:30).

## Online Store

https://hrsuindore.com/store/

## Contact

- Email: contact@hrsuindore.com
- Phone / WhatsApp: +91 94250 00484
- WhatsApp link: https://wa.me/919425000484
