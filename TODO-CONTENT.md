# TODO — content Shahid still needs to supply

Most placeholders from the first draft are now filled in with real content
(from `Shahid_CV.pdf`) or reasonable general industry-standard defaults. What
remains genuinely needs Shahid's input — search the codebase for `FILL IN` to
confirm this list is current.

## About (`/about/`)

- **Founder photo** — there's a stylised initials avatar ("SI") in place of a
  real headshot. Swap it for an actual photo when available (replace the
  monogram block in `src/pages/about.astro` with an `<img>`).
- **Certifications wording** — the CV lists CompTIA Network+/Security+
  (Khan Academy), CEH methodology (Z Security Inc.), and CISSP (Udemy) under
  "Courses & Cert," i.e. training completed via those platforms, not
  proctored vendor certifications from CompTIA/EC-Council/(ISC)². The site
  deliberately says "Training: ..." rather than "Certified in ..." to stay
  accurate. If Shahid holds the actual official certifications (passed the
  real CompTIA/EC-Council/(ISC)² exams), say so and this can be upgraded to
  "Certified in ..." with verification links.
- **GitHub** — no GitHub profile was provided, so that link was removed
  rather than left as a placeholder. Add it back if one exists.

## Site-wide

- **Business hours/days** — "Monday–Saturday, 10:00–20:00 PKT," carried over
  from the old appointment form. Confirm still accurate.
- **`PUBLIC_TURNSTILE_SITE_KEY`** and the matching secret key in
  `php/config-template/shahid-security-config.php` — without these, neither
  the contact nor booking form renders a bot-verification widget (honeypot +
  timing check still apply to both regardless).
- **Public-facing location** now reads simply "Pakistan" (no specific
  unconfirmed city) on `/contact/` — the registered office
  (`Chak 105/15-L, Vanjari, Tehsil Mian Channu, District Khanewal, Punjab,
Pakistan`) remains the exact legal address used in the footer and legal
  pages. Say the word if you want a specific public-facing city shown
  instead.

## Home (`/`) and case studies

- The "Proof section" from the original brief (case studies, testimonials)
  is still replaced with "Why work with us," since no real, permissioned
  client testimonials exist yet.
- `/case-studies/` now has one real entry —
  `src/content/caseStudies/iot-smart-campus-threat-analysis.mdx`, Shahid's
  own BS CS final year project (a full on-path attack chain built and
  executed against a self-designed smart-campus IoT system). It renders as
  a flip-through report (`ReportFlipbook.astro`) with a gated download for
  the full PDF. **`publishedAt: 2019-06-15` is an estimate** based on the
  "BSCSF-15" intake code (Fall 2015 + a 4-year BS) — confirm the actual
  submission date and correct it if wrong.
- **Deployment step needed**: the actual thesis PDF is not in this repo (by
  design — see `php/README.md` "Gated report downloads"). Upload it to
  `php/protected/reports/iot-smart-campus-thesis.pdf` on the server
  (outside `public_html`, alongside `php/vendor/`) or the gated download
  button will 500. Ask Claude for the file — it was sent separately.
- Add more real case studies the same way and this section can be restored
  to a full "Proof" section with testimonials once some exist.

## Blog (`/blog/`)

- One seeded post (`src/content/blog/wordpress-hacked-checklist.mdx`) is an
  outline, not a real article, and is marked `draft: true` so it never
  appears on the live site. Rewrite it and set `draft: false` when ready.

## Legal pages (`/privacy/`, `/terms/`, `/responsible-disclosure/`)

All three are now full, section-by-section policies (not stubs), but they're
still first drafts, not legal advice — have a lawyer review before treating
them as final. What's explicitly flagged inline as `[FILL IN]`:

- **Privacy Policy §4**: the exact data retention periods for enquiries that
  don't lead to work, and for client records — a sensible default (≤12
  months for dead enquiries) is suggested inline, but confirm the real
  number.
- **Terms of Service §9 (Limitation of liability)** and **§10
  (Indemnification)**: these need a lawyer to draft actual liability caps,
  exclusions and mutual indemnification language appropriate to security
  testing work — don't rely on their current placeholder wording as if it
  were a real limit.
- **Terms of Service §13 (Governing law and disputes)**: confirm the
  dispute-resolution mechanism (courts vs. arbitration) for clients outside
  Pakistan, if you take on cross-border work regularly.
- **Responsible Disclosure**: confirm whether a paid bug bounty program will
  ever exist (currently states no).

## Booking (`/book/`)

- The booking form emails a _requested_ date/time to `info@shahidiqbal.com`
  for manual confirmation — it does not check a live calendar, since this
  site has no database. If double-bookings become a real problem, the fix is
  either a proper calendar backend (e.g. Cal.com) or a lightweight
  availability database — both are bigger changes than a content edit.
