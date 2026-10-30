# 24/7 Managed Detection & Response — Internal SOC Readiness Assessment

Status at time of writing: **Not operationally assessed as ready.** `soc_readiness_settings.availability`
defaults to, and currently remains, `disabled`. Nothing in this codebase moves that value — only an
authorized admin, deliberately, from `/dashboard/pricing` in the admin app.

## Why this document exists

The business brief for the pricing/managed-security build is explicit: Shahid Security intends to deliver
24/7 monitoring through its **own internal team**, not a resold third-party SOC — but only once internal
staffing, shift coverage, backup coverage, and escalation arrangements genuinely support it. It also says,
just as explicitly: *"Do not invent current employee numbers or claim that current staffing is sufficient."*

I have no access to Shahid Security's actual current headcount, shift roster, analyst skill levels, SIEM/EDR
deployment, or on-call arrangements — nothing in this repository records that information, and no one has
supplied it to me. So this document does two things, kept clearly separate:

1. **A staffing/cost model** — the actual math for what continuous human coverage requires, which is a
   fact about SOC operations in general, not about Shahid Security specifically.
2. **A checklist against the brief's own 18 readiness factors** — each one marked "not yet assessed /
   unknown" rather than guessed, with what would need to be true to mark it ready.

Nothing here should be read as "Shahid Security already has X" unless a later revision of this document says
so explicitly, with a real source.

## 1. The staffing math (general, not Shahid-Security-specific)

True 24/7/365 coverage with a single analyst "seat" always staffed needs more than 3 people on 8-hour
shifts, because of weekends, holidays, annual leave, sick leave, and training time that a 3-person rotation
has no slack for.

Standard SOC staffing-model arithmetic:

- Hours needed per year for one continuously-staffed seat: 24 × 365 = **8,760 hours/year**.
- A single full-time analyst, after public holidays (~10 days), annual leave (~20 days), sick leave
  (~5 days, budgeted), training/admin time (~5 days), and realistic shift-handover/break overhead, delivers
  roughly **1,700–1,850 productive coverage hours/year** — not the naive 2,080 (40h × 52 weeks).
- Minimum analysts required for one continuously-staffed seat ≈ 8,760 ÷ 1,750 ≈ **~5.0 FTE** — the
  commonly-cited "4.5–5 analysts per 24/7 seat" rule of thumb in SOC staffing literature, not a number
  invented for this document.
- That is the minimum for **one person on duty at all times**. Realistic MDR delivery needs more than that:
  - A **backup/escalation path** for when the on-duty analyst is unavailable mid-incident (sick, network
    issue, already handling a P1) — effectively a second rotation, even if thinner.
  - An **incident commander / on-call senior** reachable for P1s, distinct from the triage analyst.
  - **Overlap at shift handover** so context isn't lost between shifts.
- A credible first-phase 24/7 MDR operation — one analyst on duty at all times, with real backup and
  escalation, not just a rotation that happens to average out — realistically needs on the order of
  **8–12 trained people** in the rotation (split across 2–3 roles: triage analyst, senior/escalation,
  incident commander on-call), not 3, and not 5.

This is the gap between "we have some security staff" and "we can sell 24/7 monitoring and mean it." A
rotation that looks fine on a spreadsheet for ordinary weeks silently fails the first time someone is sick
during a P1 — which is exactly the scenario this assessment exists to catch before it's sold as a service,
not after.

## 2. Readiness checklist (brief §6, all 18 factors)

| # | Factor | Status | What "ready" looks like |
|---|---|---|---|
| 1 | Number of available analysts | **Unknown — not in this codebase** | A real, named roster, not a target headcount |
| 2 | Shift coverage requirements | **Not modeled against real headcount** | §1's math applied to the actual roster size |
| 3 | Overnight staffing | **Unknown** | A named person (or defined on-call) covering every overnight window, every day |
| 4 | Weekends and public holidays | **Unknown** | Explicit weekend/holiday rotation, not "whoever's free" |
| 5 | Annual leave / sick leave backup | **Unknown** | A documented backup plan per rotation slot, not just the primary roster |
| 6 | Escalation coverage | **Not defined in-product** | A named on-call escalation path with defined response-time targets |
| 7 | Incident commander availability | **Unknown** | A named senior/IC role, reachable on a defined SLA for P1s |
| 8 | Analyst skills and training | **Unknown** | Defined minimum skill bar + a training plan, not assumed competence |
| 9 | SIEM infrastructure | **Unknown — no SIEM integration exists in this codebase** | A real, operational SIEM ingesting client log sources |
| 10 | EDR infrastructure | **Unknown — no EDR integration exists in this codebase** | A real, operational EDR covering agreed endpoints |
| 11 | Log ingestion and retention | **Unknown** | A defined retention policy meeting client/compliance needs |
| 12 | Alert triage process | **Not built** | A documented, repeatable triage workflow, tested under load |
| 13 | Ticketing and incident management | **Not built — no ticketing system in this codebase** | A real system tracking alert → triage → response → closure |
| 14 | Secure client communication | **Not built for MDR specifically** | A defined, secure channel for incident notifications |
| 15 | On-call procedures | **Unknown** | Written on-call procedures, tested at least once before going live |
| 16 | Monitoring uptime / platform dependencies | **Unknown** | Documented SLAs for every tool the SOC itself depends on |
| 17 | Business continuity / disaster recovery | **Unknown** | A BCDR plan for the SOC's own operation, not just client systems |
| 18 | Client onboarding / offboarding procedures | **Partially — this app has onboarding steps for the non-MDR plans, not MDR-specific ones** | Documented MDR-specific onboarding (endpoint/log source setup, access, escalation contacts) |

