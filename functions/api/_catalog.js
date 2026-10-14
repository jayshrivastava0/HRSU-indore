// _catalog.js — single source of truth for product data, shipping, and company info.
// Imported by products.js and mcp.js. Underscore prefix = not a Cloudflare route.
//
// Prices and shipping thresholds are NOT written here: they come from
// ../../pricing.json (the single source of truth for retail pricing; see
// scripts/apply-pricing.js for the static files that mirror it).

import PRICING from '../../pricing.json';

const price = (sku) => PRICING.products[sku].price;
const perKg = (sku, kg) => Math.round(price(sku) / kg);
export const rupee = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const bagsToQualify = (sku) => Math.ceil(PRICING.shipping.freeShippingThreshold / price(sku));

export const CATALOG = [
  {
    sku: 'HRSU-CN-25KG-001',
    mpn: 'HRSU-CN-25KG-001',
    product_group_id: 'HRSU-CN-001',
    slug: 'calcium-nitrate-fertilizer-grade',
    name: 'Calcium Nitrate Fertilizer Grade — 25 kg Bag',
    product_group_name: 'Calcium Nitrate — Fertilizer Grade',
    size: '25 kg',
    size_select_value: `25 kg (₹${price('HRSU-CN-25KG-001')})`,
    price_inr: price('HRSU-CN-25KG-001'),
    price_per_kg_inr: perKg('HRSU-CN-25KG-001', 25),
    currency: 'INR',
    availability: 'in_stock',
    condition: 'new',
    url: 'https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/',
    image: 'https://hrsuindore.com/images/calcium-nitrate-granules.jpg',
    brand: 'HRSU Indore',
    country_of_origin: 'IN',
    specs: {
      formula: 'Ca(NO₃)₂ · 4H₂O',
      common_name: 'Calcium Nitrate Tetrahydrate',
      form: 'Fine crystalline powder, white',
      purity: '≥ 99%',
      calcium_ca: '18.5–19%',
      nitrogen_n: '15.5% min (nitrate form only)',
      water_solubility: '100% — zero insoluble residue',
      ph_1pct_solution: '5.5–6.5',
      pack_material: 'HDPE woven bag',
      origin: 'Maksi, Madhya Pradesh, India',
    },
    applications: [
      'Drip irrigation and fertigation (no emitter clogging)',
      'Foliar spray for blossom-end-rot and tip-burn prevention',
      'Hydroponics Part-A formulations',
      'Soil application for calcium-deficient crops',
      'Cold-weather concrete acceleration',
    ],
    suitable_crops: ['Tomato', 'Capsicum', 'Banana', 'Grapes', 'Pomegranate', 'Apple', 'Leafy greens'],
    documents: {
      tds: 'https://hrsuindore.com/calcium-nitrate-tds-hrsu.pdf',
      sds: 'https://hrsuindore.com/calcium-nitrate-sds-hrsu.pdf',
    },
    tax_note: 'MRP inclusive of all taxes (Indian Legal Metrology Act)',
  },
  {
    sku: 'HRSU-CN-50KG-001',
    mpn: 'HRSU-CN-50KG-001',
    product_group_id: 'HRSU-CN-001',
    slug: 'calcium-nitrate-fertilizer-grade',
    name: 'Calcium Nitrate Fertilizer Grade — 50 kg Bag',
    product_group_name: 'Calcium Nitrate — Fertilizer Grade',
    size: '50 kg',
    size_select_value: `50 kg (₹${price('HRSU-CN-50KG-001')})`,
    price_inr: price('HRSU-CN-50KG-001'),
    price_per_kg_inr: perKg('HRSU-CN-50KG-001', 50),
    currency: 'INR',
    availability: 'in_stock',
    condition: 'new',
    url: 'https://hrsuindore.com/store/calcium-nitrate-fertilizer-grade/',
    image: 'https://hrsuindore.com/images/calcium-nitrate-granules.jpg',
    brand: 'HRSU Indore',
    country_of_origin: 'IN',
    specs: {
      formula: 'Ca(NO₃)₂ · 4H₂O',
      common_name: 'Calcium Nitrate Tetrahydrate',
      form: 'Fine crystalline powder, white',
      purity: '≥ 99%',
      calcium_ca: '18.5–19%',
      nitrogen_n: '15.5% min (nitrate form only)',
      water_solubility: '100% — zero insoluble residue',
      ph_1pct_solution: '5.5–6.5',
      pack_material: 'HDPE woven bag',
      origin: 'Maksi, Madhya Pradesh, India',
    },
    applications: [
      'Drip irrigation and fertigation (no emitter clogging)',
      'Foliar spray for blossom-end-rot and tip-burn prevention',
      'Hydroponics Part-A formulations',
      'Soil application for calcium-deficient crops',
      'Cold-weather concrete acceleration',
    ],
    suitable_crops: ['Tomato', 'Capsicum', 'Banana', 'Grapes', 'Pomegranate', 'Apple', 'Leafy greens'],
    documents: {
      tds: 'https://hrsuindore.com/calcium-nitrate-tds-hrsu.pdf',
      sds: 'https://hrsuindore.com/calcium-nitrate-sds-hrsu.pdf',
    },
    tax_note: 'MRP inclusive of all taxes (Indian Legal Metrology Act)',
  },
];

export const SHIPPING = {
  india: {
    currency: 'INR',
    free_threshold_inr: PRICING.shipping.freeShippingThreshold,
    free_threshold_note: `${bagsToQualify('HRSU-CN-25KG-001')}+ bags of 25 kg, or ${bagsToQualify('HRSU-CN-50KG-001')}+ bags of 50 kg`,
    flat_rate_inr: PRICING.shipping.indiaFlatRate,
    handling_min_days: 1,
    handling_max_days: 2,
    transit_min_days: 2,
    transit_max_days: 8,
    total_min_days: 3,
    total_max_days: 10,
    total_display: '3–10 business days',
    coverage: 'Anywhere in India',
    tracking: 'Tracking details shared via WhatsApp/email at dispatch',
  },
  international: {
    currency: 'INR',
    flat_rate_inr: PRICING.shipping.internationalFlatRate,
    delivery_min_days: 22,
    delivery_max_days: 32,
    delivery_display: '22–32 days',
    destinations: 'USA, UK, EU, UAE, Saudi Arabia, Australia, and others',
    bulk_export_note: 'For 1 MT+ container orders via Mundra Port, contact for FOB/CIF quotes',
    bulk_contact: 'contact@hrsuindore.com',
  },
};

export const COMPANY = {
  name: 'HRSU Indore Pvt. Ltd.',
  address: '53, Industrial Area, Maksi, Madhya Pradesh 465106, India',
  email: 'contact@hrsuindore.com',
  phone: '+91 94250 00484',
  whatsapp_link: 'https://wa.me/919425000484',
  website: 'https://hrsuindore.com',
  store: 'https://hrsuindore.com/store/',
  blog: 'https://blog.hrsuindore.com/',
};

export const PAYMENT_INFO = {
  methods: ['UPI', 'NEFT', 'IMPS', 'RTGS'],
  process: [
    'Submit order via website, API, or WhatsApp',
    'HRSU calls/WhatsApps within 1 business day to confirm',
    'Customer pays via UPI or NEFT/IMPS bank transfer',
    'HRSU dispatches with tracking after payment confirmation',
  ],
  advance_payment: true,
  card_accepted: false,
  note: 'No credit/debit card required. No payment gateway. All payments after phone confirmation.',
};
