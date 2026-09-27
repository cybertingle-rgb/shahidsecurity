# LMS Architecture Audit — "Learn with Shahid"

**Status:** Phase 1 (audit) — complete. No code has been written for the LMS yet, per the brief's explicit instruction. This document answers the 17 audit questions against the actual repository state, verified by direct inspection (not assumption), on 2026-09-27.

## 1–2. Framework and version

- **Astro 7.3.3**, TypeScript (strict), `output: 'static'` — no server adapter installed.
- Tailwind CSS v4 (via `@tailwindcss/vite`), MDX content collections, `astro-icon`, `sharp` for build-time image generation.
- pnpm workspace (`pnpm-workspace.yaml` present, single package today).

## 3. Database architecture

**None exists.** There is no ORM, no database driver, no connection string, and no `DATABASE_URL` anywhere in the repo or `.env.example`. All "content" (services, case studies, blog posts, legal pages) is Astro content collections — MDX files committed to git, validated by Zod schemas in `src/content.config.ts`, and baked into static HTML at build time. This is a file-based CMS, not a runtime data layer.

## 4. Authentication system

**None exists.** There is no login, no session handling, no password hashing, no user table. The only "identity" concept anywhere in the codebase is the static `site.founder` string in `src/lib/site.ts`.

## 5. Deployment architecture

GitHub Actions (`.github/workflows/deploy.yml`) triggers on push to `claude/wizardly-keller-yg0bj7`:
1. `pnpm install --frozen-lockfile`
2. `pnpm build` (runs `astro check && astro build`, plus a `prebuild` step that regenerates logo variants and OG images)
3. `easingthemes/ssh-deploy@v6` rsyncs `dist/` (with `--delete`) directly to Hostinger `public_html` over SSH
4. A follow-up SSH step fixes file/directory permissions (755/644)

This is a **pure static file deploy** — there is no build step that could run database migrations, no persistent process, and no way to run server-side application code beyond what Apache/PHP on shared hosting provides directly.

## 6. Existing CMS/content system

Astro content collections (`services`, `caseStudies`, `blog`, `legal`), each with its own Zod schema. Content is authored as MDX files in `src/content/`, and templated by matching `.astro` pages under `src/pages/`. There is no admin UI, no database-backed content, and no way for a non-developer to publish content without a git commit and a deploy.

## 7. Current SEO implementation

Extensive and recently audited/hardened (this session): sitemap with real `lastmod` where dates exist, `robots.txt`, per-page canonical tags, a full JSON-LD entity graph (`Organization` ↔ `Person` ↔ `WebSite` ↔ `WebPage`/`ContactPage`/`ProfilePage`/`CollectionPage` ↔ `Service`/`Article`/`BlogPosting`/`FAQPage`/`BreadcrumbList`, all linked by stable `@id`s), Open Graph + Twitter metadata, and a strict CSP built from Astro's own inline-script/style hashing (`security.csp` in `astro.config.mjs`) — **this is a hard constraint the LMS must not break** (see §17 and `lms-security.md`).

## 8. Existing components/layouts

`BaseLayout.astro` (the single shared `<html>` shell — head metadata, JSON-LD, header/footer, preloader, mascot), plus presentational components: `Section`, `SectionHeading`, `Breadcrumbs`, `FAQ`, `ProcessSteps`, `ServiceCard`, `CaseStudyCard`, `CTABand`, `Prose`, `Header`, `Footer`, `LanguageSwitcher`/`LanguageNotice` (browser-language UI-chrome translation, not full i18n), `PandaMascot`, `AmbientDoodles`, `ContactForm`, `BookingForm`, `ReportFlipbook`. All are Astro components (server-rendered at build time); the handful of `<script>` blocks are small, vanilla, and CSP-hashed — there is **no client-side framework** (no React/Vue/Svelte island) anywhere in the project today.

## 9. Existing APIs/server endpoints

Four PHP scripts under `public/api/`, running on Hostinger's Apache/PHP layer (Astro itself has no server runtime):
- `contact.php` — contact form → PHPMailer over SMTP
- `book.php` — consultation booking form → same mail path
- `report-download.php` / `report-file.php` — gated PDF download for one case study: mints a 48-hour token, streams a file that lives **outside** `public_html`

