# HRSU Indore `/store` (Fertilizer-Grade Calcium Nitrate) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch a self-hosted store at `https://hrsuindore.com/store/` selling Fertilizer-Grade Calcium Nitrate (25 kg / 50 kg), fully SEO/GEO/Merchant-Center-optimized, replacing the flagged `store.hrsuindore.com` (GlobalLinker) store so Google Merchant Center can be re-approved.

**Architecture:** Static HTML pages served by the existing Cloudflare Workers static-assets setup (`wrangler.jsonc`, assets dir = repo root) — no framework, no build step, matching the existing site. One folder per page for clean URLs (`/store/`, `/store/calcium-nitrate-fertilizer-grade/`). A single Cloudflare Pages Function (`functions/api/order.js`) receives order-form submissions and emails them via Resend; the client-side fallback is a prefilled WhatsApp order link, so the store works even before Resend is configured. The Google Shopping feed, sitemap, homepage schema, and markdown content-negotiation middleware are all updated to point at the new on-domain URLs.

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Workers static assets + Pages Functions, JSON-LD (ProductGroup/Offer/FAQ/Breadcrumb), Google Tag Manager + GA4, Google Merchant Center feed (existing `google-shopping-feed.xml`), Resend (email).

---

## Why checkout-without-cards works for Merchant Center

Google Merchant Center does **not** require credit-card processing. It requires: (1) a working way to complete a purchase, (2) at least one conventional payment method (bank transfer / UPI / cash-on-delivery all count in India), (3) clearly stated shipping cost, delivery time, return policy, contact info, and business identity on the domain. The plan implements a **"Place Order" form** (name/phone/qty/address → confirmed by phone/WhatsApp → paid by UPI or bank transfer) plus the four policy pages GMC checks for. The likely cause of the previous ban was the GlobalLinker storefront (template misrepresentation signals, third-party CDN, thin pages) — moving everything onto `hrsuindore.com` with consistent NAP (name/address/phone), matching prices everywhere, and real policy pages is the fix.

## Inputs needed from the user (gather before/while executing — none block Tasks 1–8)

