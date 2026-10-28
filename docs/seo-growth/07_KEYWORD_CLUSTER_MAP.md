# Keyword Cluster Map

**Date:** 2026-10-28. Maps every researched keyword cluster (full detail in `05_GCC_KEYWORD_RESEARCH.csv`) to a primary existing or proposed URL, with cannibalization checks. This is the direct input to Phase 3's roadmap and `09_KEYWORD_TO_URL_MAP.csv`.

## 1. Structural decision: GCC location pages

**Recommendation: build location pages at the country level (and Qatar/Saudi Arabia/UAE specifically, since those are the brief's priority markets), not at the city level, and not as a single generic "Middle East" page.**

Reasoning, evidence-based:
- The realistic competitor tier (Wattlecorp, GuardsArm) uses **per-country dedicated URLs**, not a single regional page — supports building real `/locations/<country>/` pages rather than relying on the existing generic service pages alone.
- Within the UAE specifically, Abu Dhabi and Dubai showed **overlapping competitor sets** (the same firms — CPX, Help AG, Wattlecorp, DTS/Beyon Cyber, Securium Solutions — surfaced for both city queries) and **no strong evidence of distinct search demand** between the two cities, only distinct *regulatory bodies* (NESA/ADHICS for Abu Dhabi-oriented content vs. DESC/DIFC/VARA for Dubai-oriented content). This does not justify two separate pages yet.
- **Decision: one `/locations/uae/` page, UAE-national in scope, with a clearly delineated Abu Dhabi section (priority, per the brief) and a Dubai section**, each naming its real, correct regulatory bodies. Promote Abu Dhabi to its own full page only if future rank-tracking or Search Console data (once available — see Access Requirements) shows the two cities actually competing for genuinely different query sets.
- **Saudi Arabia**: build `/locations/saudi-arabia/` as a national page with named sections for Riyadh, Jeddah, and Dammam/Eastern Province (not separate pages) — same reasoning: real regulatory anchors exist (NCA, SAMA, CITC) but no evidence of city-level demand segmentation strong enough to justify full separate pages yet.
- **Qatar**: build `/locations/qatar/` — smaller market, single national page is sufficient, Doha covered within it.
- **Oman, Bahrain, Kuwait**: evidence is thinner (especially Oman, which had a real research coverage gap this pass) — **do not build dedicated pages yet**. Cover briefly within a single combined page (e.g., `/locations/gcc/` or short mentions appended to the Saudi Arabia/Qatar/UAE pages where a service naturally extends there) until a follow-up research pass or real demand evidence justifies dedicated pages. This directly follows the brief's explicit instruction not to create pages speculatively.
- **No programmatic city-swapped pages anywhere** — every location page above is proposed as a single, genuinely written page per approved market, consistent with the master brief's explicit prohibition on scaled low-value location pages.

## 2. Service-cluster mapping (existing pages get GCC-aware additions, not new URLs)

| Cluster | Primary existing URL | Action | Cannibalization check |
|---|---|---|---|
| Penetration testing (all GCC markets) | `/services/penetration-testing/` | **Improve existing page**: add a GCC-regulatory-aware section (verified NCA/SAMA/NESA/ADHICS references) and link to each relevant `/locations/<country>/` page | None — single clear target, location pages link *in* to this, not duplicate it |
| Web/application security, vulnerability assessment | `/services/vulnerability-assessment/` | Improve with PDPL/regulatory framing once verified | None |
| Cloud security | `/services/network-cloud-security/` | Improve with AWS/Azure/M365-specific mentions if genuinely offered | Check this doesn't overlap with `/blog/container-kubernetes-security-fundamentals/` — that post should link to this service page, not compete for the same commercial query |
| Compliance/regulatory | `/services/compliance-risk-assessment/` | Improve with GCC-specific framework mentions (already has a GCC-focused blog post: `gcc-cybersecurity-compliance-sama-nesa`) | Existing blog post + service page should cross-link, not both independently target the exact same commercial phrase |
| AI security (GCC) | `/services/ai-automation/` (partial fit only — not a strong match) | **Do not force a dedicated AI-security GCC page yet** (P3, low measured demand in SA/Qatar). Existing blog posts (`ai-coding-assistants-security-review-guide`, `ai-acceptable-use-policy-business-guide`) already cover this informationally | Low risk, low priority |
| Managed/SOC/SIEM services | None — explicitly not recommended | **Do not create any page for this cluster** pending Access Requirements A7 (owner confirmation of real capability) | N/A |

## 3. Industry-page overlap check

The 7 industry pages built in the prior session (`/industries/*`) are **not** GCC-location pages and should not be confused with them — they're vertical (SaaS, finance, healthcare, etc.), not geographic. No cannibalization risk between the two page types; in fact, a GCC location page for, say, Saudi Arabia could usefully link to `/industries/finance/` or `/industries/ecommerce/` where a researched query implies both a location and a vertical (e.g., "fintech security Dubai" — not separately researched this pass, flagged as a future query to check once the core location pages exist).

## 4. Keywords deliberately NOT targeted separately (avoiding cannibalization and false-scope claims)

- Every "SOC consulting / managed SIEM / managed security services" variant across every GCC market — one consistent decision, not per-market pages, per the scale-mismatch finding.
- City-level queries within Saudi Arabia and UAE (Riyadh/Jeddah/Dammam, Abu Dhabi/Dubai) — covered as sections of national pages, not separate URLs, per §1.
- "Cybersecurity consultant [city]" job-title-flavored queries (Riyadh, Abu Dhabi) — these return hiring demand, not buyer intent; not a content target at all, only referenced as market-activity evidence.
- AI security GCC queries — covered informationally on the existing blog, not given a dedicated new commercial page yet.

## 5. Arabic-language decision

**Do not build dedicated Arabic pages yet.** Two markets (Qatar, Dubai) showed a genuine-looking thin-competition signal for Arabic website-security queries, but every GCC-research fork flagged that this result set cannot be distinguished from a measurement artifact (no true Arabic-locale search was possible this session) without better tooling. Per the master brief's own rule ("do not publish machine-translated content without quality review" and "validate... with real evidence"), the honest recommendation is: **flag Arabic as a real, evidenced-but-unconfirmed opportunity for Phase 3's roadmap to revisit once either (a) Search Console shows real Arabic-market impressions, or (b) a native Arabic reviewer and proper geo-targeted research tooling are available (Access Requirements A6).**

## 6. Summary table — cluster → URL → status

| Cluster | Target URL | Status |
|---|---|---|
| Saudi Arabia (national + Riyadh/Jeddah/Dammam) | `/locations/saudi-arabia/` (new) | Proposed, P1 |
| UAE (national + Abu Dhabi/Dubai sections) | `/locations/uae/` (new) | Proposed, P1 |
| Qatar (national) | `/locations/qatar/` (new) | Proposed, P1 |
| Oman/Bahrain/Kuwait | Combined page or short mentions (new) | Proposed, P3 — pending more research |
| Penetration testing (GCC-aware) | `/services/penetration-testing/` | Improve existing, P1 |
| Vulnerability/web-app security (GCC-aware) | `/services/vulnerability-assessment/` | Improve existing, P1 |
| Cloud security | `/services/network-cloud-security/` | Improve existing, P2 |
| Compliance (GCC-aware) | `/services/compliance-risk-assessment/` | Improve existing, P2 |
| AI security (GCC) | Existing blog posts only | No new page, P3 |
| Managed SOC/SIEM | None | Do not target |
| UK/US/Canada/Australia | None | Deprioritized |
