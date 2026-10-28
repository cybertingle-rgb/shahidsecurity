# 12-Month SEO Growth Roadmap — Shahid Security

**Date:** 2026-10-28. Built from the evidence in `01_BASELINE_AUDIT.md` through `07_KEYWORD_CLUSTER_MAP.md`. Per the master brief: the first 90 days are specific and testable; months 4–12 are quarterly milestones to be revised against real performance data once it exists.

## Scoring framework (used throughout)

Each task below is scored 1–5 on: **Business impact**, **Evidence of demand**, **Implementation effort (inverted — 5 = low effort)**, **Confidence in evidence**, **Risk to existing SEO** (inverted — 5 = low risk). These are judgment-based priority signals, not a scientific prediction of ranking outcomes — stated plainly per the brief's own instruction.

## Priority groups (per Phase 4 of the brief)

- **P0 — Critical.** None found. The baseline audit found no indexing failures, accidental noindex on real pages, broken lead forms, or canonical conflicts. This is good news, not an omission — see `01_BASELINE_AUDIT.md` §3.
- **P1 — High value.** GCC location pages (Saudi Arabia, UAE, Qatar), GCC-aware improvements to the penetration-testing and vulnerability-assessment service pages, image lazy-loading fix (T04), live-redirect verification (T03).
- **P2 — Growth opportunities.** Compliance/cloud-security service page improvements, Oman/Bahrain/Kuwait combined page (pending more research), case-study content (pending real client material), digital-PR/backlink groundwork.
- **P3 — Experiments.** AI-security GCC content, Arabic-language pages, Canada (international), sitemap noindex-tag-page cleanup.

## Days 1–30

| Task | Group | Business impact | Evidence | Effort (inv.) | Confidence | Risk (inv.) | Acceptance criteria |
|---|---|---|---|---|---|---|---|
| Get GSC/GA4 access (Access Requirements A1/A2) | P1 | 5 | 5 | 5 | 5 | 5 | Real impressions/clicks/CTR data available for at least 1 full month by day 30 |
| Fix T04: add explicit `loading="lazy"`/`loading="eager"`+`fetchpriority="high"` to images | P1 | 3 | 5 | 4 | 5 | 5 | Re-crawl shows &lt;10% of images with no loading attribute (down from 97%) |
| Verify the 23 `.htaccess` redirects against the live site (needs A4, or owner runs it) | P1 | 4 | 5 | 5 | 3 | 5 | `node scripts/verify-redirects.mjs https://shahidiqbal.com` passes all 23 rules |
| Independently verify every regulatory framework name before any GCC content cites it (NCA, SAMA, CITC, NESA, ADHICS, DESC, DIFC, VARA, PDPL) | P1 | 5 | 5 | 2 | — | 5 | Each framework's official source checked and cited correctly, or explicitly dropped if unverifiable |
| Draft `/locations/saudi-arabia/` (national, Riyadh/Jeddah/Dammam sections) | P1 | 5 | 4 | 3 | 4 | 4 | Page passes the same validation suite as the industry pages (build, dup-check, JSON-LD, sitemap) before any request to deploy |
| Draft `/locations/uae/` (national, Abu Dhabi priority + Dubai sections) | P1 | 5 | 4 | 3 | 4 | 4 | Same as above |
| Draft `/locations/qatar/` (national) | P1 | 4 | 4 | 4 | 4 | 4 | Same as above |
| Add GCC-regulatory-aware section to `/services/penetration-testing/` | P1 | 5 | 4 | 4 | 4 | 4 | Section added, cross-links to the 3 new location pages, no claim without a verified source |
| Get owner's A7 answer: what managed/SOC-style capability (if any) can be honestly claimed | P1 | 4 | 5 | 5 | — | 5 | One clear answer recorded; used to finalize whether any SOC-adjacent content is written at all |

## Days 31–60

| Task | Group | Notes |
|---|---|---|
| Add GCC-regulatory-aware section to `/services/vulnerability-assessment/` | P1 | Same pattern as pentest page |
| Request owner/native-speaker decision on Arabic content (A6) | P2 | Determines whether Arabic work starts this quarter or is deferred |
| Deep individual review of Cyberkov (Kuwait) as the closest scale-comparable competitor | P2 | Input to refining Shahid Security's own positioning language |
| Follow-up Oman-specific research pass (the one market with a real research coverage gap) | P2 | Resolve whether Oman gets its own page section |
| Cloud security (`/services/network-cloud-security/`) GCC-aware improvement | P2 | Lower priority than pentest/VA — smaller evidenced demand this pass |
| Compliance (`/services/compliance-risk-assessment/`) GCC-aware improvement, cross-linked with the existing `gcc-cybersecurity-compliance-sama-nesa` blog post | P2 | Fixes a minor existing content/service cross-link gap |

## Days 61–90

| Task | Group | Notes |
|---|---|---|
| Review first ~60 days of real GSC data (if access granted) against the keyword clusters in `05_GCC_KEYWORD_RESEARCH.csv` — update priorities with real impressions/CTR instead of evidence-only signals | P1 | This is the first point real measurement can start informing the roadmap rather than public research alone |
| Decide on Oman/Bahrain/Kuwait combined page vs. continued deferral, based on the follow-up research from days 31–60 | P2 | |
| Begin digital-PR/backlink groundwork (see `06_COMPETITOR_ANALYSIS.md` — a genuine, non-comparison-shopping buyer's guide content format; outreach to any legitimate GCC cybersecurity community/association) | P2 | No purchased links, no PBNs, no link exchanges — per master brief Phase 3.5 |
| Re-run the full technical crawl (Phase 1.2 method) to confirm no regressions from the quarter's changes | P1 | Compare against the `01_BASELINE_AUDIT.md` baseline |

## Months 4–6 (quarterly milestone)

- Evaluate whether `/locations/uae/`'s Abu Dhabi and Dubai sections show genuinely different query performance in GSC (if access was granted) — split into separate pages only if evidenced.
- Revisit AI-security GCC demand with fresh research — this was explicitly flagged as low-but-real and worth re-checking, not permanently dismissed.
- First real competitor-analysis refresh (Phase 3 of the brief calls for quarterly repeats).
- Decide, based on real data, whether Canada (the one soft positive signal in the international research) merits a first small test.

## Months 7–9 (quarterly milestone)

- Full content-cluster audit: are the GCC location pages and service-page improvements actually producing qualified inquiries (requires A2/conversion tracking, see `10_CONVERSION_TRACKING_PLAN.md`)?
- Case-study content: revisit only if real, permissioned client material has become available — never manufactured.
- Backlink/digital-PR progress review.

## Months 10–12 (quarterly milestone)

- Full-year retrospective against the `01_BASELINE_AUDIT.md` baseline: indexability, impressions, clicks, qualified inquiries.
- Decide next year's market priorities based on actual evidence accumulated, not the original research alone.
- Reassess the Arabic-language decision with a full year of signal.

## What this roadmap deliberately does NOT include

- Any UK/US/Canada/Australia content investment (deprioritized, see `06_COMPETITOR_ANALYSIS.md`).
- Any managed SOC/SIEM/24-7-monitoring content (scale mismatch, pending A7).
- Any city-level Saudi Arabia or UAE pages beyond the sections already planned (no evidence of demand justifying the split).
- Any Arabic content before a native reviewer is engaged (A6).
- Any programmatic/templated page generation of any kind.
