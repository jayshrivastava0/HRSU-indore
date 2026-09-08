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
// Anchors are computed from the PREVIOUSLY applied values (read from
// pricing.lock.json, written after each successful run), not hardcoded
// literals — so this stays runnable indefinitely as prices change, not
// just once from a fixed baseline. First run (no lock file yet) bootstraps
// from the values that were actually live in the repo when this script
// was written (750 / 1500 / 1000 / 4500 / 2026-12-31).
//
// Each replacement asserts its `find` string is present exactly once (or
// `expect` times) before substituting — if a target file's wording has
// drifted from what the lock file expects, it throws instead of silently
// doing nothing, so drift can't go unnoticed.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCK_PATH = path.join(ROOT, 'pricing.lock.json');
const pricing = JSON.parse(fs.readFileSync(path.join(ROOT, 'pricing.json'), 'utf8'));

const BOOTSTRAP = {
  prices: { 'HRSU-CN-25KG-001': 750.00, 'HRSU-CN-50KG-001': 1500.00 },
  priceValidUntil: '2026-12-31',
  indiaFlatRate: 1000.00,
  freeShippingThreshold: 4500.00,
};

const prev = fs.existsSync(LOCK_PATH) ? JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8')) : BOOTSTRAP;

const p25 = pricing.products['HRSU-CN-25KG-001'];
const p50 = pricing.products['HRSU-CN-50KG-001'];
const priceValidUntil = pricing.priceValidUntil;
const indiaFlatRate = pricing.shipping.indiaFlatRate;
const freeThreshold = pricing.shipping.freeShippingThreshold;

const oldP25 = prev.prices['HRSU-CN-25KG-001'];
const oldP50 = prev.prices['HRSU-CN-50KG-001'];
const oldPriceValidUntil = prev.priceValidUntil;
const oldIndiaFlatRate = prev.indiaFlatRate;
const oldFreeThreshold = prev.freeShippingThreshold;

const fmtRupee = (n) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmt2 = (n) => n.toFixed(2);
const perKgOf = (price) => Math.round(price / 25); // both bag sizes are priced at the same per-kg rate today

