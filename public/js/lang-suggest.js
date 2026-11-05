// lang-suggest.js — remembers a visitor's language choice and, on an English page that has
// translations, offers the page in the language of the visitor's region (Cloudflare country
// from /api/geo, falling back to the browser language). Search engines are not redirected:
// they see the static English page and find the other languages via <link rel="alternate" hreflang>.
//
// AUTO = false : show a one-click banner (default, safest for SEO and for visitors who
//                 prefer English). Set AUTO = true to switch first-time visitors straight
//                 to their regional language (they get a "back to English" bar).
// Test any country with ?geo=FR, ?geo=BR, ?geo=MM ...
(function () {
  var AUTO = false;
  var html = document.documentElement;
  var cur = (html.getAttribute('lang') || 'en').toLowerCase();
  var curCode = cur.indexOf('zh') === 0 ? 'zh' : cur.split('-')[0];

  // alternates available for this page (from the static hreflang tags)
  var alt = {};
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (l) {
    var h = l.getAttribute('hreflang');
    if (h === 'x-default') return;
    var code = h.indexOf('zh') === 0 ? 'zh' : h.split('-')[0];
    try { alt[code] = new URL(l.href).pathname; } catch (e) {}
  });

  // remember an explicit choice made in the language menu
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.lang-sw a[data-lang]');
    if (a) { try { localStorage.setItem('hrsu_lang', a.getAttribute('data-lang')); } catch (x) {} }
  });

  if (curCode !== 'en' || !Object.keys(alt).length) return;
  if (/bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent) || navigator.webdriver) return;

  var pref = null;
  try { pref = localStorage.getItem('hrsu_lang'); } catch (e) {}
  if (pref === 'en') return;
  if (pref && alt[pref]) { location.replace(alt[pref] + location.hash); return; }
  try { if (sessionStorage.getItem('hrsu_lang_dismissed')) return; } catch (e) {}

  var MAP = {
    fr: 'FR BE LU MC SN CI CM CD ML BF NE TG BJ GN GA CG MG HT DJ MA DZ TN',
    de: 'DE AT CH LI',
    pt: 'PT BR AO MZ CV GW ST TL',
    es: 'ES MX AR CL CO PE VE EC GT CU BO DO HN PY SV NI CR PA UY PR GQ',
    zh: 'CN TW HK MO',
    ja: 'JP',
    sw: 'KE TZ UG RW',
    af: 'ZA NA',
    my: 'MM',
    ar: 'SA AE EG IQ JO KW QA OM BH LB LY SD YE SY PS MR'
  };
  var C2L = {};
  Object.keys(MAP).forEach(function (l) { MAP[l].split(' ').forEach(function (c) { C2L[c] = l; }); });

  var T = { // banner text in each language: [message, button, stay]
    fr: ['Cette page est disponible en français.', 'Lire en français', 'Rester en anglais'],
    de: ['Diese Seite ist auf Deutsch verfügbar.', 'Auf Deutsch lesen', 'Auf Englisch bleiben'],
    pt: ['Esta página está disponível em português.', 'Ler em português', 'Continuar em inglês'],
    es: ['Esta página está disponible en español.', 'Leer en español', 'Seguir en inglés'],
    zh: ['本页面提供中文版本。', '阅读中文版', '继续使用英文'],
    ja: ['このページは日本語でもご覧いただけます。', '日本語で読む', '英語のまま'],
    sw: ['Ukurasa huu unapatikana kwa Kiswahili.', 'Soma kwa Kiswahili', 'Baki kwa Kiingereza'],
    af: ['Hierdie bladsy is in Afrikaans beskikbaar.', 'Lees in Afrikaans', 'Bly by Engels'],
    my: ['ဤစာမျက်နှာကို မြန်မာဘာသာဖြင့် ဖတ်ရှုနိုင်ပါသည်။', 'မြန်မာဘာသာဖြင့် ဖတ်ရန်', 'အင်္ဂလိပ်ဘာသာဖြင့်ပဲ ဆက်ဖတ်မည်'],
    ar: ['هذه الصفحة متوفرة باللغة العربية.', 'اقرأ بالعربية', 'البقاء على الإنجليزية']
  };

  function geo() {
    var f = (new URLSearchParams(location.search).get('geo') || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(f)) return Promise.resolve(f);
    try { var c = sessionStorage.getItem('hrsu_geo'); if (c !== null) return Promise.resolve(c); } catch (e) {}
    var t = new Promise(function (r) { setTimeout(function () { r(''); }, 1200); });
    var q = fetch('/api/geo', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { var c = (j && j.country) || ''; try { sessionStorage.setItem('hrsu_geo', c); } catch (e) {} return c; })
      .catch(function () { return ''; });
    return Promise.race([q, t]);
  }

  geo().then(function (country) {
    var lang = C2L[country];
    if (!lang || !alt[lang]) {
      var nl = (navigator.language || '').toLowerCase();
      var code = nl.indexOf('zh') === 0 ? 'zh' : nl.split('-')[0];
      if (alt[code] && code !== 'en') lang = code; else if (!lang || !alt[lang]) return;
    }
    // visitor's browser is set to English and they are not in a mapped region: leave alone
    if (AUTO) {
      try { localStorage.setItem('hrsu_lang_auto', lang); } catch (e) {}
      location.replace(alt[lang] + location.hash);
      return;
    }
    var tx = T[lang]; if (!tx) return;
    var bar = document.createElement('div');
    bar.className = 'lang-suggest'; bar.setAttribute('role', 'region'); bar.setAttribute('lang', lang);
    if (lang === 'ar') bar.setAttribute('dir', 'rtl');
    var m = document.createElement('span'); m.textContent = tx[0];
    var go = document.createElement('a'); go.className = 'go'; go.href = alt[lang] + location.hash; go.textContent = tx[1];
    go.addEventListener('click', function () { try { localStorage.setItem('hrsu_lang', lang); } catch (e) {} });
    var no = document.createElement('button'); no.type = 'button'; no.textContent = tx[2];
    no.addEventListener('click', function () {
      try { sessionStorage.setItem('hrsu_lang_dismissed', '1'); } catch (e) {}
      bar.remove();
    });
    bar.appendChild(m); bar.appendChild(go); bar.appendChild(no);
    document.body.appendChild(bar);
  });
})();
