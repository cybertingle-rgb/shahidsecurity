# Shahid Security — shahidiqbal.com

Astro + TypeScript + Tailwind v4 rebuild of shahidiqbal.com. Static-first, dark
neon-green "ethical hacker" design, deployed as static files to **Hostinger
shared hosting**, with small PHP scripts handling the contact and booking forms.

## Stack

- [Astro](https://astro.build) (static output, no SSR adapter) + TypeScript (strict)
- Tailwind CSS v4 via the official Vite plugin
- MDX + Astro Content Collections (Zod schemas) for services, case studies, blog, legal pages
- `astro-icon` (Lucide icons, inline SVG)
- Self-hosted variable fonts via Fontsource (Inter, Space Grotesk, JetBrains Mono) — no Google Fonts
- Contact + booking forms: plain PHP (`public/api/contact.php`, `public/api/book.php`) + PHPMailer over Hostinger SMTP
- Package manager: pnpm

## Local development

```bash
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:4321`. The PHP endpoints
(`/api/contact.php`, `/api/book.php`) are **not** executed by `astro dev`
(they're plain PHP scripts, not Astro API routes) — to test them locally,
build first and serve the output with PHP's built-in server, which behaves
close enough to Hostinger for testing:

```bash
pnpm build
php -S localhost:4321 -t dist
```

### Type checking and build

```bash
pnpm check   # astro check (TypeScript + template diagnostics)
pnpm build   # runs prebuild scripts (OG images, logo resizing), astro check, astro build
```

`pnpm build` fails the build on type errors, so CI/pre-deploy checks are the
same command you run locally.

## Environment variables

See `.env.example`. Only one variable exists, and it's **public** (baked into
the static HTML/JS at build time — nothing secret goes here):

| Variable                    | Purpose                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for the contact/booking form widgets. Leave empty to skip rendering the widget (server-side verification is then skipped too — see below). |

Everything else both forms need (SMTP credentials, the Turnstile
**secret** key, the destination inbox) lives in a PHP config file that is
deployed **outside** `public_html` — see [`php/README.md`](php/README.md) and
[`php/config-template/shahid-security-config.php`](php/config-template/shahid-security-config.php).
This keeps credentials out of the web-servable directory and out of this
repository entirely.

## Content model

Four content collections live under `src/content/` (schemas in
`src/content.config.ts`). All contact details, socials and hours are centralised
in `src/lib/site.ts` — never hard-code them in a component or page.

### Adding a blog post

Create `src/content/blog/my-post-slug.mdx`:

```mdx
---
title: 'Post title'
description: 'One or two sentences for meta description and the index card.'
publishedAt: 2026-03-01
tags: ['tag-one', 'tag-two']
author: Shahid Iqbal
draft: false
---

Post body in Markdown/MDX.
```

It appears at `/blog/my-post-slug/` and on `/blog/tag/<tag>/` for each tag,
once `draft` is `false`. Draft posts never render and are excluded from the
sitemap and RSS feed.

### Adding a service

Create `src/content/services/my-service.mdx` following the schema in
`src/content.config.ts` (`title`, `group: "security" | "build"`,
`shortDescription`, `icon` — an `astro-icon`/Lucide name like
`lucide:shield-check`, `order`, `whoItsFor[]`, `included[]`,
`deliverables[]`, `process[]`, `faqs[]`, `seoTitle`, `seoDescription`). It
appears automatically at `/services/my-service/` and in the `/services/`
index, grouped and ordered per the `group`/`order` fields. Also add it to the
`homeServiceCards` array in `src/pages/index.astro` if it should appear on
the homepage, and to the redirect map in `public/.htaccess` if it replaces an
old service URL.

### Adding a case study

Create `src/content/caseStudies/my-case-study.mdx` following the schema in
`src/content.config.ts`. Only set `quote.permissionConfirmed: true` once the
client has actually approved the quote for publication — the page checks this
flag before rendering it. Once at least one non-draft case study exists, the
`/case-studies/` index automatically switches from its "coming soon" state to
a real grid, and the page is no longer excluded from the sitemap (see the
`hasCaseStudies` check in `astro.config.mjs`).

### Editing legal pages

`src/content/legal/{privacy,terms,responsible-disclosure}.mdx` — plain MDX,
edit directly. All three are first drafts and are marked as needing legal
review (see `TODO-CONTENT.md`).

## SEO, structured data and OG images

- `src/lib/seo.ts` / `src/lib/schema.ts` — canonical URL and JSON-LD helpers
  (Organization, Service, BreadcrumbList, FAQPage, BlogPosting, Person).
  `BaseLayout.astro` always includes the Organization schema; pages add their
  own via the `jsonLd` prop.
- `@astrojs/sitemap` generates `sitemap-index.xml`; `src/pages/rss.xml.ts`
  generates the blog RSS feed; `public/robots.txt` points at both.
- Open Graph images are generated at **build time** (no headless browser) by
  `scripts/generate-og-images.mjs`, which rasterises a branded SVG template
  per page with `sharp` and writes to `public/og/*.png`. It runs
  automatically via the `prebuild` script. Add a new page's OG image by
  adding an entry to the `pages` array in that script (or passing
  `ogImage="/og/whatever.png"` to `BaseLayout` — it falls back to
  `/brand/og-default.png` otherwise).
- `scripts/generate-logo-variants.mjs` (also in `prebuild`) downsizes the
  full-resolution brand logos into the small sizes actually used in the
  header/footer/404, so the browser isn't asked to download a 1200px-wide
  PNG to render an 80px-tall navbar logo.

## Security

- **Content-Security-Policy** is emitted per-page as a `<meta
http-equiv="content-security-policy">` tag by Astro's built-in CSP feature
  (`security.csp` in `astro.config.mjs`), which computes a SHA-256 hash for
  every inline `<script>`/`<style>` Astro bundles. This gives a strict
  `script-src` with **no** `'unsafe-inline'` on pure static hosting, which
  has no server to mint a per-request nonce. The only allowed external
  origin is Cloudflare Turnstile. See the comment above
  `security.csp` in `astro.config.mjs` and above the (deliberately absent)
  CSP line in `public/.htaccess` for why it isn't set twice.
- Remaining security headers (HSTS, `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`) live in `public/.htaccess`, along with all
  301 redirects from the old WordPress URLs, the 410s for `/wp-admin/*` etc.,
  long-cache headers for `/_astro/*` and `/brand/*`, and compression.
- After deploying, check the live site against
  [securityheaders.com](https://securityheaders.com) and the
  [Mozilla Observatory](https://developer.mozilla.org/en-US/observatory) —
  both should report an A/A+ given the headers above. (Note: `frame-ancestors`
  can't be set via a `<meta>` CSP, so `X-Frame-Options: DENY` in `.htaccess`
  covers that directive instead.)
- The contact and booking forms (`public/api/contact.php`, `public/api/book.php`):
  both validate and sanitise every field server-side, reject header-injection
  attempts, check a honeypot field and a minimum time-to-submit, verify
  Cloudflare Turnstile server-side (skipped, not bypassed, when no secret key
  is configured), rate-limit per IP via a file-based token bucket (separate
  buckets per form), and never log message bodies. Both fail safely (generic
  error, no crash) if the shared config file or the PHPMailer dependency is
  missing — see `php/README.md`. Note the booking form is a "request a time"
  form, not a live-availability calendar — there's no database tracking
  existing bookings (this site has none, by design), so it can't prevent
  double-booking automatically; each request is emailed for manual
  confirmation.
- `pnpm audit` before deploying; `.github/dependabot.yml` keeps npm,
  Composer (`php/`) and GitHub Actions dependencies current automatically.

## Testing notes

This project was verified with:

- `pnpm build` (zero errors) and `pnpm check` (zero errors) on every change.
- A Playwright smoke pass across every route (200/404 status, no console
  errors, **no CSP violations**, mobile menu open/close + focus trap +
  Escape, contact form client-side validation and a full submit round-trip
  against the real PHP handler via `php -S`), and a 360px-viewport
  horizontal-scroll check on every page.
- `lighthouse` (mobile) against the built site via `php -S`, using the
  project's pre-installed Chromium. Every real, indexable page scores
  **95+ in Performance, Accessibility, Best Practices and SEO**; the two
  intentionally `noindex` pages (`/404.html` and `/case-studies/` while it's
  in its empty "coming soon" state) score lower on SEO only, because
  Lighthouse always flags a `noindex` page as "not crawlable" — that's
  correct behaviour for those two pages, not a defect.

Neither Playwright nor Lighthouse are project dependencies (they were removed
after verification to keep the shipped `package.json` lean) — reinstall them
ad hoc (`pnpm add -D playwright lighthouse chrome-launcher`) if you want to
re-run similar checks after future changes.

## Deploying to Hostinger

1. **Build:**
   ```bash
   pnpm build
   ```
   This produces static output in `dist/`.
2. **Upload `dist/` to `public_html`.** In hPanel: File Manager → navigate to
   `public_html` → upload a zip of `dist/`'s contents → extract in place (or
   use an SFTP client to sync `dist/` → `public_html`). Confirm hosting type
   is "Custom PHP/HTML website" so `.htaccess` and `.php` files are honoured.
3. **Set up the contact/booking forms' shared PHP dependency and config**, one directory
   **above** `public_html` (never inside it) — full steps in
   [`php/README.md`](php/README.md):
   ```bash
   cd php && composer install --no-dev
   ```
   then upload `php/` (with `vendor/`) and a filled-in copy of
   `php/config-template/shahid-security-config.php` to that parent directory,
   and `chmod 600` the config file.
4. **Create the `info@shahidiqbal.com` mailbox** in hPanel → Emails, and use
   its credentials (and Hostinger's SMTP host/port, shown in that same
   screen) in the config file from step 3.
5. **Activate SSL** (hPanel → SSL, usually free Let's Encrypt, one click) —
   the `.htaccess` force-HTTPS rule assumes it's active.
6. **Back up the current WordPress site** (hPanel → Backups, or export via
   your existing host) before changing anything DNS-side, so you can restore
   if needed.

### Pointing the domain from the current WordPress host

1. Keep the old WordPress host running during the switch — don't cancel it
   yet.
2. In your DNS provider (wherever `shahidiqbal.com`'s nameservers point),
   update the `A` record for the root domain (and `www`, if used) to
   Hostinger's IP address (shown in hPanel → Domains → DNS / Manage).
   Alternatively, point the domain's nameservers at Hostinger's if you want
   Hostinger to manage DNS entirely.
3. Wait for DNS propagation (can take a few hours; check with `dig
shahidiqbal.com` or a propagation checker).
4. Once the new site is live and confirmed, **verify every redirect** from
   the old WordPress URLs works (see below), then decommission the old host.

### Verifying redirects

```bash
node scripts/verify-redirects.mjs https://shahidiqbal.com
```

Checks every old URL listed in `public/.htaccess` against the live (or
staging) site and reports any that don't 301/410 as expected. Run this
**before** decommissioning the old WordPress host.

## Project structure

```
src/
  components/     shared Astro components (Header, Footer, ContactForm, BookingForm, ...)
  layouts/        BaseLayout.astro (SEO meta, JSON-LD, skip link, header/footer)
  pages/          routes
  content/{services,caseStudies,blog,legal}/   MDX content
  content.config.ts   Zod schemas for the collections above
  lib/            site.ts (all contact/social/hours config), seo.ts, schema.ts
  styles/global.css   design tokens + base styles
public/
  .htaccess, robots.txt, site.webmanifest, favicons
  brand/          logo/favicon assets from the brand kit
  og/             generated Open Graph images (build output, not hand-edited)
  api/contact.php, api/book.php   the contact and booking form handlers
  .well-known/security.txt
php/
  composer.json, README.md, config-template/   PHPMailer + the config template
  (vendor/ is gitignored — run `composer install` before deploying)
scripts/
  generate-og-images.mjs, generate-logo-variants.mjs, verify-redirects.mjs
```