function applyReplacements(file, replacements) {
  const full = path.join(ROOT, file);
  let text = fs.readFileSync(full, 'utf8');
  for (const { find, replace, label, expect = 1 } of replacements) {
    if (find === replace) continue; // value unchanged — nothing to do, and find may no longer be unique
    const count = text.split(find).length - 1;
    if (count !== expect) {
      throw new Error(`${file}: expected ${expect} match(es) for "${label}", found ${count}. Wording has drifted from pricing.lock.json's expectations.`);
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
    find: `<title>Calcium Nitrate Fertilizer Grade 25kg ${fmtRupee(oldP25)} / 50kg ${fmtRupee(oldP50)} | Buy Online — HRSU Indore</title>`,
    replace: `<title>Calcium Nitrate Fertilizer Grade 25kg ${fmtRupee(p25.price)} / 50kg ${fmtRupee(p50.price)} | Buy Online — HRSU Indore</title>`,
  },
  {
    label: 'meta description',
    find: `25 kg ${fmtRupee(oldP25)}, 50 kg ${fmtRupee(oldP50)} MRP incl. taxes.`,
    replace: `25 kg ${fmtRupee(p25.price)}, 50 kg ${fmtRupee(p50.price)} MRP incl. taxes.`,
  },
  {
    label: 'og:description',
    find: `content="25 kg ${fmtRupee(oldP25)} · 50 kg ${fmtRupee(oldP50)} (MRP incl. taxes).`,
    replace: `content="25 kg ${fmtRupee(p25.price)} · 50 kg ${fmtRupee(p50.price)} (MRP incl. taxes).`,
  },
  {
    label: 'og price meta',
    find: `<meta property="product:price:amount" content="${fmt2(oldP25)}">`,
    replace: `<meta property="product:price:amount" content="${fmt2(p25.price)}">`,
  },
  {
    label: 'JSON-LD 25kg offer price',
    find: `"price": "${fmt2(oldP25)}",`,
    replace: `"price": "${fmt2(p25.price)}",`,
  },
  {
    label: 'JSON-LD 50kg offer price',
    find: `"price": "${fmt2(oldP50)}",`,
    replace: `"price": "${fmt2(p50.price)}",`,
  },
  {
    label: 'JSON-LD priceValidUntil (both offers)',
    expect: 2,
    find: `"priceValidUntil": "${oldPriceValidUntil}",`,
    replace: `"priceValidUntil": "${priceValidUntil}",`,
  },
  {
    label: 'JSON-LD India shippingRate value (both offers)',
    expect: 2,
    find: `"shippingRate": { "@type": "MonetaryAmount", "value": "${fmt2(oldIndiaFlatRate)}", "currency": "INR" },`,
    replace: `"shippingRate": { "@type": "MonetaryAmount", "value": "${fmt2(indiaFlatRate)}", "currency": "INR" },`,
  },
  {
    label: 'JSON-LD freeShippingThreshold price (both offers)',
    expect: 2,
    find: `"eligibleTransactionVolume": { "@type": "PriceSpecification", "price": "${fmt2(oldFreeThreshold)}", "priceCurrency": "INR" } },`,
    replace: `"eligibleTransactionVolume": { "@type": "PriceSpecification", "price": "${fmt2(freeThreshold)}", "priceCurrency": "INR" } },`,
  },
  {
    label: 'visible price paragraph',
    find: `<p class="price" style="margin:14px 0">${fmtRupee(oldP25)} <small>/ 25 kg bag</small> &nbsp;·&nbsp; ${fmtRupee(oldP50)} <small>/ 50 kg bag</small><br><small>MRP inclusive of all taxes · ${fmtRupee(perKgOf(oldP25))}/kg</small></p>`,
    replace: `<p class="price" style="margin:14px 0">${fmtRupee(p25.price)} <small>/ 25 kg bag</small> &nbsp;·&nbsp; ${fmtRupee(p50.price)} <small>/ 50 kg bag</small><br><small>MRP inclusive of all taxes · ${fmtRupee(perKgOf(p25.price))}/kg</small></p>`,
  },
  {
    label: 'shipping line',
    find: `<p><strong>Shipping:</strong> Free on orders ${fmtRupee(oldFreeThreshold)}+ · ${fmtRupee(oldIndiaFlatRate)} flat below that · anywhere in India · 3–10 days. <a href="/store/shipping-policy/">Details</a></p>`,
    replace: `<p><strong>Shipping:</strong> Free on orders ${fmtRupee(freeThreshold)}+ · ${fmtRupee(indiaFlatRate)} flat below that · anywhere in India · 3–10 days. <a href="/store/shipping-policy/">Details</a></p>`,
  },
  {
    label: 'export-quote intro retail-price reference',
    find: `the ${fmtRupee(oldP25)}/${fmtRupee(oldP50)} retail bag pricing above is for domestic India orders only.`,
    replace: `the ${fmtRupee(p25.price)}/${fmtRupee(p50.price)} retail bag pricing above is for domestic India orders only.`,
  },
  {
    label: 'order form 25kg option',
    find: `<option value="25 kg (${fmtRupee(oldP25)})">25 kg — ${fmtRupee(oldP25)}</option>`,
    replace: `<option value="25 kg (${fmtRupee(p25.price)})">25 kg — ${fmtRupee(p25.price)}</option>`,
  },
  {
    label: 'order form 50kg option',
    find: `<option value="50 kg (${fmtRupee(oldP50)})">50 kg — ${fmtRupee(oldP50)}</option>`,
    replace: `<option value="50 kg (${fmtRupee(p50.price)})">50 kg — ${fmtRupee(p50.price)}</option>`,
  },
  {
    label: 'FAQ: how do I order (delivery threshold) #1',
    find: `Free delivery on orders ${fmtRupee(oldFreeThreshold)} and above; flat ${fmtRupee(oldIndiaFlatRate)} for orders below ${fmtRupee(oldFreeThreshold)}.`,
    replace: `Free delivery on orders ${fmtRupee(freeThreshold)} and above; flat ${fmtRupee(indiaFlatRate)} for orders below ${fmtRupee(freeThreshold)}.`,
  },
  {
    label: 'FAQ: delivery details #2',
    find: `Free delivery on orders ${fmtRupee(oldFreeThreshold)} and above; ${fmtRupee(oldIndiaFlatRate)} flat for orders below ${fmtRupee(oldFreeThreshold)}.`,
    replace: `Free delivery on orders ${fmtRupee(freeThreshold)} and above; ${fmtRupee(indiaFlatRate)} flat for orders below ${fmtRupee(freeThreshold)}.`,
  },
  {
    label: 'GA4 item price',
    find: `window.HRSU_PRODUCT = { item_id: 'HRSU-CN-25KG-001', item_name: 'Calcium Nitrate Fertilizer Grade', item_brand: 'HRSU Indore', price: ${oldP25}, quantity: 1 };`,
    replace: `window.HRSU_PRODUCT = { item_id: 'HRSU-CN-25KG-001', item_name: 'Calcium Nitrate Fertilizer Grade', item_brand: 'HRSU Indore', price: ${p25.price}, quantity: 1 };`,
  },
]);

// ---- store index card ---------------------------------------------------
applyReplacements('store/index.html', [
  {
    label: 'meta description',
    find: `25 kg ${fmtRupee(oldP25)} / 50 kg ${fmtRupee(oldP50)} MRP incl. taxes.`,
    replace: `25 kg ${fmtRupee(p25.price)} / 50 kg ${fmtRupee(p50.price)} MRP incl. taxes.`,
  },
  {
    label: 'card price',
    find: `<p class="price">${fmtRupee(oldP25)} <small>/ 25 kg</small> &nbsp;·&nbsp; ${fmtRupee(oldP50)} <small>/ 50 kg</small></p>`,
    replace: `<p class="price">${fmtRupee(p25.price)} <small>/ 25 kg</small> &nbsp;·&nbsp; ${fmtRupee(p50.price)} <small>/ 50 kg</small></p>`,
  },
]);

// ---- Merchant Center feed -------------------------------------------
applyReplacements('google-shopping-feed.xml', [
  { label: '25kg g:price', find: `<g:price>${fmt2(oldP25)} INR</g:price>`, replace: `<g:price>${fmt2(p25.price)} INR</g:price>` },
  { label: '50kg g:price', find: `<g:price>${fmt2(oldP50)} INR</g:price>`, replace: `<g:price>${fmt2(p50.price)} INR</g:price>` },
  {
    label: 'India shipping rate (both products)',
    expect: 2,
    find: `<g:price>${fmt2(oldIndiaFlatRate)} INR</g:price>`,
    replace: `<g:price>${fmt2(indiaFlatRate)} INR</g:price>`,
  },
]);

fs.writeFileSync(LOCK_PATH, JSON.stringify({
  prices: { 'HRSU-CN-25KG-001': p25.price, 'HRSU-CN-50KG-001': p50.price },
  priceValidUntil,
  indiaFlatRate,
  freeShippingThreshold: freeThreshold,
}, null, 2) + '\n', 'utf8');

console.log('\npricing.json applied and pricing.lock.json updated. Review the diff, commit, push, and `npx wrangler deploy` to go live.');
