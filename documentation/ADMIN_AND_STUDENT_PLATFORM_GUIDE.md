# Admin and Student Platform Guide

Full depth: manual §4 (Step-by-Step Administration Guide).

Both the admin dashboard (`/admin/dashboard/*`) and the student/"Learn" platform (`/learn/*`) are served by the same `apps/gateway` Next.js app, with database-backed, freshly-checked permissions on every privileged action — nothing is trusted from a cookie or client claim.

## Admin dashboard modules (verified by directory listing, not assumed)

| Module | Path | What it actually does |
|---|---|---|
| AI | `/admin/dashboard/ai` | Review questions Luna's AI chat couldn't answer (`ai/questions`) |
| Business / Services | `/admin/dashboard/business` | Manage service catalogue *records* — distinct from the static Astro `/services/*` marketing pages |
| Configurations | `/admin/dashboard/configurations` | Site-wide settings |
| Content / Blog | `/admin/dashboard/content` | The one genuinely CMS-like module — **verify which source the public `/blog/` pages actually read from** (this table vs. the Astro `.mdx` files) before relying on a specific publish behavior |
| Google integrations | `/admin/dashboard/google` | Business Profile, Search Console, Analytics connection status |
| Leads | `/admin/dashboard/leads` | Contact-form submissions **and** consultation bookings — the same module, not separate features |
| Learn (student-platform admin) | `/admin/dashboard/learn` | The largest module: courses, students, enrollments, orders, training-requests, communities, payment-methods, exchange-rates, announcements, payments, roadmap |
| Media | `/admin/dashboard/media` | Uploaded media — files live in the database, not on disk (see `FILE_STORAGE_RESTORATION_GUIDE.md`) |
| Payments | `/admin/dashboard/payments` | Closest equivalent to an "invoices" module — there is no separate one |
| Pricing | `/admin/dashboard/pricing` | Plans and add-ons. A price change is **not instant** on the public `/pricing/` page — base USD figures bake in at the next Astro rebuild; only the client-side currency conversion is live |
| SEO | `/admin/dashboard/seo` | Redirects, health, page metadata overrides — **redirects here are data-entry only, not yet wired to actually serve redirects in production** |
| Testimonials | `/admin/dashboard/testimonials` | Plus review-requests |
| Users | `/admin/dashboard/users` | Create staff accounts, edit role assignments, deactivate. A role change takes effect on the user's *next* permission check, not their current session |

## Stated plainly — where this differs from a typical admin panel

- **No dedicated audit-log viewer exists.** Every sensitive action genuinely writes to `audit_logs`, but no admin page reads it back yet — reviewing it today requires a direct database query.
- **SEO "redirects" doesn't actually redirect anything yet** — it's a data-entry table, not a live feature.
- **No separate "invoices" module** — Payments is the closest equivalent.
- **No CMS-style page editor for the marketing site** — it's static Astro source; only Blog is genuinely admin-editable content.

## The student ("Learn") platform

Public-facing: course catalogue, enrollment, self-service registration (unlike admin, which has no public self-registration), Luna AI chat support, a personal-training request flow (a *request to discuss*, never itself a purchase — no price exists until explicitly agreed). The corresponding admin-side management for all of this lives under `/admin/dashboard/learn/*`, reading and writing the same underlying tables from the opposite direction — e.g. a student's personal-training request (`/learn/dashboard/personal-training`) pairs directly with `/admin/dashboard/learn/training-requests`.

## General troubleshooting pattern for "nothing happens when I click Save"

Every Server Action throws a specific `ForbiddenError`/`UnauthenticatedError` on a permission or session failure. Confirm the user's actual role/permission first — this is very often not a form bug.