1. **Prices.** Feed says ₹750 (25 kg) and ₹1,500 (50 kg) MRP incl. taxes. Homepage JSON-LD says ₹45–52/kg (= ₹1,125–₹1,300 per 25 kg) — these **contradict**, and GMC compares page price vs feed price vs structured data and disapproves on mismatch. This plan standardizes on **₹750 / ₹1,500 everywhere** (feed is the GMC source of truth). Confirm with user; if prices change, change them in: product page HTML + its JSON-LD, store landing card, feed, homepage Product schema.
2. **GTM container ID** (`GTM-XXXXXXX`) and GA4 property — created in Task 9 (browser, needs user's Google login).
3. **Resend API key** — Task 6 (needs DNS verification of hrsuindore.com in Resend; user-assisted). Store still launches without it (WhatsApp fallback).
4. **Reviews.** Per user: customers should be able to LEAVE reviews on the site (not static testimonials). Task 4b builds this: review form → D1 database → moderated (approved manually) → server-rendered into the page + AggregateRating JSON-LD. This is the legitimate pattern for Google review-snippet stars ("reviews collected on your own site"). Never seed fake reviews — moderation exists so only genuine customer reviews go live. Optionally ask 2–3 past WhatsApp customers to submit the first reviews after launch.
5. **UPI ID / bank details** for the payment-instructions block on the order confirmation (Task 4 uses placeholders `UPI: hrsuindore@PLACEHOLDER` — must be replaced before deploy or the block removed).

---

## File structure

```
store/
  index.html                                  # store landing: product grid, CollectionPage schema
  calcium-nitrate-fertilizer-grade/index.html # product page: specs, order form, reviews, FAQ, ProductGroup schema
  shipping-policy/index.html                  # GMC-required
  returns-policy/index.html                   # GMC-required (no-returns must still be STATED)
  terms/index.html                            # GMC-required
  privacy/index.html                          # GMC-required
css/store.css                                 # shared store styles (minimal, functional)
js/store.js                                   # order form + review form submit + dataLayer events + WhatsApp fallback
images/calcium-nitrate-25kg.jpeg              # product image hosted ON OUR DOMAIN (off linker-cdn)
functions/api/order.js                        # POST order → Resend email (graceful 503 w/o key)
functions/api/reviews.js                      # GET approved reviews / POST new review (D1, moderated)
functions/store/[[path]].js                   # HTMLRewriter: inject approved reviews + AggregateRating into product page
schema.sql                                    # D1 table for reviews
llms.txt                                      # GEO: site summary for AI crawlers
Modified: wrangler.jsonc (D1 binding), sitemap.xml, _headers, functions/_middleware.js,
          google-shopping-feed.xml, index.html (nav links + Product schema prices/URLs)
```

**Adding a product later** = copy `store/calcium-nitrate-fertilizer-grade/` to a new slug, edit content + JSON-LD, add a card to `store/index.html`, an `<item>` to the feed, a `<url>` to the sitemap, and a markdown entry to `_middleware.js`. Document this in a comment at the top of the product page (Task 4 includes it).

---

### Task 1: Product image on our own domain

The feed currently uses `https://lsmedia.linker-cdn.net/1051955/2026/14878524.jpeg` — third-party CDN tied to the flagged store. GMC image_link should live on our domain.

**Files:**
- Create: `images/calcium-nitrate-25kg.jpeg`

- [ ] **Step 1: Download the existing product image**

```bash
mkdir -p images
curl -fL "https://lsmedia.linker-cdn.net/1051955/2026/14878524.jpeg" -o images/calcium-nitrate-25kg.jpeg
```

- [ ] **Step 2: Verify it's a real image (not an error page)**

```bash
file images/calcium-nitrate-25kg.jpeg && ls -la images/
```
Expected: `JPEG image data`, size > 20 KB. If the CDN blocks the download (403/expired), STOP and ask the user for a product photo — do not ship a broken image.

- [ ] **Step 3: Commit**

```bash
git add images/calcium-nitrate-25kg.jpeg
git commit -m "feat(store): host product image on own domain"
```

---

### Task 2: Shared store CSS and JS

**Files:**
- Create: `css/store.css`
- Create: `js/store.js`

- [ ] **Step 1: Create `css/store.css`**

Minimal, functional, reuses the site's navy/gold palette (`#0a192f` theme color from index.html). Not pretty by design — user will restyle later.

```css
/* store.css — shared styles for /store pages. Palette matches main site. */
:root { --navy:#0a192f; --gold:#c9a227; --ink:#1b2430; --bg:#f7f8fa; --line:#e3e7ee; }
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'DM Sans',system-ui,sans-serif; color:var(--ink); background:var(--bg); line-height:1.6; }
a { color:var(--navy); }
.store-nav { display:flex; justify-content:space-between; align-items:center; padding:14px 24px; background:var(--navy); color:#fff; }
.store-nav a { color:#fff; text-decoration:none; margin-left:18px; }
.store-nav .brand { font-weight:700; letter-spacing:.05em; }
.wrap { max-width:980px; margin:0 auto; padding:32px 20px; }
h1 { font-size:1.9rem; line-height:1.25; margin-bottom:8px; }
h2 { font-size:1.3rem; margin:28px 0 10px; }
.crumbs { font-size:.85rem; color:#5b6573; margin-bottom:18px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:20px; }
.card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:18px; }
.card img { width:100%; height:200px; object-fit:contain; background:#fff; }
.price { font-size:1.3rem; font-weight:700; color:var(--navy); }
.price small { font-weight:400; color:#5b6573; }
.btn { display:inline-block; background:var(--gold); color:var(--navy); font-weight:700; padding:12px 22px; border:none; border-radius:6px; cursor:pointer; text-decoration:none; font-size:1rem; }
.btn-wa { background:#25d366; color:#fff; }
table.specs { width:100%; border-collapse:collapse; background:#fff; }
table.specs th, table.specs td { text-align:left; padding:9px 12px; border:1px solid var(--line); font-size:.95rem; }
table.specs th { background:#eef1f6; width:45%; }
form.order label { display:block; font-weight:600; margin:14px 0 4px; }
form.order input, form.order select, form.order textarea { width:100%; padding:10px; border:1px solid var(--line); border-radius:6px; font:inherit; }
form.order .hp { position:absolute; left:-9999px; }   /* honeypot */
.notice { background:#fff8e6; border:1px solid #f0dba0; border-radius:8px; padding:14px 16px; margin:16px 0; font-size:.95rem; }
.ok { background:#e8f7ee; border-color:#bfe7cf; }
.err { background:#fdecec; border-color:#f3bcbc; }
.store-footer { margin-top:48px; padding:28px 24px; background:var(--navy); color:#cdd6e4; font-size:.9rem; }
.store-footer a { color:#fff; }
.policy-links a { margin-right:14px; }
details { background:#fff; border:1px solid var(--line); border-radius:8px; padding:12px 16px; margin-bottom:10px; }
details summary { font-weight:600; cursor:pointer; }
@media (max-width:640px){ .store-nav a{margin-left:10px;font-size:.9rem} }
```

- [ ] **Step 2: Create `js/store.js`**

Handles: order form POST to `/api/order`, WhatsApp fallback if the API is unavailable, GTM dataLayer events.

```js
// store.js — order form + analytics for /store pages
window.dataLayer = window.dataLayer || [];

// Fire view_item on product pages (page declares window.HRSU_PRODUCT)
if (window.HRSU_PRODUCT) {
  dataLayer.push({
    event: 'view_item',
    ecommerce: { currency: 'INR', items: [window.HRSU_PRODUCT] }
  });
}

function waOrderLink(d) {
  var msg = 'Order — HRSU Indore\nProduct: ' + d.product +
    '\nSize: ' + d.size + '\nQty (bags): ' + d.quantity +
    '\nName: ' + d.name + '\nPhone: ' + d.phone +
    (d.email ? '\nEmail: ' + d.email : '') +
    (d.address ? '\nAddress: ' + d.address : '');
  return 'https://wa.me/919425000484?text=' + encodeURIComponent(msg);
}

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('order-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = Object.fromEntries(new FormData(form).entries());
    var status = document.getElementById('order-status');
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Placing order…';

    dataLayer.push({
      event: 'begin_checkout',
      ecommerce: { currency: 'INR', items: [window.HRSU_PRODUCT] }
    });

    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'failed');
        form.hidden = true;
        status.className = 'notice ok';
        status.innerHTML = '<strong>Order received ✓</strong> We will call/WhatsApp you within 1 business day to confirm payment (UPI / bank transfer) and dispatch. Order ref: ' + (res.j.ref || '—');
        dataLayer.push({ event: 'purchase_intent', value: Number(d.quantity || 1), currency: 'INR' });
      })
      .catch(function () {
        // API down or Resend not configured — fall back to WhatsApp
        status.className = 'notice';
        status.innerHTML = 'Our order system is busy — tap below to place the same order on WhatsApp:<br><br><a class="btn btn-wa" target="_blank" rel="noopener" href="' + waOrderLink(d) + '">Order on WhatsApp →</a>';
        btn.disabled = false; btn.textContent = 'Place Order';
      });
  });
});

// Review form — POST to /api/reviews, goes to moderation queue
document.addEventListener('DOMContentLoaded', function () {
  var rform = document.getElementById('review-form');
  if (!rform) return;
  rform.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = Object.fromEntries(new FormData(rform).entries());
    var status = document.getElementById('review-status');
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(function (r) {
      if (!r.ok) throw new Error('failed');
      rform.hidden = true;
      status.hidden = false;
      status.className = 'notice ok';
      status.textContent = 'Thank you! Your review has been submitted and will appear after moderation.';
      dataLayer.push({ event: 'submit_review', rating: Number(d.rating) });
    }).catch(function () {
      status.hidden = false;
      status.className = 'notice err';
      status.textContent = 'Could not submit your review right now. Please try again later or WhatsApp us at +91 94250 00484.';
    });
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add css/store.css js/store.js
git commit -m "feat(store): shared store styles and order-form script"
```

---

### Task 3: Store landing page `/store/`

**Files:**
- Create: `store/index.html`

- [ ] **Step 1: Create `store/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Buy Calcium Nitrate Online India | HRSU Indore Store</title>
<meta name="description" content="Buy fertilizer-grade Calcium Nitrate powder directly from the manufacturer. 100% water-soluble, 25 kg ₹750 / 50 kg ₹1,500 MRP incl. taxes. Pan-India delivery 4–10 days. HRSU Indore Pvt. Ltd., Madhya Pradesh.">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="https://hrsuindore.com/store/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="HRSU Indore Pvt. Ltd.">
<meta property="og:title" content="HRSU Indore Store — Buy Calcium Nitrate Direct from Manufacturer">
<meta property="og:description" content="Fertilizer-grade Calcium Nitrate, 100% water-soluble. 25 kg / 50 kg bags. Pan-India delivery.">
<meta property="og:url" content="https://hrsuindore.com/store/">
<meta property="og:image" content="https://hrsuindore.com/images/calcium-nitrate-25kg.jpeg">
<link rel="icon" type="image/png" href="/Logo.png">
<meta name="theme-color" content="#0a192f">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/store.css">
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://hrsuindore.com/store/#page",
  "name": "HRSU Indore Online Store",
  "url": "https://hrsuindore.com/store/",
  "isPartOf": { "@id": "https://hrsuindore.com/#organization" },
  "mainEntity": {
    "@type": "ItemList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "url": "https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/" }
    ]
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hrsuindore.com/" },
      { "@type": "ListItem", "position": 2, "name": "Store", "item": "https://hrsuindore.com/store/" }
    ]
  }
}
</script>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

<nav class="store-nav">
  <a class="brand" href="/">HRSU Indore</a>
  <span>
    <a href="/store/">Store</a>
    <a href="/#contact">Contact</a>
    <a href="https://wa.me/919425000484" rel="noopener">WhatsApp</a>
  </span>
</nav>

<main class="wrap">
  <p class="crumbs"><a href="/">Home</a> › Store</p>
  <h1>HRSU Indore Online Store</h1>
  <p>Buy direct from the manufacturer. All prices are MRP inclusive of all taxes (Indian Legal Metrology Act). Pan-India delivery in 4–10 days.</p>

  <div class="grid" style="margin-top:24px">
    <article class="card">
      <a href="/store/calcium-nitrate-fertilizer-grade/">
        <img src="/images/calcium-nitrate-25kg.jpeg" alt="Calcium Nitrate Fertilizer Grade powder 25 kg bag — HRSU Indore" width="300" height="200" loading="lazy">
      </a>
      <h2 style="margin-top:10px"><a href="/store/calcium-nitrate-fertilizer-grade/">Calcium Nitrate — Fertilizer Grade</a></h2>
      <p>100% water-soluble crystalline powder. 18.5–19% Ca, 15.5%+ N. Drip, foliar, hydroponics.</p>
      <p class="price">₹750 <small>/ 25 kg</small> &nbsp;·&nbsp; ₹1,500 <small>/ 50 kg</small></p>
      <p style="margin-top:12px"><a class="btn" href="/store/calcium-nitrate-fertilizer-grade/">View &amp; Order →</a></p>
    </article>
    <!-- ADD FUTURE PRODUCTS HERE: copy the <article class="card"> block above -->
  </div>
</main>

<footer class="store-footer">
  <div class="wrap" style="padding:0 0">
    <p><strong>HRSU Indore Pvt. Ltd.</strong> · 53, Industrial Area, Maksi, Madhya Pradesh 465106, India</p>
    <p><a href="mailto:contact@hrsuindore.com">contact@hrsuindore.com</a> · <a href="tel:+919425000484">+91 94250 00484</a></p>
    <p class="policy-links" style="margin-top:10px">
      <a href="/store/shipping-policy/">Shipping Policy</a>
      <a href="/store/returns-policy/">Returns Policy</a>
      <a href="/store/terms/">Terms of Sale</a>
      <a href="/store/privacy/">Privacy Policy</a>
    </p>
  </div>
</footer>
<script src="/js/store.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Verify locally**

```bash
npx wrangler dev --port 8787 &
sleep 5
curl -s http://localhost:8787/store/ | grep -c "CollectionPage"
```
Expected: `1`. Also open http://localhost:8787/store/ in a browser and confirm the card renders with the image.

- [ ] **Step 3: Commit**

```bash
git add store/index.html
git commit -m "feat(store): store landing page with CollectionPage schema"
```

---

### Task 4: Product page `/store/calcium-nitrate-fertilizer-grade/`

The page GMC's crawler will land on. Price/title/availability/image MUST match the feed exactly. Specs come from the TDS (≥99% purity, 18.5–19% Ca, 15.5%+ N, 100% soluble, pH 5.5–6.5).

**Files:**
- Create: `store/calcium-nitrate-fertilizer-grade/index.html`

- [ ] **Step 1: Create the page**

```html
<!DOCTYPE html>
<!--
  TEMPLATE NOTE — to add a new product:
  1. Copy this folder to store/<new-slug>/, edit title/desc/specs/prices/SKUs.
  2. Update the JSON-LD ProductGroup (productGroupID, variants, SKUs, prices).
  3. Add a card to store/index.html, an <item> to google-shopping-feed.xml,
     a <url> to sitemap.xml, and a markdown entry in functions/_middleware.js.
-->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Calcium Nitrate Fertilizer Grade 25kg ₹750 / 50kg ₹1500 | Buy Online — HRSU Indore</title>
<meta name="description" content="Fertilizer-grade Calcium Nitrate powder by HRSU Indore. 100% water-soluble, zero residue — no drip clogging. 18.5–19% Ca, 15.5%+ N. 25 kg ₹750, 50 kg ₹1,500 MRP incl. taxes. Pan-India delivery 4–10 days. CoA with every batch.">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/">
<meta property="og:type" content="product">
<meta property="og:site_name" content="HRSU Indore Pvt. Ltd.">
<meta property="og:title" content="Calcium Nitrate Fertilizer Grade — 100% Soluble | HRSU Indore">
<meta property="og:description" content="25 kg ₹750 · 50 kg ₹1,500 (MRP incl. taxes). 100% water-soluble powder for drip, foliar and hydroponics. Direct from manufacturer.">
<meta property="og:url" content="https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/">
<meta property="og:image" content="https://hrsuindore.com/images/calcium-nitrate-25kg.jpeg">
<meta property="product:price:amount" content="750.00">
<meta property="product:price:currency" content="INR">
<link rel="icon" type="image/png" href="/Logo.png">
<meta name="theme-color" content="#0a192f">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/store.css">
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
<script type="application/ld+json">
[
{
  "@context": "https://schema.org",
  "@type": "ProductGroup",
  "@id": "https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/#productgroup",
  "productGroupID": "HRSU-CN-001",
  "name": "Calcium Nitrate — Fertilizer Grade (HRSU Indore)",
  "description": "Fertilizer-grade Calcium Nitrate in fine crystalline powder form. 100% water-soluble with zero insoluble residue. 18.5–19% Calcium (Ca), 15.5%+ Nitrogen (N). For drip irrigation, foliar spray, fertigation and hydroponics (Part-A). Certificate of Analysis with every batch.",
  "url": "https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/",
  "brand": { "@type": "Brand", "name": "HRSU Indore" },
  "image": "https://hrsuindore.com/images/calcium-nitrate-25kg.jpeg",
  "variesBy": ["https://schema.org/size"],
  "hasVariant": [
    {
      "@type": "Product",
      "sku": "HRSU-CN-25KG-001",
      "mpn": "HRSU-CN-25KG-001",
      "name": "Calcium Nitrate Fertilizer Grade — 25 kg Bag",
      "image": "https://hrsuindore.com/images/calcium-nitrate-25kg.jpeg",
      "size": "25 kg",
      "color": "White",
      "material": "Calcium Nitrate Tetrahydrate",
      "countryOfOrigin": "IN",
      "offers": {
        "@type": "Offer",
        "url": "https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/",
        "price": "750.00",
        "priceCurrency": "INR",
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition",
        "priceValidUntil": "2026-12-31",
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "IN",
          "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": { "@type": "MonetaryAmount", "value": "20.00", "currency": "INR" },
          "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "IN" },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 2, "unitCode": "DAY" },
            "transitTime": { "@type": "QuantitativeValue", "minValue": 2, "maxValue": 8, "unitCode": "DAY" }
          }
        },
        "seller": { "@type": "Organization", "name": "HRSU Indore Pvt. Ltd.", "@id": "https://hrsuindore.com/#organization" }
      }
    },
    {
      "@type": "Product",
      "sku": "HRSU-CN-50KG-001",
      "mpn": "HRSU-CN-50KG-001",
      "name": "Calcium Nitrate Fertilizer Grade — 50 kg Bag",
      "image": "https://hrsuindore.com/images/calcium-nitrate-25kg.jpeg",
      "size": "50 kg",
      "color": "White",
      "material": "Calcium Nitrate Tetrahydrate",
      "countryOfOrigin": "IN",
      "offers": {
        "@type": "Offer",
        "url": "https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/",
        "price": "1500.00",
        "priceCurrency": "INR",
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition",
        "priceValidUntil": "2026-12-31",
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "IN",
          "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": { "@type": "MonetaryAmount", "value": "20.00", "currency": "INR" },
          "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "IN" },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 2, "unitCode": "DAY" },
            "transitTime": { "@type": "QuantitativeValue", "minValue": 2, "maxValue": 8, "unitCode": "DAY" }
          }
        },
        "seller": { "@type": "Organization", "name": "HRSU Indore Pvt. Ltd.", "@id": "https://hrsuindore.com/#organization" }
      }
    }
  ]
},
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hrsuindore.com/" },
    { "@type": "ListItem", "position": 2, "name": "Store", "item": "https://hrsuindore.com/store/" },
    { "@type": "ListItem", "position": 3, "name": "Calcium Nitrate Fertilizer Grade", "item": "https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/" }
  ]
},
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "How do I pay without a card?", "acceptedAnswer": { "@type": "Answer", "text": "Place your order using the form or WhatsApp. We confirm by phone within 1 business day, then you pay via UPI or bank transfer (NEFT/IMPS). Goods dispatch after payment confirmation." } },
    { "@type": "Question", "name": "What is the dosage for drip irrigation?", "acceptedAnswer": { "@type": "Answer", "text": "Typical fertigation dose is 2–5 kg per acre per application depending on crop and stage. It dissolves 100% with zero residue, so it will not clog drip emitters. Refer to the TDS or consult your agronomist." } },
    { "@type": "Question", "name": "Is a Certificate of Analysis provided?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, every batch ships with a Certificate of Analysis. The TDS and SDS are available as PDFs on hrsuindore.com." } },
    { "@type": "Question", "name": "How fast is delivery in India?", "acceptedAnswer": { "@type": "Answer", "text": "Orders are handed to the courier within 1–2 business days and delivered in 2–8 days — 4–10 days door-to-door, anywhere in India. Shipping is ₹20 flat for bags over 5 kg." } },
    { "@type": "Question", "name": "Can I order in bulk (1 MT and above)?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. For orders of 1 metric tonne or more, contact us at contact@hrsuindore.com or +91 94250 00484 for ex-factory bulk pricing and export documentation." } }
  ]
}
]
</script>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

