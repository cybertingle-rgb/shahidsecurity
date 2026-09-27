# Learn with Shahid — Business Model & Product Catalog

**Status:** proposal.

## Revenue streams (what the architecture must not block, without building all of it now)

| Stream | V1? | Notes |
| --- | --- | --- |
| A. Learn with Shahid enrollment (PKR 800) | **Yes** | The `membership`-type product described below |
| B. Individual paid courses | **Yes** | `course`-type products |
| C. Course bundles | Later | `bundle`-type product referencing multiple courses; schema-ready, not built in V1 |
| D. Premium memberships (tiers) | Later | `memberships.product_id` already supports multiple tiers; only one tier ships at launch |
| E–I. Live classes, workshops, bootcamps, mentorship, 1:1 sessions | Later | `live_class` / `workshop` / `bootcamp` / `mentoring` product types exist in the catalog design; not scheduled until Phase 8+ |
| J. Corporate training | Later | Likely sold outside the self-serve checkout entirely (a sales conversation, not a cart) — flagged for a manual/invoice-based order path if pursued |
| K. Paid labs | Later | Could be a `lesson` type or a `digital_product`, depending on what a "lab" ends up being technically |
| L. Digital downloads/eBooks | Later | `digital_product` type |
| M. Career preparation programs | Later | Likely a `bootcamp` variant |
| N. Subscriptions | Explicitly deferred | Per the brief: only once a provider with real recurring-billing support is chosen |
| O. Affiliate/resource partnerships | Later, and only where genuinely appropriate | No fabricated partnerships ever |

The point of the `products` table design (`lms-database.md`) is that B–M are all the *same* underlying mechanism (a typed product with a price and access rules) — adding stream E later is inserting new rows and writing the "grant a live-class seat" access-rule handler, not rebuilding checkout, orders, or payments.

## The V1 catalog, concretely

- **One membership product**: "Learn with Shahid Enrollment" — PKR 800, grants: student dashboard access, community eligibility (see below), announcements, and whatever `member_only` content admin flags. This is a single row in `products` + `prices`; the price is never written into application code.
- **A small number of course products**, published as admin adds real course content — no placeholder or "coming soon" courses that imply more exists than actually does.

## Country/currency resolution — the "prices update by country or location" requirement

This is a real, explicit requirement (added after the brief's main body) and it needs a server-side answer, because the marketing site is static and can't do this itself — the resolution happens **in the LMS application**, which the pricing-aware pages call into:

1. **Explicit selection wins.** A visible country/currency switcher (not hidden in a menu) lets a visitor choose their own country at any time; that choice is stored (a cookie for anonymous visitors, the `users.country_code` field once registered) and always takes priority over any automatic guess.
2. **Automatic default, when no explicit choice exists yet**: the LMS app's server resolves the visitor's country from the request itself — either the `CF-IPCountry` header (available for free the moment the `learn.shahidiqbal.com` subdomain's DNS is proxied through Cloudflare, which costs nothing and is worth doing for this reason alone) or a standard IP-geolocation lookup as a fallback if Cloudflare isn't in front of that subdomain. **This cannot be done by the static marketing site today** (confirmed in the architecture audit — no server-side request handling exists there), which is one more reason pricing-aware pages fetch live from the LMS API rather than being fully static.
3. **Resolved country → resolved currency → resolved price**, using the `prices` table lookup rule in `lms-database.md` (most specific country match → currency default → product default). If a visitor's detected or selected country has no specific price row, they see the product's default (PKR) price converted for *display only* — clearly labelled as an estimate — while checkout still happens in a currency the chosen payment provider actually supports for that market, which for V1 (Pakistan-only payment processing) means **non-Pakistani visitors see pricing information but the checkout flow itself is scoped to what's actually payable in V1**, expanding as `lms-payments.md`'s international processing gets built out.
4. **The price actually charged is always the server-side lookup at the moment of checkout**, never a value carried over from an earlier page view or client state — consistent with the "never determine paid access from frontend state" rule.

This is intentionally a V1-appropriate scope: real country detection and a real override control, wired to a real multi-currency price table, without pretending V1 can actually process payments in eight currencies when only Pakistani payment rails are integrated at launch.

## Community access model

Community membership (Discord/Facebook/Telegram/WhatsApp) is **eligibility, not automatic addition** — reflected honestly in the `community_access` state machine (`not_eligible → eligible → invitation_pending → invited → joined → revoked`) rather than pretending a paid enrollment technically adds someone to a Discord server the moment they pay. V1 ships as: enrollment makes a student `eligible`, the student dashboard shows the configured invite link/instructions for each active community (never a raw link before eligibility is confirmed), and admin can see who's `invited` vs. actually confirmed `joined` if a platform's API later supports checking that. Community links, names, descriptions, and active/inactive status are entirely admin-configurable (`communities` table) — never hardcoded in a template.

## Marketing funnel and cross-selling

The funnel described in the brief (visitor → cybersecurity content → roadmap → Learn with Shahid → enrollment → community → paid course → completion → certificate → advanced course/mentorship → consulting services) maps directly onto the internal linking already built this session (blog articles ↔ services) plus the new `/learn/roadmap` and `/learn/resources` linking described in `lms-roadmap.md`. Cross-selling ("Continue your SOC path," "Recommended next course") is a recommendation based on **actual enrollment/progress data** (what course/roadmap stage a student is genuinely on), not an engagement-maximizing dark pattern — shown as a small, dismissible dashboard section, not an interstitial or a nag.

## Legal/business-claims guardrails (binding on all future content, not just V1)

No fabricated student counts, reviews, testimonials, certifications, accreditation, partnerships, instructor credentials beyond what's real, employment outcomes, or income/job guarantees — ever, in marketing copy, structured data, or the product catalog itself. Certificates are labelled "Certificate of Course Completion," never "certification," unless a genuine accredited structure is established later. This mirrors the standard already enforced on the existing site's content this session, extended to the new education product line.
