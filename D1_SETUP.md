# D1 Database Setup Guide

## Prerequisites
- Node.js v22.0.0 or higher (current environment has v20.14.0)
- npx wrangler CLI

## Setup Steps

### 1. Create D1 Database
Run this command to create the D1 database:
```bash
npx wrangler d1 create hrsu-store
```

This will output something like:
```
✅ Successfully created the D1 database 'hrsu-store'
Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**IMPORTANT:** Copy the `Database ID` (UUID). You'll need this in the next step.

### 2. Update wrangler.jsonc
Open `wrangler.jsonc` and replace `PASTE-UUID-HERE` with the actual UUID from step 1:

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "hrsu-store", "database_id": "YOUR-UUID-HERE" }
]
```

### 3. Apply Database Schema
Run the schema migration to create the `reviews` table:
```bash
npx wrangler d1 execute hrsu-store --local --file=schema.sql
```

Expected output: No error (schema applied silently).

### 4. Test Locally
Start the dev server:
```bash
npx wrangler dev --port 8787 &
sleep 5
```

#### Test POST (submit a review):
```bash
curl -s -X POST http://localhost:8787/api/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "product_id":"HRSU-CN-001",
    "name":"Test User",
    "city":"Indore",
    "rating":5,
    "body":"Dissolves completely, no drip clogging at all."
  }'
```

Expected output: `{"ok":true}`

#### Approve the review (locally):
```bash
npx wrangler d1 execute hrsu-store --local --command "UPDATE reviews SET approved=1 WHERE id=1"
```

#### Test GET (fetch approved reviews):
```bash
curl -s "http://localhost:8787/api/reviews?product_id=HRSU-CN-001" | jq .
```

Expected output: JSON array with one review object.

#### Verify server-side injection:
```bash
curl -s http://localhost:8787/store/calcium-nitrate-fertilizer-grade/ | grep -c "AggregateRating"
curl -s http://localhost:8787/store/calcium-nitrate-fertilizer-grade/ | grep -c "Test User"
```

Both should return `1` (AggregateRating appears once in JSON-LD, "Test User" appears once in review card).

#### Clean up test data:
```bash
npx wrangler d1 execute hrsu-store --local --command "DELETE FROM reviews"
```

### 5. Deploy to Production
When ready to deploy:
```bash
npx wrangler deploy
```

This will deploy the Worker functions and bind the D1 database.

## Files Created

| File | Purpose |
|------|---------|
| `schema.sql` | D1 table definition (reviews) |
| `functions/api/reviews.js` | API endpoints for GET/POST reviews |
| `functions/store/[[path]].js` | Server-side HTMLRewriter to inject approved reviews |
| `wrangler.jsonc` | Updated with D1 binding (requires UUID) |

## API Endpoints

### GET /api/reviews?product_id=HRSU-CN-001
Returns approved reviews as JSON array.

**Query Parameters:**
- `product_id` (required): Product identifier (e.g., "HRSU-CN-001")

**Response:**
```json
[
  {
    "id": 1,
    "name": "Test User",
    "city": "Indore",
    "rating": 5,
    "body": "Dissolves completely, no drip clogging at all.",
    "created_at": "2026-06-13T00:25:00Z"
  }
]
```

### POST /api/reviews
Submit a new review for moderation.

**Request Body:**
```json
{
  "product_id": "HRSU-CN-001",
  "name": "Customer Name",
  "city": "City Name (optional)",
  "rating": 5,
  "body": "Review text",
  "website": "(optional honeypot field)"
}
```

**Validation:**
- `product_id`, `name`, `body` required
- `rating` must be 1-5
- `name` max 100 chars, `body` max 2000 chars
- If `website` field is filled (honeypot), returns success silently (spam detection)

**Response:**
```json
{ "ok": true }
```

## Manual Moderation
To approve a review in the D1 console or CLI:
```bash
npx wrangler d1 execute hrsu-store --command "UPDATE reviews SET approved=1 WHERE id=1"
```

## Notes
- Reviews are stored with `approved=0` by default
- Only approved reviews are visible on the product page
- Server-side rendering injects reviews and AggregateRating JSON-LD
- The product slug (`calcium-nitrate-fertilizer-grade`) maps to `HRSU-CN-001` in the handler
- For additional products, add entries to the `slugToProductId` mapping in `functions/store/[[path]].js`
