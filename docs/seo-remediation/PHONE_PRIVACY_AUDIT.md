# Phone Privacy Audit — Shahid Security

**Date:** 2026-10-24
**Scope:** shahidiqbal.com, learn.shahidiqbal.com, admin.shahidiqbal.com (repository-controlled content) + a best-effort external inventory.

This report never prints the actual phone number. All references below are redacted as `[REDACTED PHONE]`.

## 1. Repository-controlled occurrences (Category A — directly editable)

The phone number and all WhatsApp contact methods were removed from the repository in the work immediately preceding this phase (commit `ec31e2f` and the session before it). This audit **re-verified** that work rather than assuming it:

```
grep -rl "[REDACTED PHONE, all known formats]" . — excluding node_modules, .git, .next, dist
→ zero matches
```

Re-run at the start of this phase and again after adding the 10 new blog posts in this phase — zero matches both times.

### What was removed (summary of the prior work this audit verified)

- `src/lib/site.ts` — `phone`, `phoneDisplay`, `whatsappNumber` fields and the `whatsappLink()` / `telLink()` helper functions.
- The WhatsApp icon in the floating social rail on all three properties (`src/components/SocialRail.astro`, `apps/learn/src/components/SocialRail.tsx`, `apps/admin/src/components/SocialRail.tsx`).
- `tel:` links and the phone line in the site footer (`src/components/Footer.astro`).
- The WhatsApp CTA button in the homepage CTA band (`src/components/CTABand.astro`) and the "Request Sent" / "Message Sent" thank-you pages.
- The "WhatsApp / Call" contact card on the public contact page (`src/pages/contact/index.astro`).
- The `telephone` property in the Organization JSON-LD (`src/lib/schema.ts`).
- Phone/WhatsApp mentions in the incident-response service page content, the privacy policy, and the responsible disclosure page.
- Luna (the AI chat widget)'s system prompt and canned FAQ answers, which previously told visitors to WhatsApp the business directly.

### A real gap this closed, not just a deletion

The booking form (`/book/`) had never collected an email address at all — by original design, confirmation happened over phone/WhatsApp only. Simply deleting the phone/WhatsApp contact method without addressing this would have left the booking flow with no way to respond to a request. The prior work added a required email field end-to-end (the Astro form, `book.php`'s server-side validation and mail body, and the admin app's leads-intake schema and database inserts for both `leads.email` and `consultations.email`), so every booking request can now actually be answered by email.

## 2. New content added in this phase

The 10 new blog posts written in this phase were checked for phone/WhatsApp mentions before publication. None reference a phone number or WhatsApp; all CTAs use `info@shahidiqbal.com` and `/book/`. Confirmed via the same repo-wide grep sweep after adding the files (see §1 — zero matches, including the new files).

## 3. External inventory (best-effort, this session)

Using `WebSearch` (the only working external-research tool this session — see `BASELINE_AUDIT.md` §6 on the `WebFetch` outage), I searched for:

- `"Shahid Security" shahidiqbal.com WhatsApp contact phone`
- `shahidiqbal.com OR "Shahid Security" Pakistan business directory listing contact`

**No external occurrence of the business's phone number was found** in indexed search results. The closest matches were unrelated businesses with similar names (an unrelated "Shahid Web and IT Services" D&B listing, unrelated "Shahid"-named trading companies on Panjiva, an unrelated UK government list of Pakistani security providers that does not include this business). None of these carry the actual number and none required action.

### Classification of known Shahid Security–controlled external properties

| Property | Category | Status |
|---|---|---|
| shahidiqbal.com, learn.shahidiqbal.com, admin.shahidiqbal.com | A — controlled, directly editable | Verified clean (§1) |
| Facebook (`facebook.com/shahidsecurityofficial`) | B — controlled but requires account access | **Not independently verified this session.** This session has no ability to log into or browse the account's About/Contact section. **Recommended owner action:** check the Page's About → Contact info section directly and remove any listed phone number, replacing it with the email address if a contact method is required there. |
| Instagram (`instagram.com/shahidsecurityofficial`) | B — controlled but requires account access | Same as above — **not independently verified**, recommend the owner check the profile's contact/business-info fields directly. |
| X / Twitter (`x.com/shahidsecurity`) | B — controlled but requires account access | Same as above — X profiles can carry a phone number only via linked business contact features; **recommend the owner confirm none is set.** |
| LinkedIn (`linkedin.com/in/shahidlooper`, referenced in `site.ts` as a personal profile, not currently linked from the public site's social rail) | B — controlled but requires account access | Not checked this session (not currently surfaced publicly on the site, lower priority) — flagged for completeness since it's a known Shahid Security–associated property. |

No Category C (third-party-controlled) or Category D (search-cache-only) occurrences were found in this session's searches. This does not guarantee none exist — search engines do not index everything, and a direct search for the number itself was deliberately avoided in this report (to avoid ever reproducing it), which limits how exhaustive this specific check could be without risking exposing the number in search history or logs. If the owner has reason to believe the number is listed somewhere specific (an old directory, a cached page, a review site), the most reliable check is for the owner themselves to search for their own number directly and report back what they find, since this session intentionally never typed the number into any tool.

## 4. What this audit does NOT claim

- This audit does **not** claim the number has been removed from "the entire internet." It reports only what was checked in this session and what was found (or not found).
- This audit does **not** claim the social media profiles (Category B) are clean — that requires account-owner access this session does not have.
- This audit did **not** submit any third-party removal request, since no third-party (Category C) occurrence was found requiring one. If one surfaces later, the general process is: identify the publisher, use their official listing-correction or privacy-request form (never submit a request impersonating the business owner), and record submission status separately from confirmed removal, since a correction request being submitted is not the same as it being honored.

## 5. Remaining actions requiring the account owner

1. Check Facebook, Instagram, and X business/contact-info fields directly and remove the phone number if present, replacing with `info@shahidiqbal.com` where a contact method is expected.
2. Check Google Business Profile (if one exists — not confirmed either way in this session, since that also requires account access) for a listed phone number.
3. If the number has ever been submitted to a business directory, local listing site, or similar, check those individually — this session found none indexed, but that is not a guarantee of completeness.
