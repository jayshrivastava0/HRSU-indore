# Translation job: HRSU Indore technical learn pages (calcium nitrate)

You translate English website text into ONE target language. The site is a B2B chemical manufacturer (industrial-grade calcium nitrate tetrahydrate). Readers are engineers, procurement managers and importers. Write natural, precise, professional technical prose in the target language (as a native chemical-industry technical writer would), not word-for-word.

## Input / output
- Input file: a JSON object `{ "<id>": {"type": "p" | "h", "en": "<english text>"} , ... }`.
- Output file: a JSON object `{ "<id>": "<translation>", ... }` containing EVERY id from the input, nothing else. Same ids. Write it with the Write tool, valid UTF-8 JSON.
- After writing, VERIFY it parses and has every id: run
  `python -c "import json,sys; a=json.load(open(sys.argv[1],encoding='utf-8')); b=json.load(open(sys.argv[2],encoding='utf-8')); print(len(a), len(b), set(a)-set(b))" <input> <output>`
  If it fails (usually an unescaped double quote inside a string: HTML attributes need `\"` inside JSON), fix and re-verify. The last printed set must be empty.

## Rules
1. `type: "p"` = plain text. Return plain text only, no HTML tags.
2. `type: "h"` = contains inline HTML (`<a href="...">`, `<strong>`, `<b>`, `<sub>`, `<sup class="cite">`, `<br>` etc.). Keep EVERY tag, attribute and href EXACTLY as is and in the same order; translate only the text between tags. Do not add, remove or reorder tags. Do not translate anything inside a tag's attributes (href, class, id).
3. Keep unchanged: numbers (always Western digits 0-9, never Arabic-Indic or Burmese digits), units (mg/L, kg, MT, °C, %), chemical formulas and symbols (Ca(NO3)2, H2S, SO4, NO3-), CAS numbers, standards/acronyms (COA, TDS, SDS, REACH, TSCA, ASTM, EPA, ACI, FOB, CIF, DDP, EXW, MOQ, HS), company/brand names (HRSU, HRSU Indore Pvt. Ltd.), URLs, emails, phone numbers, and citation markers like `[1]`.
4. Translate every number's meaning exactly. Never invent, soften or strengthen a claim (the English deliberately says "no evidence found", "does not claim", etc.: preserve that precisely).
5. Decimal separators and thousands separators: follow the target language's convention only if it does not change the digits.
6. Keep it concise like the source. Same sentence structure/length where natural. UI words (Home, Learn, Request a quote, Download TDS/SDS, Frequently asked questions, References, Related guides) must be translated consistently every time.
7. Do not add commentary. Do not leave English sentences untranslated (proper nouns, acronyms and formulas excepted).

## Glossary (use these terms consistently)
- calcium nitrate: fr "nitrate de calcium"; de "Calciumnitrat"; pt "nitrato de cálcio"; es "nitrato de calcio"; zh "硝酸钙"; ja "硝酸カルシウム"; sw "nitrati ya kalsiamu"; af "kalsiumnitraat"; my "ကယ်လ်ဆီယမ်နိုက်ထရိတ်"; ar "نترات الكالسيوم"
- calcium nitrate tetrahydrate: fr "nitrate de calcium tétrahydraté"; de "Calciumnitrat-Tetrahydrat"; pt "nitrato de cálcio tetra-hidratado"; es "nitrato de calcio tetrahidratado"; zh "四水硝酸钙"; ja "硝酸カルシウム四水和物"; sw "nitrati ya kalsiamu tetrahydrate"; af "kalsiumnitraat-tetrahidraat"; my "ကယ်လ်ဆီယမ်နိုက်ထရိတ် tetrahydrate"; ar "نترات الكالسيوم رباعية الماء"
- hydrogen sulfide (H2S): use the standard local term + keep "H2S" (e.g. fr "sulfure d'hydrogène (H2S)", de "Schwefelwasserstoff (H2S)", es "sulfuro de hidrógeno (H2S)", zh "硫化氢 (H2S)", ja "硫化水素 (H2S)", ar "كبريتيد الهيدروجين (H2S)")
- Certificate of Analysis (COA): keep "COA" with a local expansion once where natural (e.g. fr "certificat d'analyse (COA)", de "Analysenzertifikat (COA)", zh "分析证书 (COA)", ja "分析証明書 (COA)", ar "شهادة التحليل (COA)")
- industrial grade: fr "qualité industrielle"; de "technische Qualität"/"Industriequalität"; pt "grau industrial"; es "grado industrial"; zh "工业级"; ja "工業用グレード"; ar "درجة صناعية"
- Request a quote: fr "Demander un devis"; de "Angebot anfordern"; pt "Solicitar cotação"; es "Solicitar cotización"; zh "获取报价"; ja "見積依頼"; sw "Omba bei"; af "Versoek 'n kwotasie"; my "စျေးနှုန်းတောင်းခံရန်"; ar "اطلب عرض سعر"
- Other terms: choose the standard term in the target language's chemical/engineering usage; if unsure of a Burmese or Swahili technical term, transliterate or keep the English term in parentheses on first use rather than inventing one.
