# SEO Growth Project — Changelog

**Project dates:** 2026-11-15 (building on a 2026-10-28 audit/research baseline). Branch: `claude/wizardly-keller-yg0bj7`. Every entry below is a real commit on this branch — check the hash for the full diff.

## Phase 1 — Technical re-audit (`SEO_AUDIT_REPORT.md`, `SEO_TECHNICAL_AUDIT.md`, `SEO_URL_INVENTORY.csv`, `SEO_PRIORITY_MATRIX.md`)
Commit `6579f80`. Re-ran the Oct 28 audit against the current codebase (235→242 pages across this project, post platform-consolidation into `apps/gateway`, new `/pricing/` and `/industries/` pages). Confirmed the October strengths still held (0 duplicate titles/descriptions, 0 missing canonicals, 0 heading issues, 0 missing alt text, 0 broken links, 0 fabricated schema) and found 13 new/carried-over findings (F1-F13), detailed below as they were resolved.

## Phase 2 — Keyword research refresh (`KEYWORD_RESEARCH_MASTER.xlsx`, `KEYWORD_TO_URL_MAPPING.csv`, `GCC_KEYWORD_STRATEGY.md`, `ARABIC_KEYWORD_RESEARCH.md`)
Commits `6579f80`, `2ad64e4`. 106 keywords researched (97 English, 9 Arabic), cannibalization-checked by script. Reversed two October findings with new evidence: Saudi Arabia (not Qatar/Dubai) is the best first Arabic market, and SOC/managed-security positioning needed updating since `/pricing/` now sells a non-gated Co-Managed tier.

## Phase 3 — Competitor analysis refresh (`COMPETITOR_ANALYSIS.md`, `COMPETITOR_KEYWORD_GAPS.xlsx`, `SEO_GROWTH_OPPORTUNITIES.md`)
Commit `6579f80`. Found a genuinely new constraint the October pass missed: Saudi Arabia (NCA/Haseen), Dubai (DESC Cyber Force) and Qatar all have cybersecurity-provider accreditation/licensing requirements since 2022-2024, narrowing realistic near-term targets to private-sector SMEs.

## Phase 4 — Consolidated implementation plan (`SEO_IMPLEMENTATION_PLAN.md`)
Commit `8320f79`. Reconciled a real disagreement between Phase 2 (wanted the Saudi page built immediately) and Phase 3 (found the unverified NCA registration question) in favor of the more conservative sequencing — Saudi Arabia location pages are gated pending the owner confirming whether Haseen registration applies to a remote foreign provider.

## Phase 6 — Technical SEO corrections
Commits `e62d565`, `e8e191d`.
- **F3**: all 99 oversized meta descriptions rewritten (86 blog posts + 13 pages). Added an optional `seoDescription` field to the case-study content schema rather than shortening the on-page narrative.
- **F9**: `/terms/` and `/learn/pricing/` descriptions lengthened from truncated-looking to genuinely informative.
- **F6**: `/learn/login/`, `/learn/register/`, `/learn/forgot-password/` now noindexed to match their siblings.
- **F5**: explicit `loading`/`fetchpriority` attributes added across Header/Footer/LunaWidget and remaining `<img>` call sites.
- **Not done, by design**: F4 (installing analytics) — requires explicit owner approval per the project's own rule; still open.

## Phase 7 — Service page SEO rewrite
Commit `d4c555f`. Mapped the brief's 15 named services onto the existing 10 service pages (IoT, SIEM, OSINT, security auditing, and the consulting umbrella as sub-sections/FAQs rather than new thin pages, per `KEYWORD_TO_URL_MAPPING.csv`'s own assignments). Added a `relatedServices` field + cross-link section (didn't exist before), VAPT terminology, and a GCC/Pakistan link block on the pentest and vulnerability-assessment pages.

## Phase 8 — GCC/Pakistan location pages + Arabic drafts
Commits `f6c0857`, `d712c9e`. New pages: `/locations/` (hub), `/locations/pakistan/`, `/locations/uae/` + `/locations/uae/penetration-testing/`, `/locations/qatar/`, `/locations/gcc/` (Oman/Bahrain/Kuwait). Saudi Arabia excluded per the Phase 4 gate. Two Arabic content drafts written (NCA ECC guide, compliance service page) — explicitly not live, pending native-speaker review.

## Phase 9 — 90-day content calendar + E-E-A-T
Commit `4c92cea`. 22-article calendar; found incident response has zero existing blog coverage despite being a named service — the most notable content gap. E-E-A-T review made no changes: CEH/CISSP were already correctly labeled training-level, the responsible-disclosure page already exists, author-bio boxes already present site-wide.

## Phase 10 — Core Web Vitals + analytics audit, and the fix it found
Commits `82472ec`, `3d4dc7a`. Real Lighthouse runs (not estimated) found LCP/CLS passing everywhere but TBT (used as an INP proxy, since INP needs a live interaction) missing on mobile/blog and all 5 desktop pages tested — root-caused to `CursorParticles.astro` running an unconditional animation loop from page load forever. Fixed: skip entirely on touch devices, lazy-start/stop the loop so it only runs while particles are active. Also corrected a stale finding in the conversion-tracking plan (the old PHP contact/booking scripts were replaced by DB-backed Node routes during platform consolidation) and confirmed analytics is still genuinely absent (not touched — same F4 approval gate).

## Phase 11 — Admin SEO dashboard
Commit `fcc6558`. Found that page-metadata overrides and redirect management already existed from prior session work and correctly avoided duplicating them. Built the one missing piece: a read-only `/admin/dashboard/seo/health` viewer surfacing the Phase 1 findings (F1-F13) to the admin, instead of requiring someone to open a markdown file.

## What's still open (owner-dependent, cannot be closed from a sandboxed session)
- **F1/F2**: No Google Search Console, GA4, or live network access to shahidiqbal.com this session — every finding above is evidence-based from the local build/public web search, not outcome-verified against production.
- **F4**: Analytics installation needs explicit owner approval (a new third-party script) before it happens.
- **Saudi Arabia location pages**: gated on the owner confirming whether NCA Haseen registration applies to a remote foreign provider.
- **Arabic pages**: drafted, not live — need native-speaker review (ideally Saudi, cybersecurity-literate) before publishing.
- **F7**: more case studies and third-party reviews need real client permission, not code — flagged, not fabricated.
- **F11**: 22 legacy `.htaccess` redirect rules still need live verification against the production server.
