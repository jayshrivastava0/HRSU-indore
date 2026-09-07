#!/usr/bin/env node
// apply-pricing.js — single source of truth for retail bag pricing.
//
// Edit ../pricing.json, then run `node scripts/apply-pricing.js` from the
// repo root and redeploy (`npx wrangler deploy`). Propagates to every place
// price is duplicated as free-form text/attributes across this repo:
// the product page, the store index card, and the Merchant Center feed.
// (Not Google Business Profile — no API is wired up here; update that by
// hand when price changes.)
//
// Each replacement asserts its `find` string is present exactly once before
// substituting — if a target file's wording has drifted since this script
// was written, it throws instead of silently doing nothing, so drift can't
// go unnoticed.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const pricing = JSON.parse(fs.readFileSync(path.join(ROOT, 'pricing.json'), 'utf8'));

const p25 = pricing.products['HRSU-CN-25KG-001'];
const p50 = pricing.products['HRSU-CN-50KG-001'];
const currency = pricing.currency;
const priceValidUntil = pricing.priceValidUntil;
const indiaFlatRate = pricing.shipping.indiaFlatRate;
const freeThreshold = pricing.shipping.freeShippingThreshold;

const fmtRupee = (n) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmt2 = (n) => n.toFixed(2);
const perKg = Math.round(p25.price / 25); // both bag sizes are priced at the same per-kg rate today

function applyReplacements(file, replacements) {
  const full = path.join(ROOT, file);
  let text = fs.readFileSync(full, 'utf8');
  for (const { find, replace, label, expect = 1 } of replacements) {
    const count = text.split(find).length - 1;
    if (count !== expect) {
      throw new Error(`${file}: expected ${expect} match(es) for "${label}", found ${count}. Wording has drifted — update this script's anchor.`);
    }
    text = text.split(find).join(replace);
  }
  fs.writeFileSync(full, text, 'utf8');
  // mirror to public/ — the Worker only serves from there
  const mirror = path.join(ROOT, 'public', file);
  fs.mkdirSync(path.dirname(mirror), { recursive: true });
  fs.writeFileSync(mirror, text, 'utf8');
  console.log(`updated ${file} (+ public/${file})`);
}