<nav class="store-nav">
  <a class="brand" href="/">HRSU Indore</a>
  <span>
    <a href="/store/">Store</a>
    <a href="/#contact">Contact</a>
    <a href="https://wa.me/919425000484" rel="noopener">WhatsApp</a>
  </span>
</nav>

<main class="wrap">
  <p class="crumbs"><a href="/">Home</a> › <a href="/store/">Store</a> › Calcium Nitrate Fertilizer Grade</p>

  <div class="grid" style="grid-template-columns:1fr 1.2fr;gap:32px">
    <div>
      <img src="/images/calcium-nitrate-25kg.jpeg" alt="HRSU Indore Calcium Nitrate Fertilizer Grade — 25 kg HDPE bag, white crystalline powder" width="460" height="380" style="width:100%;background:#fff;border:1px solid var(--line);border-radius:10px">
    </div>
    <div>
      <h1>Calcium Nitrate — Fertilizer Grade</h1>
      <p>Ca(NO₃)₂ · 100% water-soluble crystalline powder · zero insoluble residue. Direct from the manufacturer in Maksi, Madhya Pradesh. Certificate of Analysis with every batch.</p>
      <p class="price" style="margin:14px 0">₹750 <small>/ 25 kg bag</small> &nbsp;·&nbsp; ₹1,500 <small>/ 50 kg bag</small><br><small>MRP inclusive of all taxes · ₹30/kg</small></p>
      <p><strong>Shipping:</strong> ₹20 flat, anywhere in India, 4–10 days. <a href="/store/shipping-policy/">Details</a></p>
      <p style="margin-top:18px">
        <a class="btn" href="#order">Place Order ↓</a>
        <a class="btn btn-wa" style="margin-left:8px" target="_blank" rel="noopener" href="https://wa.me/919425000484?text=Hello%20HRSU%20Indore%2C%20I%20want%20to%20order%20Calcium%20Nitrate%20Fertilizer%20Grade.">Order on WhatsApp</a>
      </p>
      <p style="margin-top:14px;font-size:.9rem">
        <a href="/calcium-nitrate-tds-hrsu.pdf">Technical Data Sheet (TDS)</a> ·
        <a href="/calcium-nitrate-sds-hrsu.pdf">Safety Data Sheet (SDS)</a>
      </p>
    </div>
  </div>

  <h2 id="specs">Specifications</h2>
  <table class="specs">
    <tr><th>Grade</th><td>Fertilizer grade (fertigation / foliar / hydroponics)</td></tr>
    <tr><th>Form</th><td>Fine crystalline powder, white</td></tr>
    <tr><th>Purity</th><td>≥ 99%</td></tr>
    <tr><th>Calcium (Ca)</th><td>18.5 – 19%</td></tr>
    <tr><th>Nitrogen (N)</th><td>15.5% min (nitrate form)</td></tr>
    <tr><th>Water solubility</th><td>100% — zero insoluble residue</td></tr>
    <tr><th>pH (1% solution)</th><td>5.5 – 6.5</td></tr>
    <tr><th>Pack sizes</th><td>25 kg / 50 kg HDPE bags</td></tr>
    <tr><th>Origin</th><td>Maksi, Madhya Pradesh, India</td></tr>
  </table>

  <h2>Applications</h2>
  <p>Drip irrigation and fertigation (no emitter clogging), foliar spray for blossom-end-rot and tip-burn prevention, hydroponics Part-A formulations, and soil application for calcium-deficient crops — tomato, capsicum, banana, grapes, pomegranate, apple, leafy greens.</p>

  <h2 id="order">Place Your Order</h2>
  <div class="notice">No card needed. Submit the form → we confirm by phone/WhatsApp within 1 business day → pay by <strong>UPI or bank transfer</strong> → we dispatch with tracking. <!-- REPLACE BEFORE DEPLOY: UPI: hrsuindore@PLACEHOLDER --></div>
  <div id="order-status" hidden></div>
  <form class="order" id="order-form" style="max-width:560px">
    <input type="hidden" name="product" value="Calcium Nitrate Fertilizer Grade">
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label for="of-size">Bag size</label>
    <select id="of-size" name="size" required>
      <option value="25 kg (₹750)">25 kg — ₹750</option>
      <option value="50 kg (₹1500)">50 kg — ₹1,500</option>
    </select>
    <label for="of-qty">Quantity (bags)</label>
    <input id="of-qty" name="quantity" type="number" min="1" max="500" value="1" required>
    <label for="of-name">Full name</label>
    <input id="of-name" name="name" type="text" required maxlength="100">
    <label for="of-phone">Phone (WhatsApp preferred)</label>
    <input id="of-phone" name="phone" type="tel" required pattern="[0-9+\-\s]{10,15}">
    <label for="of-email">Email (optional)</label>
    <input id="of-email" name="email" type="email" maxlength="100">
    <label for="of-address">Delivery address with PIN code</label>
    <textarea id="of-address" name="address" rows="3" required maxlength="500"></textarea>
    <p style="margin-top:16px"><button class="btn" type="submit">Place Order</button></p>
  </form>

  <h2>Customer Reviews</h2>
  <!-- Approved reviews + AggregateRating JSON-LD are injected server-side here
       by functions/store/[[path]].js (Task 4b). Empty until first approved review. -->
  <div id="reviews-list"><p id="reviews-empty">No reviews yet — be the first to review this product.</p></div>

  <h2>Write a Review</h2>
  <p style="font-size:.9rem;color:#5b6573">Reviews are moderated; only genuine customer reviews are published.</p>
  <div id="review-status" hidden></div>
  <form class="order" id="review-form" style="max-width:560px">
    <input type="hidden" name="product_id" value="HRSU-CN-001">
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label for="rf-name">Your name</label>
    <input id="rf-name" name="name" type="text" required maxlength="80">
    <label for="rf-city">City (optional)</label>
    <input id="rf-city" name="city" type="text" maxlength="80">
    <label for="rf-rating">Rating</label>
    <select id="rf-rating" name="rating" required>
      <option value="5">★★★★★ — Excellent</option>
      <option value="4">★★★★ — Good</option>
      <option value="3">★★★ — Average</option>
      <option value="2">★★ — Poor</option>
      <option value="1">★ — Bad</option>
    </select>
    <label for="rf-body">Your review</label>
    <textarea id="rf-body" name="body" rows="4" required minlength="10" maxlength="1000"></textarea>
    <p style="margin-top:16px"><button class="btn" type="submit">Submit Review</button></p>
  </form>

  <h2>Frequently Asked Questions</h2>
  <details><summary>How do I pay without a card?</summary><p>Place your order using the form or WhatsApp. We confirm by phone within 1 business day, then you pay via UPI or bank transfer (NEFT/IMPS). Goods dispatch after payment confirmation.</p></details>
  <details><summary>What is the dosage for drip irrigation?</summary><p>Typical fertigation dose is 2–5 kg per acre per application depending on crop and stage. Zero residue means no drip emitter clogging. See the TDS or consult your agronomist.</p></details>
  <details><summary>Is a Certificate of Analysis provided?</summary><p>Yes — every batch ships with a CoA. TDS and SDS PDFs are linked above.</p></details>
  <details><summary>How fast is delivery in India?</summary><p>Dispatch in 1–2 business days, delivery in 2–8 days — 4–10 days door-to-door. ₹20 flat shipping.</p></details>
  <details><summary>Can I order in bulk (1 MT+)?</summary><p>Yes — email contact@hrsuindore.com or call +91 94250 00484 for ex-factory bulk and export pricing.</p></details>
