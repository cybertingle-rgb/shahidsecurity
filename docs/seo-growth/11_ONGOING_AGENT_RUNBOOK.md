# Ongoing SEO Agent Runbook

**Date:** 2026-10-28. Defines the ongoing operating process per the master brief's Phase 7. This is a process design document — nothing here has been scheduled or activated yet (see `13_AUTOMATION_STATUS.md` for exactly what is and isn't configured).

## What scheduling/automation is actually available in this environment

This Claude Code session has two real automation primitives available:
- A **cron-style scheduled trigger** mechanism that can fire a stored prompt on a recurring schedule, independent of any one chat session.
- A **dynamic wakeup** mechanism for self-pacing within an active loop.

Neither is currently configured for this project. Setting one up is itself an action that needs your explicit authorization (it would run autonomously, touching the live repository and potentially the live site, on a recurring basis) — this runbook defines *what* the recurring workflow should do once you approve turning it on, not a claim that it's already running.

## Weekly workflow (manual or scheduled, once approved)

1. Pull new Search Console data (if access exists — see `04_ACCESS_REQUIREMENTS.md` A1).
2. Identify new high-impression/low-CTR query opportunities — compare against `05_GCC_KEYWORD_RESEARCH.csv`.
3. Re-run the technical crawl (`seo-crawl.mjs`-style script, same method as `01_BASELINE_AUDIT.md`) to catch indexing or technical regressions early.
4. Check for cybersecurity developments worth a timely blog post (same verification standard as every prior blog batch in this project — no invented CVEs, verified advisory/version/date before publishing).
5. Flag any existing content with outdated factual claims (a patched CVE that's aged, a changed vendor policy, etc.).
6. Produce a short prioritized action note — not a full report, a punch list.

## Monthly workflow

1. Performance review by target country and keyword cluster (uses `12_MONTHLY_REPORT_TEMPLATE.md`).
2. Compare against the same period concept where seasonality might matter (e.g., Ramadan timing shifts year to year and can affect GCC business search behavior — note this explicitly rather than assuming a flat month-over-month comparison is always fair).
3. Audit any URLs published or substantially changed that month against the validation suite used throughout this project (build, dup-check, canonical, sitemap, JSON-LD, phone-privacy sweep).
4. Review internal linking and cannibalization — re-check `07_KEYWORD_CLUSTER_MAP.md` still holds as new content is added.
5. Review conversions (per `10_CONVERSION_TRACKING_PLAN.md`) — real numbers only, once GA4 exists.
6. Reassess `08_12_MONTH_ROADMAP.md` against what the month's real data actually showed.
7. Propose the next implementation batch — do not auto-publish it.

## Quarterly workflow

1. Repeat the competitor and keyword-gap research (same method as `06_COMPETITOR_ANALYSIS.md`), looking specifically for new entrants or shifted positioning among the competitor set already identified.
2. Review whether GCC market priorities (Saudi Arabia/Qatar/UAE primary, Oman/Bahrain/Kuwait secondary, UK/US/CA/AU deprioritized) still hold given real data.
3. Audit the content architecture — are the location pages and service-page improvements still structured correctly, or has evidence emerged for splitting/merging anything (e.g., the Abu Dhabi/Dubai question)?
4. Review backlink/digital-PR progress against the Phase 3.5 plan.
5. Reassess the Arabic-language decision specifically.
6. Report which activities produced a measurable outcome — and which didn't, honestly.

## Automation safeguards (binding, not optional)

- **Low-impact crawl rate** — the local build crawl is effectively free (no live requests); any future *live* crawl must be rate-limited and must not hammer shahidiqbal.com or any competitor site.
- **No unnecessary repeated full-site crawls** — weekly is sufficient for the technical check; don't crawl more often without a specific reason.
- **Never bypass authentication or access restrictions** anywhere.
- **Never print credentials, tokens, or secrets** in any report this runbook produces.
- **Do not automatically publish sensitive vulnerability content** — every CVE/advisory-based post follows the same verification standard already established in this project (verify the identifier, affected versions, official advisory, and disclosure timeline before publishing; never invent one).
- **No mass URL, canonical, robots, schema, or redirect changes without review** — every such change in this project so far has been one deliberate, reviewed batch, not an automated sweep.
- **No repetitive pages created merely to satisfy a schedule** — if a weekly/monthly cycle finds nothing worth publishing, the correct output is "nothing to publish this cycle," not manufactured content.
- **Store dated reports and compare against previous ones** — every report this runbook produces should be a new dated file (or a dated section), not an overwrite that destroys the history needed for valid before/after comparison.
- **Record the evidence and reasoning behind every major recommendation** — matching the standard already set in `05_GCC_KEYWORD_RESEARCH.csv` through `07_KEYWORD_CLUSTER_MAP.md` (source, date, confidence level, never a bare assertion).

## What "ongoing agent" means in practice, honestly

Until you explicitly approve scheduling this (and a real recurring trigger is configured and verified), this is a **runbook for a human or a manually-invoked session to follow**, not a live autonomous process. See `13_AUTOMATION_STATUS.md` for the exact current state.
