# Multi-Agent SEO System — Design

**Date:** 2026-11-11. Designed in direct response to: "Design a multi-agent AI system for SEO. Define each agent's role, what it receives, what it decides, and what it passes to the next agent — until the task completes without me touching it. Include how it handles errors and how it improves itself over time."

This extends `11_ONGOING_AGENT_RUNBOOK.md` (the *what to do* each cycle) and `13_AUTOMATION_STATUS.md` (the *honest current state*) into a concrete multi-agent pipeline — specific roles, specific handoffs, specific tools in this repo. It does not contradict either: nothing here is claimed to be scheduled or running until you approve it, per the same rule `13_AUTOMATION_STATUS.md` already states. What's new here, and genuinely real as of this commit, is `scripts/seo-crawl.mjs` — a committed, runnable static SEO linter (title/description dupes, missing canonical, H1 count, broken internal links, orphan pages, noindex/sitemap mismatches, meta-description length, alt-text gaps) that several of the agents below call directly. It replaces the throwaway crawl scripts prior audits in this project wrote from scratch each time.

## Design principles (binding on every agent below)

1. **Git is the only path to production.** No agent writes directly to the live server. Every change is a commit on a branch, validated locally, opened as a PR, and only reaches `shahidiqbal.com` through the normal deploy pipeline. This is the direct lesson from the `.htaccess` incident earlier in this project: the one time a change bypassed the normal pipeline (a direct file upload to "fix" something faster), it took the whole site down, because it silently destroyed server-side state (the Passenger directives) that git has no visibility into. **No agent in this system is ever authorized to upload a file directly to the host.** If a future task genuinely needs that (another `.htaccess`-class edge case), it stops and asks a human — it does not improvise a faster path.
2. **No invented facts, ever.** Every content-producing agent inherits the `shahid-security-agent` skill's rule: no fabricated stats, testimonials, certifications, CVEs, or claims about Shahid Security's own history/team/clients. A `[FILL IN: …]` placeholder beats a plausible-sounding guess.
3. **Hard gates, not vibes.** "Looks fine" is not a pass condition anywhere in this pipeline. Every stage before human review has a command that returns a real exit code: `pnpm check` (astro check), `pnpm build`, `pnpm seo:check` (the new linter, exit 1 on any hard failure), and the existing `scripts/verify-redirects.mjs` / `scripts/production-smoke-test.mjs` for live verification post-deploy.
4. **No silent auto-publish.** Every batch of content or technical changes lands as a PR for human review before merge, exactly as every batch of work in this project has been handled so far (per `13_AUTOMATION_STATUS.md`'s stated default). Scheduling can be turned on later for the *research and drafting* stages without changing this rule — publish approval is the one step that stays manual unless you explicitly say otherwise.
5. **Dated, append-only records.** Every agent writes a dated log entry, never overwrites history. This is what lets the self-improvement loop (last section) actually learn something real instead of re-deriving the same audit from scratch every time, which is what happened to the crawl script before this commit.

## Agent roster

Nine agents, each with a narrow job. "Receives" / "Decides" / "Passes on" is the literal contract — treat it as the function signature.

### 1. Orchestrator

- **Receives:** a trigger — either a schedule (weekly/monthly/quarterly per `11_ONGOING_AGENT_RUNBOOK.md`) once you approve one, or a manual "run the SEO cycle" request from you.
- **Decides:** which stage of the pipeline needs to run (full cycle, or just the technical-lint stage, or just a reporting run), and reads `16_AGENT_LOG.md` (new, created on first real run) to avoid re-running a stage that already completed cleanly this cycle.
- **Passes on:** a work order to Research & Opportunity Finder (full cycle) or directly to Technical SEO Linter (lint-only cycle), plus the branch name to use (`seo/auto-<date>-<short-topic>`).
- **Failure mode:** if any downstream agent reports a blocking error (see Error Handling), the Orchestrator stops the cycle, writes the failure to `16_AGENT_LOG.md`, and hands off to Reporting & Escalation instead of continuing. It never retries a failed stage more than once automatically.

### 2. Research & Opportunity Finder

- **Receives:** the work order; reads `07_KEYWORD_CLUSTER_MAP.md`, `08_12_MONTH_ROADMAP.md`, `05_GCC_KEYWORD_RESEARCH.csv`, and — once access exists per `04_ACCESS_REQUIREMENTS.md` — Search Console query data.
- **Decides:** one of three outcomes, each handled differently:
  - A genuine content gap or timely security-news angle exists worth writing → draft a one-paragraph brief (topic, target keyword, which existing post it's *not* duplicating, which service/industry page it should link to).
  - A technical/structural opportunity exists (a missing location page, a cluster needing an update) → draft a brief describing the page/section, not prose.
  - Nothing worth publishing this cycle → say so explicitly. This is a valid, correct output — `11_ONGOING_AGENT_RUNBOOK.md` already states that manufactured content to fill a schedule is not acceptable.
- **Passes on:** either a brief → Content Writer, or a "nothing to publish, here's why" note → Reporting & Escalation (end of cycle, not a failure).
- **Hard constraint:** before drafting any security-advisory-based brief, it must identify a verifiable source (CVE ID, vendor advisory, dated news article) — the same verification standard `11_ONGOING_AGENT_RUNBOOK.md` already sets. No source, no brief.

### 3. Content Writer

- **Receives:** one brief at a time (never a batch — keeps each PR reviewable and keeps a bad draft from blocking others).
- **Decides:** the actual draft — MDX frontmatter (title, description, tags, `relatedService`/`relatedPosts`, FAQs) matching `src/content.config.ts`'s Zod schema, plus body content in the site's established voice (confident ethical hacker, no fear-mongering, sourced claims only).
- **Passes on:** the draft file path(s) → Fact & Compliance Checker. Never touches `relatedPosts` on *other* posts yet — that's Internal Linking's job, to keep this agent's diff small and reviewable.
- **Failure mode:** if it cannot write a claim without inventing a detail, it inserts `[FILL IN: …]` and continues — it never blocks the whole brief over one unknown fact.

### 4. Fact & Compliance Checker

- **Receives:** the draft from Content Writer.
- **Decides:** pass/fail against a fixed checklist — every factual claim traces to a cited, dated source; no fabricated stats/testimonials/certs; no claim about Shahid Security's own scale/history beyond what's already established in the skill's business facts table; CVE/advisory claims include identifier + affected version + disclosure date; tone matches brand voice (no fear-mongering).
- **Passes on:** pass → Technical SEO Linter. Fail → back to Content Writer with the specific line(s) that failed and why (never a vague "fix this").
- **This agent never has write access to fix the draft itself** — separating "did we check" from "did we write" is what keeps this gate honest instead of becoming a rubber stamp.

### 5. Technical SEO Linter

- **Receives:** a draft (content cycle) or a direct work order (lint-only cycle). Runs `pnpm build && pnpm seo:check -- --json <scratch>/seo-report.json` against the local build that now includes the new/changed page(s).
- **Decides:** pass/fail purely on `seo-crawl.mjs`'s exit code — 0 means no hard failures (duplicate title/description, missing title/description/canonical, wrong H1 count, broken internal link, noindexed-but-sitemapped page). Warnings (meta description length outside 70–160 chars, missing alt text, orphan pages) are logged but don't block — they go into the PR description as a checklist for the human reviewer, since some (like a deliberately long descriptive blog title) are judgment calls, not bugs.
- **Passes on:** pass → Internal Linking Agent. Fail → back to whichever agent owns the failing file (Content Writer for a new post's metadata; itself escalates to Reporting & Escalation for a pre-existing structural bug it found incidentally, same as how this design doc's own commit fixed two pre-existing bugs this agent would have caught).
- **Known limitation, stated honestly:** this crawl only sees Astro's own `dist/` output. Links into `/learn/*` or `/admin/*` routes beyond the three Astro-owned `/learn/` pages belong to `apps/gateway` (the Next.js app) and are marked `crossAppLinksUnverified` in the JSON report rather than silently passed or wrongly failed — verifying those requires `scripts/production-smoke-test.mjs` against the live site, which only Deploy & Verify can run (see below).

### 6. Internal Linking Agent

- **Receives:** a passing draft plus its brief's target service/industry page and keyword cluster.
- **Decides:** which existing posts should gain a reciprocal `relatedPosts` entry pointing at the new post (same method used for the Nvidia/GTA6 posts' internal-linking pass), and whether the new post's own body should link to a specific service page using the site's existing inline-link convention.
- **Passes on:** the full changeset (new post + the small diffs to existing posts' frontmatter) → Build & Validate.
- **Constraint:** never more than 3–4 reciprocal links per new post — matches the existing site convention and avoids link-farming the content.

### 7. Build & Validate Agent

- **Receives:** the full changeset for the cycle (one or more passing drafts, or a technical fix).
- **Decides:** runs the complete validation suite this project already uses — `pnpm check`, `pnpm build`, `pnpm seo:check`, `node scripts/verify-redirects.mjs` where relevant — and only a clean run on every command is a pass.
- **Passes on:** pass → opens a PR (never pushes to a protected branch directly) with a description listing: what changed, which warnings the linter logged for human judgment, and which validation commands were run. Fail → back to the owning agent with the exact failing command's output, not a summary.
- **This is the last fully-automated stage.** Nothing past this point runs without you.

### 8. Human Review Gate (you)

- **Receives:** the PR, with the linter's hard-pass already proven and its warnings listed as a checklist.
- **Decides:** merge, request changes, or reject. This is the one stage this design doesn't try to automate, deliberately — matching the standing rule that publishing stays a reviewed decision, not an auto-publish.
- **Passes on:** merge → Deploy & Verify runs against the now-updated branch. Reject/changes requested → logged to `16_AGENT_LOG.md` as a real outcome the self-improvement loop (below) learns from — a pattern of rejected briefs on one topic area is a real signal, not noise.

### 9. Deploy & Verify Agent

- **Receives:** a merged PR.
- **Decides:** nothing content-related — it only confirms the already-approved deploy went out clean: triggers the normal git-based deploy, then runs `scripts/production-smoke-test.mjs` against the live domain and spot-checks the specific new/changed URLs return 200 with the expected title. **It never touches `.htaccess` or any file outside the git-tracked repo.** If the live site doesn't match what was deployed, it escalates immediately rather than attempting any direct-upload fix — that exact shortcut is what caused the earlier outage.
- **Passes on:** confirmed-live → Reporting & Escalation logs success. Mismatch → Reporting & Escalation flags it as a P0, the same severity the outage itself was treated as.

### 10. Reporting & Escalation Agent

- **Receives:** an outcome from any stage — success, a blocked failure, a "nothing to publish," a human rejection, or a P0 live-site mismatch.
- **Decides:** severity and audience. A P0 (site down, broken deploy) surfaces immediately, not queued for the next scheduled report. Everything else batches into the next weekly/monthly note per `11_ONGOING_AGENT_RUNBOOK.md`'s existing cadence.
- **Passes on:** a dated entry to `16_AGENT_LOG.md` (always, every outcome) and, for anything above routine, a message to you directly rather than waiting.

### 11. Performance & Self-Improvement Agent (periodic, not per-cycle)

Covered in its own section below since this is the "improves itself over time" answer specifically.

## Data contracts (what actually moves between agents)

Kept as plain files in the repo, not an invisible in-memory handoff — so any stage is independently re-runnable and inspectable:

| Artifact | Produced by | Consumed by |
|---|---|---|
| Work order (topic/brief or lint-only flag) | Orchestrator | Research & Opportunity Finder |
| Brief (one topic, target keyword, non-duplication check, target internal links) | Research & Opportunity Finder | Content Writer |
| Draft `.mdx` file(s) | Content Writer | Fact & Compliance Checker |
| Pass/fail + annotated line numbers | Fact & Compliance Checker | Content Writer (fail) / Technical SEO Linter (pass) |
| `seo-report.json` (hard failures / warnings / orphans / cross-app-unverified) | Technical SEO Linter | Internal Linking Agent, and verbatim into the PR description |
| Reciprocal-link diff | Internal Linking Agent | Build & Validate |
| PR | Build & Validate | Human Review Gate |
| Live verification result | Deploy & Verify | Reporting & Escalation |
| Dated log entry | every agent, every outcome | `16_AGENT_LOG.md`, read by Orchestrator (next cycle) and Performance Agent (periodic) |

## Error handling

- **Any hard-gate failure (`pnpm check`, `pnpm build`, `pnpm seo:check` exit 1) stops that item, not the cycle.** Other independent briefs in the same cycle still proceed — one bad draft doesn't block a technical fix that's unrelated.
- **One automatic retry maximum**, only for a failure that's plausibly transient (a flaky dependency install, not a real validation failure). A real content/technical failure goes straight back to the owning agent — retrying a wrong draft doesn't make it right.
- **No agent escalates privilege to work around a blocker.** If the Technical SEO Linter can't verify a cross-app link, it reports that honestly as unverified — it does not guess, and it does not attempt to reach the live site itself (only Deploy & Verify does that, and only post-merge).
- **A P0 (live-site mismatch, failed deploy) always halts the cycle entirely** and escalates immediately, regardless of what else was mid-flight. Matches how the actual `.htaccess` outage was handled: stop everything else, fix the P0 first.
- **The one rule with no exception:** no agent uploads a file directly to the host to "fix something faster." Every fix, including an emergency one, goes through a commit + the normal deploy path. If a future situation seems to genuinely require a direct upload, that is exactly the moment to stop and ask you, not improvise.

## Self-improvement over time

The mechanism is a versioned **Playbook** file (`docs/seo-growth/17_PLAYBOOK.md`, created on first real cycle) plus the append-only `16_AGENT_LOG.md`, reviewed on a cadence, not continuously:

1. Every agent outcome — pass, fail, human rejection, warning pattern — is one dated line in `16_AGENT_LOG.md`. Never overwritten, so there's a real history to mine.
2. On a monthly cadence (riding the existing monthly workflow in `11_ONGOING_AGENT_RUNBOOK.md`), the Performance & Self-Improvement Agent reads the month's log and looks for *patterns*, not single incidents: a topic area getting rejected repeatedly, a warning category (e.g. meta description length) recurring across every new post because the Content Writer's brief template doesn't mention the limit, a linter check that's noisy without ever catching a real bug (a signal to tune it, like the `alt=""` false-positive this exact session just found and fixed by hand).
3. It proposes specific, reviewable edits to the Playbook — e.g. "add a 155-char meta description limit to the brief template" or "stop suggesting industry pages as link targets for blog posts tagged `insider-threat`, three were rejected for forcing it." Each proposed edit cites the log entries it's based on, same evidentiary standard the rest of this project already holds itself to.
4. **You approve Playbook changes before they take effect** — this is the one place self-improvement could silently drift the system's behavior without you noticing, so it's the one place that stays a reviewed PR to the Playbook file itself, same as any other content change.
5. Every subsequent cycle's Research/Content/Linter agents read the current Playbook alongside the static docs (`07_KEYWORD_CLUSTER_MAP.md` etc.) — so an approved lesson actually changes future behavior instead of living in a report nobody re-reads.

This is deliberately a slower, auditable loop (monthly proposals, human-approved) rather than a system that silently reweights its own behavior after every cycle — matching the project's standing default of "report and request approval, not auto-publish," extended to the system tuning itself, not just its content output.

## What's real today vs. what needs your approval

Matching the honesty standard `13_AUTOMATION_STATUS.md` already set:

- **Real and runnable right now, no approval needed:** `pnpm seo:check` (Technical SEO Linter's actual tool), the existing validation suite, and this design as a manual runbook any session can follow start-to-finish by hand.
- **Needs one decision from you:** whether to turn on a recurring trigger for the Orchestrator (weekly lint-only, monthly full cycle, or both) — a real, persistent schedule only exists once you say so and it's configured and verified, never claimed otherwise.
- **Still blocked on access, schedule or not:** Search Console/GA4-informed opportunity-finding (per `04_ACCESS_REQUIREMENTS.md`), and keyword volume/difficulty data — no amount of agent design manufactures a credential or a paid data source that doesn't exist yet.
- **Always manual, by design, not by current limitation:** the Human Review Gate. Turning on scheduling for research/drafting does not and should not remove this step.
