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
const intlFlatRate = pricing.shipping.internationalFlatRate;

const oldP25 = prev.prices['HRSU-CN-25KG-001'];
const oldP50 = prev.prices['HRSU-CN-50KG-001'];
const oldPriceValidUntil = prev.priceValidUntil;
const oldIndiaFlatRate = prev.indiaFlatRate;
const oldFreeThreshold = prev.freeShippingThreshold;
const oldIntlFlatRate = prev.internationalFlatRate ?? 10000.00; // not tracked in the lock before 2026-10-14

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

// ---- every other static file that quotes a retail price ------------------
// Amount-based rewrite: any "₹<amount>" whose value equals a PREVIOUS bag price or
// per-kg price becomes the matching NEW value (decided from the old value only, so
// there are no collisions if a new price equals another old price). Both the live
// copy under public/ and the root mirror (if present) are rewritten independently.
const GLOBAL_FILES = [
  'api/docs/index.html',
  'store/index.html',
  'google-shopping-feed.xml',
  'store/shipping-policy/index.html',
  'llms.txt',
  'openapi.json',
  '.well-known/ai-plugin.json',
  '.well-known/agent.json',
  '.well-known/agent-skills/index.json',
  '.well-known/agent-skills/get-product-info/SKILL.md',
  '.well-known/agent-skills/place-order/SKILL.md',
  '.well-known/agent-skills/request-quote/SKILL.md',
  'learn/bulk-calcium-nitrate-export-india/index.html',
  'learn/calcium-nitrate-price-india/index.html',
  'learn/calcium-nitrate-vs-calcium-chloride/index.html',
  'learn/calcium-nitrate-vs-can/index.html',
];

const oldPerKg = perKgOf(oldP25);
const newPerKg = perKgOf(p25.price);
const amountMap = new Map([
  [oldP25, p25.price], [oldP50, p50.price], [oldPerKg, newPerKg],
  [oldIndiaFlatRate, indiaFlatRate], [oldFreeThreshold, freeThreshold], [oldIntlFlatRate, intlFlatRate],
]);
const bagsToQualify = (price) => Math.ceil(freeThreshold / price);
const swapAmount = (v) => (amountMap.has(v) ? amountMap.get(v) : v);
const fmtIN = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

function rewriteAmounts(text) {
  let hits = 0;
  // "₹1,500" / "₹1500" / "₹30" — keep the comma style the original used
  // Indian grouping everywhere ("₹1,200") EXCEPT inside API size labels like "25 kg (₹1200)",
  // which must stay comma-free because they are exact enum values clients send back.
  text = text.replace(/₹(\d[\d,]*)(?![\d,])/g, (m, digits, offset, whole) => {
    const v = Number(digits.replace(/,/g, ''));
    const nv = swapAmount(v);
    const inSizeLabel = whole.slice(offset - 4, offset) === 'kg (';
    const out = '₹' + (inSizeLabel ? String(nv) : fmtIN(nv));
    if (out === m) return m;
    hits++;
    return out;
  });
  // free-shipping bag counts ("6+ bags of 25 kg, or 3+ bags of 50 kg") follow from price vs threshold
  text = text.replace(/(\d+)\+( bags (?:of|×) 25 ?kg,? (?:or )?)(\d+)\+( bags (?:of|×) 50 ?kg)/g, (m, a, mid, b, tail) => {
    const out = `${bagsToQualify(p25.price)}+${mid}${bagsToQualify(p50.price)}+${tail}`;
    if (out === m) return m;
    hits++;
    return out;
  });
  // JSON price fields (openapi.json examples, catalog-style snippets)
  text = text.replace(/("price_inr"\s*:\s*)(\d+)/g, (m, k, d) => { const nv = swapAmount(Number(d)); if (nv === Number(d)) return m; hits++; return k + nv; });
  text = text.replace(/("price_per_kg_inr"\s*:\s*)(\d+)/g, (m, k, d) => { const nv = swapAmount(Number(d)); if (nv === Number(d)) return m; hits++; return k + nv; });
  text = text.replace(/("price_inr"\s*:\s*\{[^{}]*?"example"\s*:\s*)(\d+)/g, (m, k, d) => { const nv = swapAmount(Number(d)); if (nv === Number(d)) return m; hits++; return k + nv; });
  text = text.replace(/("price_per_kg_inr"\s*:\s*\{[^{}]*?"example"\s*:\s*)(\d+)/g, (m, k, d) => { const nv = swapAmount(Number(d)); if (nv === Number(d)) return m; hits++; return k + nv; });
  // shipping amounts in JSON docs/examples (direct value or schema "example")
  for (const key of ['free_threshold_inr', 'flat_rate_inr']) {
    for (const re of [new RegExp(`("${key}"\\s*:\\s*)(\\d+)`, 'g'), new RegExp(`("${key}"\\s*:\\s*\\{[^{}]*?"example"\\s*:\\s*)(\\d+)`, 'g')]) {
      text = text.replace(re, (m, k, d) => { const nv = swapAmount(Number(d)); if (nv === Number(d)) return m; hits++; return k + nv; });
    }
  }
  return { text, hits };
}

for (const file of GLOBAL_FILES) {
  for (const base of ['public', '.']) {
    const full = path.join(ROOT, base, file);
    if (!fs.existsSync(full)) continue;
    const { text, hits } = rewriteAmounts(fs.readFileSync(full, 'utf8'));
    if (hits) fs.writeFileSync(full, text, 'utf8');
    console.log(`${hits ? 'updated' : 'no change'} ${base === '.' ? '' : base + '/'}${file}${hits ? ` (${hits} price reference(s))` : ''}`);
  }
}

// ---- --check: fail if any file still shows a price that isn't current -------
if (process.argv.includes('--check')) {
  const allowed = new Set([0, p25.price, p50.price, newPerKg, indiaFlatRate, freeThreshold, intlFlatRate]); // 0 = "free shipping"
  const scan = [
    'public/store/index.html', 'public/store/calcium-nitrate-fertilizer-grade/index.html',
    'functions/_middleware.js', 'functions/api/_catalog.js', 'functions/api/tools.js', 'functions/api/mcp.js',
    ...GLOBAL_FILES.map((f) => 'public/' + f),
  ];
  let bad = 0;
  for (const f of scan) {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/₹\s?(\d[\d,]*)(?![\d,])/g)) {
        const v = Number(m[1].replace(/,/g, ''));
        if (!allowed.has(v)) { bad++; console.log(`CHECK  ${f}:${i + 1}  ${m[0]}   (not a current price/shipping value)`); }
      }
    });
  }
  console.log(bad ? `\n${bad} unrecognised ₹ amount(s) — review above.` : '\nCheck passed: every ₹ amount matches pricing.json.');
  process.exit(bad ? 1 : 0);
}

fs.writeFileSync(LOCK_PATH, JSON.stringify({
  prices: { 'HRSU-CN-25KG-001': p25.price, 'HRSU-CN-50KG-001': p50.price },
  priceValidUntil,
  indiaFlatRate,
  freeShippingThreshold: freeThreshold,
  internationalFlatRate: intlFlatRate,
}, null, 2) + '\n', 'utf8');

console.log('\npricing.json applied and pricing.lock.json updated. Review the diff, commit, push, and `npx wrangler deploy` to go live.');