All four are on an explicit `.htaccess` allowlist; every other `.php` file is denied execution (`Require all denied`). PHP dependencies (PHPMailer only, via Composer) live in a `php/` folder deployed as a *sibling* of `public_html`, never inside it. This is a deliberate, correct security pattern — but it is built for four narrow, stateless, no-auth form handlers, not a multi-user application with sessions, roles, and a database.

## 10. Existing environment variables

Exactly one: `PUBLIC_TURNSTILE_SITE_KEY` (client-exposed, safe). Everything sensitive (SMTP credentials, Turnstile secret key, notification email) lives in a PHP config file deployed outside `public_html`, not in Astro's env system at all, because Astro has no server runtime to read server-side env vars from at request time — it's a static build.

## 11. Existing payment integrations

**None.** No payment SDK, no gateway credentials, no order/product concept anywhere in the codebase.

## 12. Existing analytics

**None.** Verified by grep across `src/` and `public/` for `gtag`, `google-analytics`, `plausible`, `posthog`, and `analytics` generally — zero matches. No tracking pixel, no event system, nothing to preserve or avoid conflicting with.

## 13. Existing forms

Three, all PHP-backed, all with honeypot + rate-limiting + optional Cloudflare Turnstile: the contact form, the booking form, and the case-study report-download gate (email + purpose + free-text). None involve payment, authentication, or persisted user accounts.

## 14. Current hosting/deployment process

Hostinger **shared hosting**. Confirmed capabilities: Apache with `mod_rewrite`/`mod_headers`/`mod_expires`/`mod_deflate`, PHP 8.1+, Composer-installable PHP dependencies, SSH access (used by the deploy pipeline itself). **Not confirmed and needs to be checked with Shahid before any implementation decision**: whether the plan includes a MySQL database, cron job support, and how many concurrent PHP processes/how much memory the plan allows — shared hosting plans vary a lot here, and "thousands of students" is exactly the scale where shared-hosting limits (execution time, concurrent connections, no persistent worker process) start to matter.

## 15. Security-sensitive areas already in place (must not regress)

- CSP built from Astro's own script/style hashing — any new client-side code must fit this model or the CSP strategy needs to change deliberately, not accidentally.
- `.htaccess` PHP execution allowlist — any new PHP endpoint must be added to it explicitly, or it 403s.
- Config/credentials-outside-`public_html` pattern for the existing PHP scripts.
- Security headers (HSTS, X-Frame-Options, Permissions-Policy, COOP) applied globally via `.htaccess`.

## 16. Is a database/backend already available?

No. This is the single most important finding of this audit: **there is currently no application backend of any kind** — only a static site generator and four narrow PHP scripts. Everything the brief asks for (accounts, roles, courses, enrollments, payments, progress tracking, certificates, communities, audit logs, admin dashboards) requires a real backend and a real database that does not exist today.

## 17. Is the current architecture suitable for a full LMS?

**Not as-is, and it should not be forced to become one.** Bolting a multi-user, stateful, payment-processing application onto a static-site-generator-plus-four-PHP-scripts architecture, on shared hosting, would mean building a database layer, session management, RBAC, webhook handling, and background jobs from scratch in raw PHP with no framework — directly contradicting the brief's own requirements for a "secure, scalable" system held to "OWASP guidance," at the exact scale ("thousands of students") where shared hosting's lack of persistent processes, proper connection pooling, and reliable background job execution becomes a real operational risk, not a theoretical one.

**Recommendation** (detailed in `lms-architecture.md`): keep the existing static Astro site exactly as it is — it's well-built, recently SEO-hardened, and serves a different job (consulting-brand marketing) — and build "Learn with Shahid" as a **separate application** with its own database and a proper server runtime, reachable at a subdomain (e.g. `learn.shahidiqbal.com`), linked to from a small number of new *static* marketing pages added to the existing site (`/learn`, `/learn/courses`, `/learn/courses/[slug]`, `/learn/roadmap`, `/learn/pricing`, `/learn/resources`, `/learn/faq`) that reuse the existing design system and SEO infrastructure. Everything requiring auth, payments, or a database (login, dashboards, course player, admin) lives in the separate app, not in the static site's build. This is expanded on fully in `lms-architecture.md`.

## What this audit deliberately does not do

It does not propose a specific SaaS vendor, hosting invoice, or dollar figure — those are business decisions for Shahid to make with real pricing in hand, not something to assume on his behalf. It also does not write any LMS code, run any database migration, or touch the existing site's routes, content, or deploy pipeline. Per the brief: audit first, propose second, build only after phase-by-phase approval.
