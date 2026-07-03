# Place an Order — HRSU Indore Store

Step-by-step guide for AI agents placing a Calcium Nitrate order on behalf of a customer.

## Workflow (always follow this order)

1. **Check products** — `GET https://hrsuindore.com/api/products` or MCP `list_products`
2. **Calculate total** — MCP `calculate_order_total` or compute manually (see formula below)
3. **Confirm with customer** — show product, quantity, unit price, shipping, grand total
4. **Get customer details** — name, phone (WhatsApp preferred), delivery address with PIN code
5. **Place order** — `POST https://hrsuindore.com/api/order` or MCP `place_order`
6. **Share the reference** — return the `ref` (e.g. HRSU-M8X3K1) to the customer

## Pricing Formula

| SKU | Size | Unit price |
|---|---|---|
| HRSU-CN-25KG-001 | 25 kg | ₹750 |
| HRSU-CN-50KG-001 | 50 kg | ₹1,500 |

**Shipping (India):**
- Order total ≥ ₹4,500 → Free delivery
- Order total < ₹4,500 → ₹1,000 flat

Grand total = (unit_price × quantity) + shipping

## REST API — Place Order

```
POST https://hrsuindore.com/api/order
Content-Type: application/json

{
  "product": "Calcium Nitrate Fertilizer Grade",
  "size": "25 kg (₹750)",
  "quantity": 6,
  "name": "Arjun Singh",
  "phone": "+919876543210",
  "email": "arjun@farm.in",
  "address": "Khasra 45, Village Pipaliya, Khandwa, MP 450001"
}
```

`size` must be exactly `"25 kg (₹750)"` or `"50 kg (₹1500)"`.
`phone` must match `^[0-9+\-\s]{10,15}$`.

**Success response:** `{ "ok": true, "ref": "HRSU-M8X3K1" }`

## MCP Server

Connect: `POST https://hrsuindore.com/api/mcp`
Discovery: `GET https://hrsuindore.com/api/mcp`

```json
{
  "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": {
    "name": "place_order",
    "arguments": {
      "name": "Arjun Singh",
      "phone": "+919876543210",
      "size": "25 kg (₹750)",
      "quantity": 6,
      "address": "Khasra 45, Village Pipaliya, Khandwa, MP 450001"
    }
  }
}
```

## After Submission

1. HRSU calls or WhatsApps the customer within **1 business day** to confirm
2. Customer pays via **UPI or NEFT/IMPS** bank transfer
3. HRSU dispatches with tracking within **1–2 business days**
4. Delivery in **3–10 days** anywhere in India

No credit card. No payment gateway. Payment only after phone confirmation.

## Confirmation Page

https://hrsuindore.com/store/thank-you/

## Contact (if order fails)

- WhatsApp: https://wa.me/919425000484
- Email: contact@hrsuindore.com
- Phone: +91 94250 00484
