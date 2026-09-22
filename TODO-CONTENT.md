# TODO — content Shahid still needs to supply

Every item below is rendered as a clearly marked placeholder in the built site
(`[FILL IN: ...]`, usually in a highlighted/warning color) or is a value that
was used as a reasonable default but should be confirmed. Search the codebase
for `FILL IN` to find every occurrence — this list groups them by page.

## Site-wide (`src/lib/site.ts`)

- **Public-facing location** — the old site showed "Islamabad, Pakistan" but
  the registered address is in Khanewal, Punjab. Confirm which location (if
  any) should be shown publicly on `/contact/`. Currently rendered as
  `[FILL IN: confirm public-facing location]`. The registered office address
  itself (`Chak 105/15-L, Vanjari, Tehsil Mian Channu, District Khanewal,
Punjab, Pakistan`) is real and used in the footer and legal pages.
- **Business hours/days** — currently set to "Monday–Saturday, 10:00–20:00
  PKT" (carried over from the old appointment form). Confirm this is still
  accurate.
- **`PUBLIC_CAL_LINK`** — no Cal.com link is configured. `/book/` shows a
  fallback message until this env var is set (see `.env.example`).
- **`PUBLIC_TURNSTILE_SITE_KEY`** and the matching secret key in
  `php/config-template/shahid-security-config.php` — without these the
  contact form has no bot-verification widget (honeypot + timing check still
  apply).

## Home (`/`)

- Trust line under the hero CTAs: `[FILL IN: e.g. "Certified in OSCP · CEH ·
ISO 27001 LA"]` — add real certifications once available, or remove the
  line entirely.
- The "Proof section" from the content brief (case studies, certifications,
  testimonials) was intentionally replaced with a "Why work with us" values
  section, per the brief's own fallback instruction, since no real case
  studies/testimonials/certifications exist yet. Add real ones to
  `src/content/caseStudies/*.mdx` (see below) and this section can be
  restored.

## About (`/about/`)

- Founder story: `[FILL IN: 2–3 sentences in first person — how you got into
security, your background, what you've worked on.]`
- Founder photo: placeholder box reading `[FILL IN: photo]`.
- Years of experience and field: `[FILL IN: real number]` / `[FILL IN: e.g.
web development, network administration, security]`.
- Certifications: `[FILL IN: e.g. CEH, OSCP, CompTIA Security+, ISO 27001 LA
— with verification links]`.
- LinkedIn and GitHub links: `[FILL IN: LinkedIn]`, `[FILL IN: GitHub]` (X
  link is already wired to the real profile from `site.ts`).
- Team section was omitted entirely, per the brief ("only if real").

## Services (`/services/*`)

- **Penetration Testing** FAQ: turnaround time `[FILL IN: 5–10 working
days]` — confirm your real typical timeline.
- **Compliance & Risk Assessment**: `[FILL IN: add any local frameworks you
actually support, e.g. SBP guidelines for financial institutions]`.
- **Security Monitoring & Training**: `[FILL IN: be precise about hours —
only say "24/7" if you truly provide it]`.

## Case studies (`/case-studies/`)

- No real case studies exist yet, so the index shows a "coming soon" state
  and is excluded from the sitemap (`noindex` + filtered out in
  `astro.config.mjs`). Add real, permissioned case studies as new `.mdx`
  files in `src/content/caseStudies/` using the schema in
  `src/content.config.ts` (see README "Adding a case study"). Only render a
  client quote if `quote.permissionConfirmed: true`.

## Blog (`/blog/`)

- One seeded post exists (`src/content/blog/wordpress-hacked-checklist.mdx`)
  and is marked `draft: true` — it is a placeholder outline, not real
  content, and will not appear on the site until it's rewritten and
  `draft: false` is set. Marked inline: `[FILL IN: replace this draft with a
real, original article before publishing.]`

## Legal pages (`/privacy/`, `/terms/`, `/responsible-disclosure/`)

All three are first drafts for launch, not legal advice:

- **Privacy Policy**: have it reviewed by a lawyer familiar with Pakistani
  data protection law (and any client jurisdictions); confirm the real data
  retention period.
- **Terms of Service**: have it reviewed by a lawyer, especially the
  liability limits (currently an explicit placeholder paragraph) and the
  cross-border jurisdiction clause.
- **Responsible Disclosure**: confirm whether a paid bug bounty program will
  ever exist (currently states no).

## Brand assets

The real logo, favicons, and OG default image (from `shahid-security-brand-kit.zip`)
are already wired in under `public/brand/` — no placeholder logo remains.
