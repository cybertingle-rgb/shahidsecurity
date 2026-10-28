# Automation Status

**Date:** 2026-10-28. States plainly and exactly what is and isn't automated for this project right now. No automated process is claimed to be running unless it's listed below as configured and verified.

## Currently configured: nothing

**No recurring scheduled trigger has been created for this project.** The weekly/monthly/quarterly workflows in `11_ONGOING_AGENT_RUNBOOK.md` are a documented process to run manually (by you, or by invoking a fresh session against this runbook) until you explicitly ask for one to be scheduled.

## What's available in this environment, if you want to turn it on

This Claude Code session has access to a cron-style scheduled-trigger mechanism that can fire a stored prompt on a recurring schedule, independent of this chat staying open. Turning this on for the weekly/monthly workflow is a real option — but it means an agent will run autonomously against this repository on a schedule, which the master brief itself says should not happen without explicit authorization (Phase 7: "Never claim that an agent is running continuously unless a real, persistent process has been configured and verified").

**This has not been requested, so nothing has been configured.** If you want it:
- Tell me the cadence you want (weekly technical+keyword check, monthly full report, or both).
- Confirm whether the scheduled run should be allowed to push code changes directly, or should only ever produce a report for you to review before anything is implemented (recommended default, matching how every batch of work in this project has been handled so far — report and request approval, not auto-publish).

## What's NOT automated and has no path to automation without new access

- **GSC/GA4 data pulls** — blocked entirely until A1/A2 access exists (see `04_ACCESS_REQUIREMENTS.md`). No schedule can fix a missing credential.
- **Live-site crawls** — this session has no live network access to shahidiqbal.com; a scheduled job running *in this same kind of sandboxed session* would hit the same block. A live crawl would need to run from an environment with that access (see A4).
- **Keyword volume/difficulty/CPC data** — no tool access exists; a schedule doesn't create data a tool doesn't provide (A5).

## Manual fallback (works today, no new access required)

Anyone can run the Phase 1 technical-crawl method at any time by:
1. `cd` into the repo, `pnpm build`
2. Run the crawl scripts used to produce `01_BASELINE_AUDIT.md` and `03_TECHNICAL_ISSUES.csv` (the methodology is documented in those files; the scripts themselves were written to the session's scratchpad and are reproducible from the same described logic)
3. Compare the output against the existing baseline files in this directory

This requires no scheduling, no new access, and no automation — just periodically re-running the same commands this project used to produce its baseline.