</main>

<footer class="store-footer">
  <div class="wrap" style="padding:0 0">
    <p><strong>HRSU Indore Pvt. Ltd.</strong> · 53, Industrial Area, Maksi, Madhya Pradesh 465106, India</p>
    <p><a href="mailto:contact@hrsuindore.com">contact@hrsuindore.com</a> · <a href="tel:+919425000484">+91 94250 00484</a></p>
    <p class="policy-links" style="margin-top:10px">
      <a href="/store/shipping-policy/">Shipping Policy</a>
      <a href="/store/returns-policy/">Returns Policy</a>
      <a href="/store/terms/">Terms of Sale</a>
      <a href="/store/privacy/">Privacy Policy</a>
    </p>
  </div>
</footer>
<script>
window.HRSU_PRODUCT = { item_id: 'HRSU-CN-25KG-001', item_name: 'Calcium Nitrate Fertilizer Grade', item_brand: 'HRSU Indore', price: 750, quantity: 1 };
</script>
<script src="/js/store.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Verify locally**

```bash
curl -s http://localhost:8787/store/calcium-nitrate-fertilizer-grade/ | grep -c "ProductGroup"
curl -s http://localhost:8787/store/calcium-nitrate-fertilizer-grade/ | grep -c '"price": "750.00"'
```
Expected: `1` and `1`. In a browser, confirm the order form renders and submitting with the dev server (no Resend) shows the WhatsApp fallback button.

