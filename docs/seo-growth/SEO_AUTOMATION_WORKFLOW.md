# SEO Automation & Monitoring Workflow

**Date:** 2026-11-15. Refreshes `11_ONGOING_AGENT_RUNBOOK.md` and `13_AUTOMATION_STATUS.md` (2026-10-28) for the current state of the project (Phases 1-8 implemented; admin SEO health/overrides/redirects dashboard now exists at `/admin/dashboard/seo/`) and adds the master brief's Phase 12 competitor/trend monitoring workflow, which the October pass didn't cover.

## What's actually automated right now: nothing

Same as the October finding, still true today. **No recurring scheduled trigger has been created for this project.** Everything below is a documented process for a human or a manually-invoked session to run — not a live, unattended one. Nothing auto-publishes content, auto-changes indexed URLs, or auto-applies an SEO override; the admin dashboard's per-page overrides and redirects (`/admin/dashboard/seo/pages/`, `/admin/dashboard/seo/redirects/`) are human-in-the-loop by construction — writes require an explicit admin action, gated by `seo.manage`, and pushing an override live is a *separate*, explicitly-gated `seo.publish` action, not a side effect of saving.

## Weekly workflow (manual or scheduled, once approved)

1. Pull new Search Console data, if access exists (`04_ACCESS_REQUIREMENTS.md` A1).
2. Compare against `KEYWORD_RESEARCH_MASTER.xlsx` for new high-impression/low-CTR opportunities.
3. Re-run the technical crawl method used for `SEO_TECHNICAL_AUDIT.md` to catch regressions early; update `/admin/dashboard/seo/health/`'s hardcoded snapshot (`apps/gateway/src/admin-core/lib/seo/findings.ts`) if the finding set changed.
4. Check for cybersecurity developments worth a timely blog post — same verification standard as every prior blog batch in this project (verify the CVE/advisory/version/date before publishing, never invent one).
5. Flag existing content with outdated factual claims (a patched CVE that's aged, a changed vendor policy, an NCA/DESC/CBB regulatory detail that `GCC_KEYWORD_STRATEGY.md` already flagged as needing a current-rulebook check).
6. Produce a short prioritized punch list, not a full report.

## Monthly workflow

Per `12_MONTHLY_REPORT_TEMPLATE.md`. Unchanged in substance from October; now also:

7. Audit any new location/service pages published that month against the same validation suite used throughout this project (`pnpm astro check`, `pnpm build`, dup-check, canonical, sitemap, JSON-LD, phone-privacy sweep).
8. Review internal linking and cannibalization against `GCC_KEYWORD_STRATEGY.md` §2's rules as new content is added — a country hub picking up "penetration testing" in its own title, for example, would be a regression to catch here.

## Quarterly workflow

Per `11_ONGOING_AGENT_RUNBOOK.md`, with two concrete dates now set by this round's research:

- **Keyword/competitor refresh — next due 2027-02** (per `GCC_KEYWORD_STRATEGY.md` §5). Repeat the method in `KEYWORD_RESEARCH_MASTER.xlsx`/`COMPETITOR_ANALYSIS.md`, specifically re-checking: whether the NCA Haseen registration question (the gate on `/locations/saudi-arabia/*`) has been resolved; whether DESC Cyber Force / TDRA licensing claims for the UAE have been confirmed against primary sources; whether Oman's promotion from a `/locations/gcc/` section to its own page is justified by real impressions.
- **Arabic re-rating** — per `ARABIC_KEYWORD_RESEARCH.md` §4: watch Search Console for Arabic-query impressions on the two pages that ship first (once the AI-drafted content in `docs/seo-growth/arabic-drafts/` is reviewed and published), and re-rate Qatar/UAE Arabic pages 8-9 only once a real impression threshold is hit.

## Phase 12: competitor and trend monitoring (new this round)

The master brief's Phase 12 asks for an ongoing watch on competitor pages, cybersecurity news, new CVEs, regulatory updates, and emerging keywords, generating recommendations rather than automatic changes. In this environment, that means:

- **Competitor pages**: re-run `COMPETITOR_ANALYSIS.md`'s method quarterly (above) — this session has no standing ability to monitor competitor sites continuously, and the brief itself prohibits scraping in ways that violate a site's terms. Quarterly, point-in-time comparison is the honest cadence this environment supports.
- **CVE/regulatory monitoring**: covered by the weekly workflow's step 4-5 above — a human (or a manually-invoked session) checks primary sources (vendor advisories, NCA/DESC/CBB/NCSA regulator pages) on a weekly cadence. No automatic feed is wired up.
- **Search trends / emerging keywords**: covered by the monthly Search Console review (once A1 exists) and the quarterly keyword refresh. Without a paid keyword tool (A5), there is no live trend-spotting capability beyond what Search Console's own query data surfaces once it exists.
- **Output**: recommendations only — a dated note proposing new articles/pages, never an automatic publish. This matches the admin dashboard's own human-in-the-loop design: nothing in `/admin/dashboard/seo/` auto-applies a change to a live, indexed URL.

## Turning on real scheduling (not done; here's what it takes)

This Claude Code environment supports a cron-style scheduled trigger that can fire a stored prompt on a recurring schedule, independent of any chat session staying open. **This has not been requested or configured for this project.** If the owner wants it:

1. Decide the cadence (weekly technical+keyword check, monthly full report, or both).
2. Decide explicitly whether a scheduled run may push code changes directly, or must only ever produce a report for review before anything is implemented. **Recommended: report-and-request-approval**, matching how every batch of work in this project has been handled so far, and matching the admin dashboard's own publish-gate design.
3. Tell a session to create the trigger with that exact scope — it will not be created silently or by default.

## What has no path to automation without new access, regardless of scheduling

- GSC/GA4 data pulls (A1/A2) — no schedule fixes a missing credential.
- Live-site crawls (A4) — a sandboxed session has no outbound access to shahidiqbal.com; a scheduled job in the same kind of environment hits the same wall.
- Keyword volume/difficulty/CPC data (A5) — no tool access exists; nothing to schedule without it.

## Manual fallback (works today, no new access required)

Unchanged from October: `cd` into the repo, `pnpm build`, run the same crawl method documented in `SEO_TECHNICAL_AUDIT.md`, and compare against the baseline files in this directory. No scheduling, no new access, no automation — just periodically repeating the same commands this project has used throughout.