**Current count: 0 of 18 factors confirmed ready.** This is not a judgment that Shahid Security can't get
there — it's an honest statement that none of this has been verified from inside this engagement, because
the information to verify it doesn't exist in the codebase and wasn't supplied.

## 3. Technology gaps (specific to what's built today)

Searching this repository turns up no SIEM, EDR, or ticketing integration anywhere in `apps/admin` or
`apps/learn` — `pricing_plans` describes Managed Detection & Response as a sellable concept, but nothing
ingests a security alert, triages it, or tracks it through to resolution. Building that is a separate,
substantial engineering project from the pricing/billing work in this change, requiring:

- A real log/alert source (a SIEM — self-hosted or a managed one with API access) with agreed client
  log sources actually flowing into it.
- Endpoint telemetry (an EDR agent deployed to agreed client endpoints) if endpoint coverage is sold.
- A triage/ticketing workflow connecting an incoming alert to an analyst's queue, with SLA timers.
- A secure, auditable client-notification channel for P1/P2 escalations.

None of this exists yet. Selling MDR before it exists — even with staffing solved — would mean selling a
service this codebase cannot actually deliver.

## 4. Estimated operating cost (rough order of magnitude, for planning only)

These are generic market-rate planning numbers, not a quote, not a budget, and not validated against
Shahid Security's actual labor market or existing tooling spend — flagged as estimates, not fact:

- **Staffing** (8–12 analysts/seniors in rotation, remote-first, blended rate): the dominant cost by far —
  easily the majority of a first-year MDR operating budget, swinging widely by region and seniority mix.
- **SIEM/EDR tooling**: typically licensed per endpoint/GB-ingested; costs scale directly with how many
  client endpoints and how much log volume are sold, so this can't be estimated as a flat number without a
  committed client base.
- **Ticketing/on-call tooling**: comparatively minor (per-seat SaaS pricing).
- **Training and onboarding time** before the first analyst is actually billable: real, but non-trivial,
  cost with no revenue against it yet.

A credible number needs a real staffing plan and a real client-volume forecast — both outside what this
engagement can determine. Treat the ranges above as "this is a real operating cost, size it before
committing," not as a budget to plan against.

## 5. Recommended phased rollout

1. **Phase 0 (current state)** — `soc_readiness_settings.availability = 'disabled'`. The pricing page shows
   MDR/Enterprise MDR with the required "subject to operational availability" messaging and no working
   "buy" path. Co-Managed Security Monitoring (business-hours, shared-responsibility — a materially lighter
   commitment than 24/7 MDR) can reasonably go live first, since it doesn't require solving §1's staffing
   math at all.
2. **Phase 1 — Inquiry Only.** Once there is a real, named plan (even a small one — a genuine pilot
   rotation, real SIEM/EDR access for a handful of early clients) but coverage isn't yet proven under real
   incident load, move `availability` to `'inquiry_only'`. This lets enterprise prospects start a real
   conversation without the site implying the service can be bought today.
3. **Phase 2 — Active.** Only once every row in §2's table is genuinely checked off — not approximated,
   not "close enough" — move `availability` to `'active'`. At that point, Managed Detection & Response and
   Enterprise MDR become purchasable on the public pricing page.

## 6. What this document is not

This is not a staffing plan Shahid Security has committed to, not a cost Shahid Security has budgeted, and
not a claim that any of this is already in place. It's the honest gap analysis the brief asked for, written
so the business owner can decide — with real numbers about what 24/7 coverage actually requires — when (or
whether) to invest in building it out.