- [ ] **Step 3: Validate the JSON-LD parses**

```bash
curl -s http://localhost:8787/store/calcium-nitrate-fertilizer-grade/ | python -c "
import sys, re, json
html = sys.stdin.read()
for m in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', html, re.S):
    json.loads(m); print('JSON-LD OK')
"
```
Expected: `JSON-LD OK`. (After deploy, also run the page URL through https://search.google.com/test/rich-results — Task 10.)

- [ ] **Step 4: Commit**

```bash
git add store/calcium-nitrate-fertilizer-grade/index.html
git commit -m "feat(store): fertilizer-grade product page with ProductGroup schema and order form"
```

---

### Task 4b: Customer reviews system (D1 + API + server-side injection)

Customers leave reviews via the form on the product page → stored in Cloudflare D1 with `approved = 0` → user approves genuine ones with a one-line wrangler command → approved reviews are server-rendered into the product page HTML along with `AggregateRating`/`Review` JSON-LD (so Google sees them without JS = review stars in search; AI engines see them in raw HTML = GEO).

**Files:**
- Create: `schema.sql`
- Create: `functions/api/reviews.js`
- Create: `functions/store/[[path]].js`
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Create `schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id, approved);
```

- [ ] **Step 2: Create the D1 database and apply schema**

```bash
npx wrangler d1 create hrsu-store
npx wrangler d1 execute hrsu-store --remote --file=schema.sql
npx wrangler d1 execute hrsu-store --local --file=schema.sql
```
Expected: first command prints a `database_id` UUID — copy it for step 3.

- [ ] **Step 3: Add the D1 binding to `wrangler.jsonc`**

Add this top-level key (keep everything else unchanged; paste the real UUID):

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "hrsu-store", "database_id": "PASTE-UUID-HERE" }
]
```

- [ ] **Step 4: Create `functions/api/reviews.js`**

```js
// GET  /api/reviews?product_id=HRSU-CN-001 → approved reviews JSON
// POST /api/reviews → insert with approved=0 (moderation queue)
// Moderate: npx wrangler d1 execute hrsu-store --remote \
//   --command "SELECT id,name,rating,body FROM reviews WHERE approved=0"
// Approve:  ... --command "UPDATE reviews SET approved=1 WHERE id=N"
// Reject:   ... --command "DELETE FROM reviews WHERE id=N"

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet({ request, env }) {
  const pid = new URL(request.url).searchParams.get('product_id') || 'HRSU-CN-001';
  const { results } = await env.DB.prepare(
    'SELECT name, city, rating, body, created_at FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY created_at DESC LIMIT 50'
  ).bind(pid).all();
  return json({ reviews: results });
}

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  if (d.website) return json({ ok: true }); // honeypot

  const rating = Number(d.rating);
  if (!d.name || !d.body || !d.product_id) return json({ error: 'Missing fields' }, 400);
  if (String(d.name).length > 80 || String(d.body).length > 1000 || String(d.city || '').length > 80)
    return json({ error: 'Field too long' }, 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: 'Invalid rating' }, 400);

  await env.DB.prepare(
    'INSERT INTO reviews (product_id, name, city, rating, body) VALUES (?, ?, ?, ?, ?)'
  ).bind(String(d.product_id), String(d.name), String(d.city || ''), rating, String(d.body)).run();

  return json({ ok: true }, 201);
}
```

- [ ] **Step 5: Create `functions/store/[[path]].js`** — injects approved reviews server-side

```js
// Server-renders approved reviews + AggregateRating JSON-LD into product pages.
// Runs for all /store/* requests; only acts on pages containing #reviews-list.

const PRODUCT_IDS = {
  '/store/calcium-nitrate-fertilizer-grade/': 'HRSU-CN-001',
};

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequest(context) {
  const { request, env, next } = context;
  const res = await next();
  const url = new URL(request.url);
  const pid = PRODUCT_IDS[url.pathname];
  if (!pid || !env.DB || !(res.headers.get('Content-Type') || '').includes('text/html')) return res;

  const { results } = await env.DB.prepare(
    'SELECT name, city, rating, body, created_at FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY created_at DESC LIMIT 50'
  ).bind(pid).all();

  if (!results.length) return res;

  const avg = (results.reduce((s, r) => s + r.rating, 0) / results.length).toFixed(1);

  const cardsHtml = results.map((r) =>
    `<div class="card" style="margin-bottom:12px"><p>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</p><p>"${esc(r.body)}"</p><p><strong>${esc(r.name)}</strong>${r.city ? ', ' + esc(r.city) : ''} · ${esc(r.created_at.slice(0, 10))}</p></div>`
  ).join('');

  const ldJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url.origin + url.pathname + '#reviews',
    name: 'Calcium Nitrate — Fertilizer Grade (HRSU Indore)',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: avg, reviewCount: String(results.length), bestRating: '5' },
    review: results.slice(0, 10).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      reviewRating: { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5' },
      reviewBody: r.body,
      datePublished: r.created_at.slice(0, 10),
    })),
  });

  return new HTMLRewriter()
    .on('#reviews-list', { element(el) { el.setInnerContent(cardsHtml, { html: true }); } })
    .on('head', { element(el) { el.append(`<script type="application/ld+json">${ldJson}</script>`, { html: true }); } })
    .transform(res);
}
```

Note: Google requires `aggregateRating` to be attached to a `Product` entity. Injecting it as a separate small Product node with the same name works, but the cleaner long-term move is merging it into the page's ProductGroup — acceptable to defer; verify with the Rich Results test in Task 10 and adjust if it reports "rating not attached."

- [ ] **Step 6: Test locally**

```bash
# submit a review
curl -s -X POST http://localhost:8787/api/reviews -H "Content-Type: application/json" \
  -d '{"product_id":"HRSU-CN-001","name":"Test User","city":"Indore","rating":5,"body":"Dissolves completely, no drip clogging at all."}'
# approve it (local D1)
npx wrangler d1 execute hrsu-store --local --command "UPDATE reviews SET approved=1 WHERE id=1"
# verify injection
curl -s http://localhost:8787/store/calcium-nitrate-fertilizer-grade/ | grep -c "AggregateRating"
curl -s http://localhost:8787/store/calcium-nitrate-fertilizer-grade/ | grep -c "Test User"
```
Expected: POST returns `{"ok":true}`; both greps print `1`. Then delete the test review: `npx wrangler d1 execute hrsu-store --local --command "DELETE FROM reviews"`.

- [ ] **Step 7: Commit**

```bash
git add schema.sql functions/api/reviews.js "functions/store/[[path]].js" wrangler.jsonc
git commit -m "feat(store): moderated customer reviews with D1 and server-rendered AggregateRating"
```

---

### Task 5: GMC-required policy pages

GMC's review explicitly checks for shipping, returns, terms, and privacy pages on the domain. "No returns" is allowed but must be clearly stated. All four pages share the same skeleton — full content below for each.

**Files:**
- Create: `store/shipping-policy/index.html`
- Create: `store/returns-policy/index.html`
- Create: `store/terms/index.html`
- Create: `store/privacy/index.html`

- [ ] **Step 1: Create the shared skeleton and all four pages**

Each page uses this exact skeleton (swap `{{TITLE}}`, `{{SLUG}}`, `{{BODY}}`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}} | HRSU Indore Store</title>
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://hrsuindore.com/store/{{SLUG}}/">
<link rel="icon" type="image/png" href="/Logo.png">
<link rel="stylesheet" href="/css/store.css">
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<nav class="store-nav">
  <a class="brand" href="/">HRSU Indore</a>
  <span><a href="/store/">Store</a><a href="/#contact">Contact</a></span>
</nav>
<main class="wrap">
  <p class="crumbs"><a href="/">Home</a> › <a href="/store/">Store</a> › {{TITLE}}</p>
  <h1>{{TITLE}}</h1>
  {{BODY}}
</main>
<footer class="store-footer">
  <div class="wrap" style="padding:0 0">
    <p><strong>HRSU Indore Pvt. Ltd.</strong> · 53, Industrial Area, Maksi, Madhya Pradesh 465106, India · <a href="mailto:contact@hrsuindore.com">contact@hrsuindore.com</a> · <a href="tel:+919425000484">+91 94250 00484</a></p>
  </div>
</footer>
</body>
</html>
```

