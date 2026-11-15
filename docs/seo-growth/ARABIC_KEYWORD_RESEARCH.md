# Arabic Keyword Research (directional)

**Date:** 2026-11-15. Refreshes the Arabic rows in `05_GCC_KEYWORD_RESEARCH.csv` and §5 of `07_KEYWORD_CLUSTER_MAP.md` (2026-10-28).

> **Status: DIRECTIONAL RESEARCH, NOT VERIFIED DATA.** These searches ran in Arabic through a US-located web search tool, not a Saudi/UAE/Qatar Google locale. The tool returns a sample of results plus a model-written summary, not a full ranked results page. We had no autocomplete data (the session proxy blocked it) and no volume, difficulty or CPC data. The findings show **what kind of Arabic content exists and who publishes it**. They don't show how many people search. The Arabic keyword phrasing below is standard Modern Standard Arabic used by the observed sites and by NCA; a native Arabic marketer should still review it for the local spellings buyers actually type (for example الامن vs الأمن, or the colloquial "اختبار اختراق" without the definite article).

---

## 1. Queries run and what came back

| Arabic query (English gloss) | What the results showed | Read |
|---|---|---|
| اختبار الاختراق السعودية شركة (penetration testing company Saudi Arabia) | Almost entirely **ScienceSoft `/ar/` pages**: an international firm with a Riyadh address and fully translated service, contact and case-study pages. No Saudi-native Arabic pentest service page surfaced. | Thin competition. One well-resourced international firm has invested in Arabic. That suggests the firm sees value, but proves nothing about volume. |
| شركة أمن سيبراني دبي (cybersecurity company Dubai) | MBG Corp `/ar/` VAPT page, ICD Technologies, zoftwarehub `/ar-ae/`. Several English pages (CYPFER, Wattlecorp, Qualysec) were returned for the Arabic query. | Arabic intent is partly served by **English pages**. UAE B2B buying looks English-first. Weak case for Arabic UAE pages early. |
| خدمات الأمن السيبراني الرياض شركات (cybersecurity services companies Riyadh) | A Riyadh freelance consultant's profile, ScienceSoft `/ar/`, Resecurity `/ar/`, AI-listicle pages (aisuperior `/ar/`). No clear local commercial leader. | Gap. There's no strong Arabic "company in Riyadh" page to beat. |
| تقييم الثغرات الأمنية خدمات السعودية الإمارات (vulnerability assessment services KSA/UAE) | **nca.gov.sa Arabic service pages** (NCA's technical-assessment service, for national entities only), MBG Corp `/ar/`, ScienceSoft `/ar/`, zoftwarehub. | Government Arabic content anchors the topic. Commercial Arabic competition is thin. |
| الأمن السيبراني قطر شركة اختبار الاختراق الدوحة (pentest company Doha, Qatar) | An Arabic job board (naukrigulf Arabic), a generic Guru99 Arabic "top 8 pentest companies" list, and mostly **English** listicles (DeepStrike, Qualysec). | Same pattern as Oct 28: no Arabic Qatar commercial pages. Still unclear whether that's a gap or simply low Arabic demand. |
| استشارات ISO 27001 السعودية الضوابط الأساسية للأمن السيبراني NCA ECC امتثال (ISO 27001 / NCA ECC compliance consulting, KSA) | The **richest Arabic result set**: Resecurity's **Arabic "الامتثال لمتطلبات NCA ECC" page**, Cloud Security Alliance, an academic paper on ECC vs ISO 27001, SmartSuite ECC-2:2024 framework pages, Clyde & Co, Seclore. | **Strongest Arabic signal found.** ECC is published by NCA in Arabic, compliance teams work in Arabic, and an established vendor has built an Arabic ECC page. |

### Arabic terms observed in results

| Arabic term | Meaning | Where it surfaced |
|---|---|---|
| اختبار الاختراق | penetration testing | ScienceSoft `/ar/`, Guru99 `/ar/`, job boards |
| تقييم الثغرات الأمنية | vulnerability assessment | MBG Corp `/ar/`, NCA |
| تقييم الأمن السيبراني | cybersecurity assessment | MBG Corp `/ar/` page title |
| الأمن السيبراني | cybersecurity | universal |
| خدمات الأمن السيبراني | cybersecurity services | ScienceSoft `/ar/`, consultant profile |
| الضوابط الأساسية للأمن السيبراني | Essential Cybersecurity Controls (NCA ECC) | NCA, Resecurity `/ar/` |
| الامتثال | compliance | Resecurity `/ar/` |
| الهيئة الوطنية للأمن السيبراني | National Cybersecurity Authority | NCA, vendor pages |
| الاختراق الأخلاقي | ethical hacking / red teaming | ScienceSoft `/ar/` |
| الاستجابة للحوادث | incident response | general (not separately searched) |
| مركز العمليات الأمنية | security operations centre | Arabic summary of Wattlecorp's services |

---

## 2. Is there genuine Arabic demand and competition?

| Market | Arabic competition (observed) | Arabic demand (inferred, unverified) | Verdict |
|---|---|---|---|
| **Saudi Arabia** | Low to moderate. A few international firms (ScienceSoft, Resecurity) have Arabic pages. Few or no Saudi SMB-scale firms with strong Arabic service pages surfaced. | **Most plausible of the GCC.** The regulator (NCA) publishes in Arabic, ECC compliance work is done in Arabic, and Saudisation of procurement and compliance roles raises the share of Arabic-first buyers. | **Pursue first, starting with NCA ECC compliance content.** |
| UAE | Low in Arabic, but Arabic queries return English pages | Lower. UAE B2B buyers are largely expat and English-first, and Arabic results lean on English content. | Defer. English UAE pages first. |
| Qatar | Very low (no Arabic commercial pages found, again) | Unknown. It could be a gap or simply low demand; this tool can't tell the difference. | Defer. Revisit after Saudi Arabic pages produce Search Console data. |
| Oman / Bahrain | Not searched in Arabic this pass | Unknown | Not now. |

**Change vs Oct 28:** Oct 28 rated Qatar and Dubai as the strongest Arabic signals and Saudi Arabic as "inconclusive / deprioritize". This pass reverses that order. Qatar and Dubai looked "empty" partly because Arabic searches there return English pages. Saudi Arabia showed actual Arabic commercial and regulatory content, especially around NCA ECC. Arabic content attracts investment there, which is a better (though still indirect) sign of demand than an empty results page.

---

## 3. Recommendation: first Arabic pages (in order)

All of these depend on **Access Requirement A6**: a native Arabic reviewer, ideally Saudi, who knows cybersecurity terms. **No machine-translated copy goes live unreviewed.** Each page needs `hreflang="ar-SA"` (or `ar`) ↔ `en` pairs, `dir="rtl"`, its own Arabic title and meta description, and an Arabic-capable contact path. Arabic-speaking consultation availability must be real before you promise it.

| # | Proposed Arabic page | English source | Primary Arabic target | Why |
|---|---|---|---|---|
| 1 | `/ar/blog/nca-ecc-compliance-saudi-arabia-guide/` | existing NCA ECC blog | الامتثال للضوابط الأساسية للأمن السيبراني | Strongest observed Arabic ecosystem; existing English content to adapt; informational entry point for KSA compliance buyers |
| 2 | `/ar/services/compliance-risk-assessment/` | existing compliance page | استشارات الامتثال للأمن السيبراني / تقييم فجوات ECC | Commercial conversion page for #1; the English page already covers ECC-2:2024 and SAMA |
| 3 | `/ar/locations/saudi-arabia/penetration-testing/` | proposed EN KSA pentest page | اختبار الاختراق السعودية | Arabic results dominated by one international firm, so there's room to compete |
| 4 | `/ar/locations/saudi-arabia/` | proposed EN KSA hub | شركة أمن سيبراني الرياض / خدمات الأمن السيبراني السعودية | No clear local Arabic leader observed |
| 5 | `/ar/` (Arabic homepage) | `/` | الأمن السيبراني (brand + services) | Needed for Arabic navigation, internal links and hreflang consistency |
| 6 | `/ar/services/vulnerability-assessment/` | existing VA page | تقييم الثغرات الأمنية | Thin commercial Arabic competition; NCA anchors the topic |
| 7 | `/ar/contact/` (or Arabic form on `/ar/`) | `/contact/` | — | Conversion path; without it, Arabic traffic leaks |
| 8 | `/ar/locations/uae/` | proposed EN UAE hub | شركة أمن سيبراني دبي | Later. Only if Search Console shows Arabic UAE impressions |
| 9 | `/ar/locations/qatar/` | proposed EN Qatar page | اختبار الاختراق قطر | Later, same condition |

**Do first:** pages 1–5 and 7 (Saudi-focused). **Gate pages 8–9** on Search Console data from the `/ar/` pages: at least a few hundred Arabic-query impressions from AE or QA over 90 days would justify them. That threshold is a suggested rule of thumb, not a benchmark.

---

## 4. How to confirm before investing heavily

1. Ship pages 1–2 first (lowest cost, since the English content exists). Watch Search Console for Arabic queries and impressions from SAU for 60–90 days.
2. If possible, check a keyword tool's **Saudi Arabia database in Arabic** for the terms in §1 and record volume with a source date.
3. Have the native reviewer collect real buyer phrasing, for example from Saudi client RFPs or procurement portals (Etimad tender titles are in Arabic).
4. Re-rate this document's verdicts with that data. Until then, treat every row above as a hypothesis.
