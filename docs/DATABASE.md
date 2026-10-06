# Database

## Separation from the LMS

`apps/admin` has its own MySQL database (`shahid_security_admin_*`),
entirely separate from `apps/learn`'s (`learn_with_shahid_*`) — no
foreign keys, no shared tables, no shared database user. Per the
brief's explicit instruction: don't merge them without a compelling
architectural reason, and there isn't one — the two apps serve
different audiences (staff vs. students) with different risk profiles.

## Two-user grant model (same pattern as apps/learn)

- An admin-privilege user (`DATABASE_ADMIN_URL`) runs migrations
  (`pnpm db:migrate`) and provisions the narrow user's grants
  (`pnpm db:apply-grants`). Needs DDL and `GRANT OPTION`.
- A narrow runtime user (`DATABASE_URL`) is what the deployed app
  actually connects as. `apply-grants.ts` grants it SELECT/INSERT/
  UPDATE/DELETE on every table **except** `audit_logs`, which gets only
  SELECT/INSERT — enforced by MySQL itself, not application code.
  Verified with a real test: the runtime user's UPDATE/DELETE against
  `audit_logs` is rejected by MySQL with "command denied."

## Schema (40 tables)

- **Identity/RBAC**: `admin_users`, `admin_roles`, `admin_permissions`,
  `admin_role_permissions`, `admin_user_roles`, `admin_sessions`,
  `admin_auth_events`, `rate_limit_hits`, `audit_logs`
- **Business**: `business_settings` (single row), `social_profiles`,
  `services`, `faqs`, `case_studies`
- **Content**: `blog_posts`, `blog_categories`, `blog_tags`,
  `blog_post_tags`, `blog_post_faqs`, `blog_post_relations`,
  `blog_authors`, `media`, `ai_knowledge_sources`, `ai_questions`,
  `ai_conversations`
- **CRM**: `leads`, `consultations`, `customers`, `testimonials`,
  `review_requests`, `payment_methods`, `invoices`, `payments`
- **Google**: `google_connections`, `google_business_profiles`,
  `google_sync_logs`, `analytics_connections`,
  `search_console_connections`
- **SEO**: `seo_pages`, `seo_redirects`

## Nullable-by-design fields (not oversights)

Checked against the real forms before building on top of them, not
assumed:

- `leads.email`, `customers.email`, `consultations.email` are nullable
  — the booking form (`book.php`) genuinely never collects an email
  (confirmation happens over phone/WhatsApp, by that form's own
  long-standing design).
- `consultations.country` is a free-text `varchar(100)`, not an ISO
  country code — the booking form has always collected an open text
  field, not a code picker.

## Migrations

Drizzle Kit, run with `pnpm db:generate` / `pnpm db:migrate`. Three
migrations exist as of this phase: the initial 40-table schema, a
correction fixing the nullable-email/free-text-country fields above
(caught and fixed before any real data existed, by checking the real
PHP forms), and adding `business_settings.google_review_url`.