**`store/shipping-policy/index.html`** — TITLE: `Shipping Policy`, SLUG: `shipping-policy`, BODY:

```html
<p>Effective date: 12 June 2026. Applies to all orders placed on hrsuindore.com/store.</p>
<h2>Domestic (India)</h2>
<ul>
  <li>Orders up to 5 kg: <strong>free shipping</strong>.</li>
  <li>Orders above 5 kg (all 25 kg / 50 kg bags): <strong>₹20 flat</strong> per order.</li>
  <li>Handling time: 1–2 business days. Transit: 2–8 days. Total: <strong>4–10 days door-to-door</strong>, anywhere in India.</li>
  <li>Tracking details are shared on WhatsApp/email at dispatch.</li>
</ul>
<h2>International</h2>
<ul>
  <li>Flat <strong>₹10,000</strong> per order to our export destinations (USA, UK, EU, UAE, Saudi Arabia, Australia, and others). Delivery 21–30 days.</li>
  <li>For container-load (1 MT+) export orders via Mundra Port, contact us for FOB/CIF quotes: contact@hrsuindore.com.</li>
</ul>
<h2>Questions</h2>
<p>Email <a href="mailto:contact@hrsuindore.com">contact@hrsuindore.com</a> or WhatsApp <a href="https://wa.me/919425000484">+91 94250 00484</a>.</p>
```

**`store/returns-policy/index.html`** — TITLE: `Returns &amp; Refund Policy`, SLUG: `returns-policy`, BODY:

```html
<p>Effective date: 12 June 2026.</p>
<h2>All sales are final</h2>
<p>Calcium Nitrate is a hygroscopic chemical product. For safety and quality reasons, <strong>we do not accept returns or exchanges</strong> once goods are dispatched. Please verify grade, pack size, and quantity before confirming your order.</p>
<h2>Damaged or incorrect goods</h2>
<p>If your shipment arrives damaged, short, or incorrect, notify us within <strong>48 hours of delivery</strong> with photos of the bags and shipping label at <a href="mailto:contact@hrsuindore.com">contact@hrsuindore.com</a> or WhatsApp <a href="https://wa.me/919425000484">+91 94250 00484</a>. Verified claims are resolved by replacement or full refund to your original payment method (UPI/bank transfer) within 7 business days.</p>
<h2>Order cancellation</h2>
<p>Orders may be cancelled free of charge any time <strong>before payment confirmation</strong>. After payment, cancellation is possible only until dispatch; refunds for pre-dispatch cancellations are issued within 7 business days.</p>
```

**`store/terms/index.html`** — TITLE: `Terms of Sale`, SLUG: `terms`, BODY:

```html
<p>Effective date: 12 June 2026. These terms govern purchases from HRSU Indore Pvt. Ltd. ("HRSU", "we") via hrsuindore.com/store.</p>
<h2>Ordering &amp; payment</h2>
<p>Orders are placed via the order form or WhatsApp. We confirm availability and total by phone/WhatsApp within 1 business day. Payment is by <strong>UPI or bank transfer (NEFT/IMPS)</strong>; goods dispatch after payment is received. All prices are MRP inclusive of all applicable taxes per the Indian Legal Metrology Act. A GST invoice is issued with every order.</p>
<h2>Product information</h2>
<p>Specifications are stated per batch Certificate of Analysis. TDS and SDS are available at hrsuindore.com. Product is intended for agricultural and industrial use by competent persons; follow the SDS for handling and storage.</p>
<h2>Liability</h2>
<p>Our liability is limited to the invoice value of the goods. We are not liable for losses arising from improper storage, application, or use contrary to the TDS/SDS.</p>
<h2>Jurisdiction</h2>
<p>These terms are governed by the laws of India; courts at Indore, Madhya Pradesh have exclusive jurisdiction.</p>
<h2>Company</h2>
<p>HRSU Indore Pvt. Ltd., 53, Industrial Area, Maksi, Madhya Pradesh 465106, India. Email: contact@hrsuindore.com · Phone: +91 94250 00484.</p>
```

**`store/privacy/index.html`** — TITLE: `Privacy Policy`, SLUG: `privacy`, BODY:

```html
<p>Effective date: 12 June 2026.</p>
<h2>What we collect</h2>
<p>When you place an order we collect your name, phone number, email (optional), and delivery address — solely to process and deliver your order and to contact you about it.</p>
<h2>What we don't do</h2>
<p>We do not sell or share your personal data with third parties for marketing. Payment happens directly via UPI/bank transfer — we never see or store card details.</p>
<h2>Analytics &amp; cookies</h2>
<p>We use Google Tag Manager and Google Analytics 4 to understand site usage (pages visited, approximate location, device type). This data is aggregated and does not identify you personally. You can opt out with browser settings or the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">GA opt-out add-on</a>.</p>
<h2>Data retention &amp; rights</h2>
<p>Order records are retained as required by Indian tax law (8 years). To access or delete your personal data, email <a href="mailto:contact@hrsuindore.com">contact@hrsuindore.com</a>.</p>
```

- [ ] **Step 2: Verify all four pages serve**

```bash
for p in shipping-policy returns-policy terms privacy; do
  curl -s -o /dev/null -w "/store/$p/ → %{http_code}\n" http://localhost:8787/store/$p/
done
```
Expected: four lines, all `200`.

- [ ] **Step 3: Commit**

```bash
git add store/shipping-policy store/returns-policy store/terms store/privacy
git commit -m "feat(store): GMC-required policy pages (shipping, returns, terms, privacy)"
```

---

### Task 6: Order API — `functions/api/order.js`

**Files:**
- Create: `functions/api/order.js`

- [ ] **Step 1: Create the function**

