# Order or Request a Quote

Place a retail order instantly via API, or request a bulk/export quote by email.

## Retail Orders (1 bag and above — no minimum)

Place directly via API:

```
POST https://hrsuindore.com/api/order
Content-Type: application/json

{
  "product": "Calcium Nitrate Fertilizer Grade",
  "size": "25 kg (₹750)",
  "quantity": 6,
  "name": "Customer Name",
  "phone": "+919876543210",
  "email": "customer@example.com",
  "address": "Full address with PIN code"
}
```

Or use the MCP server at `POST https://hrsuindore.com/api/mcp` (tools: `calculate_order_total`, `place_order`).

**No payment at submission.** HRSU confirms by phone/WhatsApp within 1 business day, then customer pays via UPI or bank transfer.

Prices: 25 kg ₹750 · 50 kg ₹1,500. Free delivery on orders ₹4,500+.

## Bulk / Export Quote (1 MT+)

Send email to contact@hrsuindore.com with:

- **Subject:** Quote Request — Calcium Nitrate
- **Quantity** (MT or bags)
- **Pack size:** 25 kg or 50 kg
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