// ---- product page ----------------------------------------------------
applyReplacements('store/calcium-nitrate-fertilizer-grade/index.html', [
  {
    label: 'title tag',
    find: `<title>Calcium Nitrate Fertilizer Grade 25kg ₹750 / 50kg ₹1,500 | Buy Online — HRSU Indore</title>`,
    replace: `<title>Calcium Nitrate Fertilizer Grade 25kg ${fmtRupee(p25.price)} / 50kg ${fmtRupee(p50.price)} | Buy Online — HRSU Indore</title>`,
  },
  {
    label: 'meta description',
    find: `25 kg ₹750, 50 kg ₹1,500 MRP incl. taxes.`,
    replace: `25 kg ${fmtRupee(p25.price)}, 50 kg ${fmtRupee(p50.price)} MRP incl. taxes.`,
  },
  {
    label: 'og:description',
    find: `content="25 kg ₹750 · 50 kg ₹1,500 (MRP incl. taxes).`,
    replace: `content="25 kg ${fmtRupee(p25.price)} · 50 kg ${fmtRupee(p50.price)} (MRP incl. taxes).`,
  },
  {
    label: 'og price meta',
    find: `<meta property="product:price:amount" content="750.00">`,
    replace: `<meta property="product:price:amount" content="${fmt2(p25.price)}">`,
  },
  {
    label: 'JSON-LD 25kg offer price',
    find: `"price": "750.00",`,
    replace: `"price": "${fmt2(p25.price)}",`,
  },
  {
    label: 'JSON-LD 50kg offer price',
    find: `"price": "1500.00",`,
    replace: `"price": "${fmt2(p50.price)}",`,
  },
  {
    label: 'JSON-LD priceValidUntil (both offers)',
    expect: 2,
    find: `"priceValidUntil": "2026-12-31",`,
    replace: `"priceValidUntil": "${priceValidUntil}",`,
  },
  {
    label: 'JSON-LD India shippingRate value (both offers)',
    expect: 2,
    find: `"shippingRate": { "@type": "MonetaryAmount", "value": "1000.00", "currency": "INR" },`,
    replace: `"shippingRate": { "@type": "MonetaryAmount", "value": "${fmt2(indiaFlatRate)}", "currency": "INR" },`,
  },
  {
    label: 'JSON-LD freeShippingThreshold price (both offers)',
    expect: 2,
    find: `"eligibleTransactionVolume": { "@type": "PriceSpecification", "price": "4500.00", "priceCurrency": "INR" } },`,
    replace: `"eligibleTransactionVolume": { "@type": "PriceSpecification", "price": "${fmt2(freeThreshold)}", "priceCurrency": "INR" } },`,
  },
  {
    label: 'visible price paragraph',
    find: `<p class="price" style="margin:14px 0">₹750 <small>/ 25 kg bag</small> &nbsp;·&nbsp; ₹1,500 <small>/ 50 kg bag</small><br><small>MRP inclusive of all taxes · ₹30/kg</small></p>`,
    replace: `<p class="price" style="margin:14px 0">${fmtRupee(p25.price)} <small>/ 25 kg bag</small> &nbsp;·&nbsp; ${fmtRupee(p50.price)} <small>/ 50 kg bag</small><br><small>MRP inclusive of all taxes · ${fmtRupee(perKg)}/kg</small></p>`,
  },
  {
    label: 'shipping line',
    find: `<p><strong>Shipping:</strong> Free on orders ₹4,500+ · ₹1,000 flat below that · anywhere in India · 3–10 days. <a href="/store/shipping-policy/">Details</a></p>`,
    replace: `<p><strong>Shipping:</strong> Free on orders ${fmtRupee(freeThreshold)}+ · ${fmtRupee(indiaFlatRate)} flat below that · anywhere in India · 3–10 days. <a href="/store/shipping-policy/">Details</a></p>`,
  },
  {
    label: 'export-quote intro retail-price reference',
    find: `the ₹750/₹1,500 retail bag pricing above is for domestic India orders only.`,
    replace: `the ${fmtRupee(p25.price)}/${fmtRupee(p50.price)} retail bag pricing above is for domestic India orders only.`,
  },
  {
    label: 'order form 25kg option',
    find: `<option value="25 kg (₹750)">25 kg — ₹750</option>`,
    replace: `<option value="25 kg (${fmtRupee(p25.price)})">25 kg — ${fmtRupee(p25.price)}</option>`,
  },
  {
    label: 'order form 50kg option',
    find: `<option value="50 kg (₹1,500)">50 kg — ₹1,500</option>`,
    replace: `<option value="50 kg (${fmtRupee(p50.price)})">50 kg — ${fmtRupee(p50.price)}</option>`,
  },
  {
    label: 'FAQ: how do I order (delivery threshold) #1',
    find: `Free delivery on orders ₹4,500 and above; flat ₹1,000 for orders below ₹4,500.`,
    replace: `Free delivery on orders ${fmtRupee(freeThreshold)} and above; flat ${fmtRupee(indiaFlatRate)} for orders below ${fmtRupee(freeThreshold)}.`,
  },
  {
    label: 'FAQ: delivery details #2',
    find: `Free delivery on orders ₹4,500 and above; ₹1,000 flat for orders below ₹4,500.`,
    replace: `Free delivery on orders ${fmtRupee(freeThreshold)} and above; ${fmtRupee(indiaFlatRate)} flat for orders below ${fmtRupee(freeThreshold)}.`,
  },
  {
    label: 'GA4 item price',
    find: `window.HRSU_PRODUCT = { item_id: 'HRSU-CN-25KG-001', item_name: 'Calcium Nitrate Fertilizer Grade', item_brand: 'HRSU Indore', price: 750, quantity: 1 };`,
    replace: `window.HRSU_PRODUCT = { item_id: 'HRSU-CN-25KG-001', item_name: 'Calcium Nitrate Fertilizer Grade', item_brand: 'HRSU Indore', price: ${p25.price}, quantity: 1 };`,
  },
]);

// ---- store index card ---------------------------------------------------
applyReplacements('store/index.html', [
  {
    label: 'meta description',
    find: `25 kg ₹750 / 50 kg ₹1,500 MRP incl. taxes.`,
    replace: `25 kg ${fmtRupee(p25.price)} / 50 kg ${fmtRupee(p50.price)} MRP incl. taxes.`,
  },
  {
    label: 'card price',
    find: `<p class="price">₹750 <small>/ 25 kg</small> &nbsp;·&nbsp; ₹1,500 <small>/ 50 kg</small></p>`,
    replace: `<p class="price">${fmtRupee(p25.price)} <small>/ 25 kg</small> &nbsp;·&nbsp; ${fmtRupee(p50.price)} <small>/ 50 kg</small></p>`,
  },
]);

// ---- Merchant Center feed -------------------------------------------
applyReplacements('google-shopping-feed.xml', [
  { label: '25kg g:price', find: `<g:price>750.00 INR</g:price>`, replace: `<g:price>${fmt2(p25.price)} INR</g:price>` },
  { label: '50kg g:price', find: `<g:price>1500.00 INR</g:price>`, replace: `<g:price>${fmt2(p50.price)} INR</g:price>` },
  {
    label: 'India shipping rate (both products)',
    expect: 2,
    find: `<g:price>1000.00 INR</g:price>`,
    replace: `<g:price>${fmt2(indiaFlatRate)} INR</g:price>`,
  },
]);
console.log('\npricing.json applied. Review the diff, commit, push, and `npx wrangler deploy` to go live.');