```js
// POST /api/order — receives order form JSON, emails it via Resend.
// Secrets: RESEND_API_KEY (npx wrangler secret put RESEND_API_KEY).
// Without the key, returns 503 so the client falls back to WhatsApp ordering.

const ORDER_TO = 'contact@hrsuindore.com';
const ORDER_FROM = 'orders@hrsuindore.com'; // domain must be verified in Resend

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequestPost(context) {
  const { request, env } = context;

  let d;
  try {
    d = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (d.website) return json({ ok: true, ref: 'OK' }); // honeypot: pretend success to bots

  for (const f of ['name', 'phone', 'product', 'size', 'quantity', 'address']) {
    if (!d[f] || String(d[f]).length > 600) return json({ error: `Invalid field: ${f}` }, 400);
  }
  if (!/^[0-9+\-\s]{10,15}$/.test(d.phone)) return json({ error: 'Invalid phone' }, 400);

  if (!env.RESEND_API_KEY) {
    return json({ error: 'Order system not configured' }, 503);
  }

  const ref = 'HRSU-' + Date.now().toString(36).toUpperCase();
  const html = `
    <h2>New store order ${ref}</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Product</th><td>${esc(d.product)}</td></tr>
      <tr><th>Size</th><td>${esc(d.size)}</td></tr>
      <tr><th>Quantity (bags)</th><td>${esc(d.quantity)}</td></tr>
      <tr><th>Name</th><td>${esc(d.name)}</td></tr>
      <tr><th>Phone</th><td>${esc(d.phone)}</td></tr>
      <tr><th>Email</th><td>${esc(d.email || '—')}</td></tr>
      <tr><th>Address</th><td>${esc(d.address)}</td></tr>
    </table>
    <p>Confirm with the customer within 1 business day (commitment made on the product page).</p>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `HRSU Store <${ORDER_FROM}>`,
      to: [ORDER_TO],
      reply_to: d.email || undefined,
      subject: `Store order ${ref} — ${d.product} ${d.size} × ${d.quantity}`,
      html,
    }),
  });

  if (!r.ok) {
    return json({ error: 'Failed to record order' }, 502);
  }
  return json({ ok: true, ref });
}
```

- [ ] **Step 2: Test validation locally (no key configured → 503 path and 400 path)**

```bash
curl -s -X POST http://localhost:8787/api/order -H "Content-Type: application/json" -d '{"name":"T"}' | grep -o '"error":"[^"]*"'
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8787/api/order -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"+91 9999999999","product":"CN","size":"25 kg","quantity":"2","address":"Test, 452001"}'
```
Expected: first prints `"error":"Invalid field: phone"` (or similar missing-field error); second prints `503` (no RESEND_API_KEY locally). The 503 is correct behavior — client falls back to WhatsApp.

- [ ] **Step 3 (user-assisted, can be deferred past launch): configure Resend**

1. User creates a free Resend account, adds domain `hrsuindore.com`, adds the DKIM/SPF DNS records in Cloudflare (Claude-in-Chrome can do the DNS part at `dash.cloudflare.com/.../hrsuindore.com/dns`).
2. `npx wrangler secret put RESEND_API_KEY` and paste the key.
3. Re-test step 2's second curl against production — expect `200` with `{"ok":true,"ref":"HRSU-..."}` and an email at contact@hrsuindore.com.

- [ ] **Step 4: Commit**

```bash
git add functions/api/order.js
git commit -m "feat(store): order API via Resend with WhatsApp fallback semantics"
```

---

### Task 7: GEO — markdown negotiation for store pages, llms.txt, _headers

**Files:**
- Modify: `functions/_middleware.js`
- Create: `llms.txt`
- Modify: `_headers`

- [ ] **Step 1: Extend `functions/_middleware.js`**

Replace the single-page logic with a path→markdown map. Replace the entire `onRequest` export and add a `STORE_MD` constant (keep the existing `MARKDOWN` constant as-is, but fix its store/blog links):

In the existing `MARKDOWN` constant, change:
- `[store.hrsuindore.com](https://store.hrsuindore.com/)` → `[hrsuindore.com/store](https://hrsuindore.com/store/)`

Then add below the `MARKDOWN` constant:

```js
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
  const { request, next } = context;
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

  return next();
}
```

- [ ] **Step 2: Create `llms.txt`** (root)

```markdown
# HRSU Indore Pvt. Ltd.

> Manufacturer and exporter of Calcium Nitrate (Ca(NO₃)₂) powder — 100% water-soluble, fertilizer and industrial grade. Factory: Maksi, Madhya Pradesh, India. Exports via Mundra Port to 30+ countries.

## Buy online
- [Store](https://hrsuindore.com/store/): direct B2C/B2B store, India-wide delivery
- [Calcium Nitrate Fertilizer Grade](https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/): 25 kg ₹750 / 50 kg ₹1,500 MRP incl. taxes

## Technical documents
- [TDS](https://hrsuindore.com/calcium-nitrate-tds-hrsu.pdf): specifications, ≥99% purity, 18.5–19% Ca, 15.5%+ N
- [SDS](https://hrsuindore.com/calcium-nitrate-sds-hrsu.pdf): safety and handling

## Contact
- Email: contact@hrsuindore.com · Phone/WhatsApp: +91 94250 00484
- Bulk/export (1 MT+): T/T or LC, Mundra Port, full export documentation
```

- [ ] **Step 3: Add to `_headers`** (append after the agent-skills block, before "Default security headers")

```
# ── Store pages: markdown negotiation + indexing ───────────
/store/*
  X-Robots-Tag: all
  Vary: Accept

# ── llms.txt (GEO) ─────────────────────────────────────────
/llms.txt
  Content-Type: text/markdown; charset=utf-8
  Cache-Control: public, max-age=86400
  Access-Control-Allow-Origin: *
```

- [ ] **Step 4: Verify**

```bash
curl -s -H "Accept: text/markdown" http://localhost:8787/store/ | head -3
curl -s http://localhost:8787/llms.txt | head -3
```
Expected: first shows `# HRSU Indore Store — Buy Calcium Nitrate Online`; second shows the llms.txt heading. Also confirm HTML still serves: `curl -s http://localhost:8787/store/ | head -1` → `<!DOCTYPE html>`.

- [ ] **Step 5: Commit**

```bash
git add functions/_middleware.js llms.txt _headers
git commit -m "feat(store): markdown negotiation for store pages, llms.txt, store headers"
```

---

### Task 8: Update sitemap, shopping feed, and homepage

**Files:**
- Modify: `sitemap.xml`
- Modify: `google-shopping-feed.xml`
- Modify: `index.html`

- [ ] **Step 1: `sitemap.xml`** — add before the `<!-- Online Store -->` block, and replace that block's `store.hrsuindore.com` entry entirely with:

```xml
  <!-- Online Store (on-domain) -->
  <url>
    <loc>https://hrsuindore.com/store/</loc>
    <lastmod>2026-06-12</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/</loc>
    <lastmod>2026-06-12</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://hrsuindore.com/store/shipping-policy/</loc>
    <lastmod>2026-06-12</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://hrsuindore.com/store/returns-policy/</loc>
    <lastmod>2026-06-12</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://hrsuindore.com/store/terms/</loc>
    <lastmod>2026-06-12</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://hrsuindore.com/store/privacy/</loc>
    <lastmod>2026-06-12</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
```

- [ ] **Step 2: `google-shopping-feed.xml`** — surgical edits only (leave the 17-country shipping blocks untouched). In BOTH `<item>`s:

| Element | Old | New |
|---|---|---|
| `g:title` (25 kg) | `Calcium Nitrate Powder 25kg — 100% Soluble \| HRSU Indore` | `Calcium Nitrate Fertilizer Grade 25kg — 100% Soluble \| HRSU Indore` |
| `g:title` (50 kg) | `Calcium Nitrate Powder 50kg Bulk — 100% Soluble \| HRSU Indore` | `Calcium Nitrate Fertilizer Grade 50kg — 100% Soluble \| HRSU Indore` |
| `g:link` (both) | `https://store.hrsuindore.com/products/calcium-nitrate-powder-form` | `https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/` |
| `g:image_link` (both) | `https://lsmedia.linker-cdn.net/1051955/2026/14878524.jpeg` | `https://hrsuindore.com/images/calcium-nitrate-25kg.jpeg` |
| `g:description` (both) | starts `HRSU Indore industrial-grade Calcium Nitrate…` | change the words `industrial-grade` → `fertilizer-grade` (rest of description unchanged) |
| Feed header comment | `Last updated: 2026-05-16` | `Last updated: 2026-06-12` |

Keep `g:id`, `g:item_group_id`, prices, shipping, and all other elements **unchanged** (changing IDs resets GMC item history).

- [ ] **Step 3: `index.html` (homepage)** — three surgical edits:

1. Both nav/menu links `https://store.hrsuindore.com` → `/store/` (remove `target="_blank" rel="noopener"` — it's internal now). Lines ~164 and ~187.
2. In the Organization JSON-LD `sameAs` array: replace `"https://store.hrsuindore.com"` with `"https://hrsuindore.com/store/"`.
3. In the Product JSON-LD `offers` block, fix the price mismatch (GMC compares!):
```json
"offers": {
  "@type": "AggregateOffer",
  "url": "https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/",
  "priceCurrency": "INR",
  "lowPrice": "750.00",
  "highPrice": "1500.00",
  "offerCount": "2",
  "availability": "https://schema.org/InStock",
  "seller": {"@type": "Organization","name": "HRSU Indore Pvt. Ltd."}
}
```
Also search index.html's visible body for any other `store.hrsuindore.com` links and update them the same way.

- [ ] **Step 4: Verify**

```bash
grep -c "hrsuindore.com/store" sitemap.xml          # expect 6
grep -c "store.hrsuindore.com" google-shopping-feed.xml   # expect 0
grep -c "linker-cdn" google-shopping-feed.xml       # expect 0
grep -c "store.hrsuindore.com" index.html           # expect 0
python -c "import xml.dom.minidom as m; m.parse('sitemap.xml'); m.parse('google-shopping-feed.xml'); print('XML OK')"
```
Expected: `6`, `0`, `0`, `0`, `XML OK`.

- [ ] **Step 5: Commit**

```bash
git add sitemap.xml google-shopping-feed.xml index.html
git commit -m "feat(store): point sitemap, shopping feed, and homepage at on-domain store"
```

---

### Task 9: GTM + GA4 setup (browser, user-assisted)

The pages already carry the GTM snippet with placeholder `GTM-XXXXXXX`. This task creates the real container and swaps the ID.

- [ ] **Step 1: Create GTM container + GA4 property** (Claude-in-Chrome with user's Google account, or user does it manually)

1. https://tagmanager.google.com → Create account "HRSU Indore" → container "hrsuindore.com", type Web → note the `GTM-XXXXXXX` ID.
2. https://analytics.google.com → Admin → Create property "HRSU Indore" (INR, India timezone) → Web data stream for `https://hrsuindore.com` → note the `G-XXXXXXXXXX` Measurement ID.
3. In GTM: New Tag → Google Tag → paste the G- ID → trigger: All Pages (Initialization). Add a second GA4 Event tag: event name `{{Event}}`, trigger: Custom Event with regex `view_item|begin_checkout|purchase_intent`, "Use regex matching" on. **Publish the container.**

- [ ] **Step 2: Replace the placeholder in all six pages**

```bash
grep -rl "GTM-XXXXXXX" store/ | xargs sed -i "s/GTM-XXXXXXX/GTM-REALID/g"
grep -rc "GTM-XXXXXXX" store/   # expect no matches
```

- [ ] **Step 3: Commit**

```bash
git add store/
git commit -m "feat(store): wire real GTM container ID"
```

---

### Task 10: Deploy and verify

- [ ] **Step 1: Deploy**

```bash
npx wrangler deploy
```
Expected: deploy succeeds, lists the worker `hrsu-indore`.

> NOTE: the repo mixes Workers-assets config (`wrangler.jsonc` with `assets.directory`) and Pages conventions (`functions/`, `_headers`). Check how the live site is actually deployed (Cloudflare dash → Workers & Pages). If it's a **Pages** project, the command is `npx wrangler pages deploy .` and the D1 binding from Task 4b must also be added in the Pages project → Settings → Bindings (name `DB`). If it's a Worker with static assets, `functions/` only works on Pages — the middleware would need to be a worker entry instead; whichever pattern the existing `_middleware.js` uses in production is the one to follow for the new functions.

- [ ] **Step 2: Production smoke test**

```bash
for u in /store/ /store/calcium-nitrate-fertilizer-grade/ /store/shipping-policy/ /store/returns-policy/ /store/terms/ /store/privacy/ /llms.txt /images/calcium-nitrate-25kg.jpeg /google-shopping-feed.xml; do
  curl -s -o /dev/null -w "$u → %{http_code}\n" "https://hrsuindore.com$u"
done
curl -s -H "Accept: text/markdown" https://hrsuindore.com/store/ | head -1
```
Expected: all `200`; last line is the store markdown heading.

- [ ] **Step 3: Rich results + GTM validation (browser)**

1. https://search.google.com/test/rich-results → test the product page URL → expect **Product snippets (via ProductGroup variants)**, **FAQ**, **Breadcrumbs** detected, zero errors.
2. https://tagassistant.google.com → connect to the product page → confirm GTM fires and `view_item` appears in the dataLayer.
3. GA4 Realtime report shows your visit.

- [ ] **Step 4: Search Console**

In https://search.google.com/search-console (property `hrsuindore.com` should already exist; if only the subdomain is verified, add a Domain property via the Cloudflare DNS TXT record):
1. Sitemaps → resubmit `https://hrsuindore.com/sitemap.xml`.
2. URL Inspection → `https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/` → **Request Indexing** (also for `/store/`).

- [ ] **Step 5: Commit any fixes found, push**

```bash
git push origin main
```

---

### Task 11: Google Merchant Center re-onboarding (browser, user-assisted)

- [ ] **Step 1:** In https://merchants.google.com → Business information → website: set/confirm `https://hrsuindore.com` and **verify + claim** it (Search Console verification carries over).
- [ ] **Step 2:** Products → Feeds → update the scheduled fetch to `https://hrsuindore.com/google-shopping-feed.xml` (it may already point there — then just **Fetch now**) and confirm both items process without errors.
- [ ] **Step 3:** Check Shipping & Returns settings still match the feed (India: 0–5 kg free / >5 kg ₹20, 4–10 days; international ₹10,000, 21–30 days; no-returns policy label).
- [ ] **Step 4:** If the account shows *Misrepresentation* suspension: verify every trust checkbox first — policy pages linked in footer (done), contact info + GSTIN/CIN visible (add CIN to the store footer if user provides it), prices consistent (done), then **Request review** from the Account issues page. Reviews take ~7 days; a second failed review forces a cool-down, so only request after Tasks 1–10 are fully live.
- [ ] **Step 5:** Once items are approved, enable **free listings** (Growth → Manage programs) — works without payment processing or ads budget.

---

### Task 12: Retire `store.hrsuindore.com` (Cloudflare, after GMC items approved)

Doing this consolidates the subdomain's SEO equity into the new pages and removes the flagged GlobalLinker association.

- [ ] **Step 1:** In Cloudflare dash (`dash.cloudflare.com/.../hrsuindore.com`) → DNS: change the `store` CNAME from the GlobalLinker/linker target to `hrsuindore.com`, **proxied (orange cloud)**.
- [ ] **Step 2:** Rules → Redirect Rules → create: hostname equals `store.hrsuindore.com` → 301 to `concat("https://hrsuindore.com/store", substring(http.request.uri.path, 0))` — or simplest static form: 301 everything to `https://hrsuindore.com/store/`.
- [ ] **Step 3:** Verify: `curl -sI https://store.hrsuindore.com/ | grep -i "location\|301"` → `301` + `location: https://hrsuindore.com/store/`.
- [ ] **Step 4:** Cancel/close the GlobalLinker store subscription so the old content can't resurface.

---

## Self-review notes

- Feed `g:link`, page canonical, JSON-LD offer URLs, sitemap, and homepage schema all use the identical URL `https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/` — consistent.
- Prices `750.00`/`1500.00` INR appear identically in: feed, page visible text, ProductGroup offers, homepage AggregateOffer, markdown route, llms.txt.
- SKUs `HRSU-CN-25KG-001`/`HRSU-CN-50KG-001` and group `HRSU-CN-001` match feed `g:id`/`g:item_group_id`.
- `js/store.js` reads `window.HRSU_PRODUCT` — defined in the product page (Task 4) before the script loads; landing page has no form so the script no-ops there.
- Order API field names (`name, phone, email, product, size, quantity, address, website`) match the form's input `name` attributes exactly.
- GMC trust set complete: shipping ✓ returns ✓ terms ✓ privacy ✓ contact/NAP in every footer ✓ conventional payment (UPI/bank transfer) stated ✓.
- Reviews: customer-submitted via on-page form → D1 moderation queue → server-rendered with AggregateRating JSON-LD (Task 4b). Review-form field names (`product_id, name, city, rating, body, website`) match the API exactly. Never approve a review you didn't genuinely receive.

## Next up (explicitly NOT in this plan — future work)

1. **Blog migration:** move `blogs.hrsuindore.com` (Blogger custom subdomain) to `hrsuindore.com/blogs/` — likely via a Cloudflare Worker reverse-proxy in front of Blogger (Blogger can't serve on a subdirectory natively) or a static export. Solves the subdomain-vs-domain SEO cannibalization. Requires its own plan: URL mapping, canonical rewriting, 301s from the subdomain, sitemap merge.
2. **Industrial-grade Calcium Nitrate product** (incl. bulk/MT pricing): copy the product-page template per the TEMPLATE NOTE comment, new SKUs + feed items.
3. Restyle the store to match the main site's design language.
4. Optional: Microsoft Clarity (free heatmaps), Bing Webmaster Tools + Bing Merchant feed reuse.
