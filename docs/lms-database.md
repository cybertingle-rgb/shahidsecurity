# Learn with Shahid — Database Design Proposal

**Status:** built, migrated, and tested locally against MySQL (updated 2026-09-27 — this document originally described a PostgreSQL design; you later chose MySQL to keep everything on your existing Hostinger account, per `LMS_DECISIONS.md` addendum 2). The domain model below (tables, columns, relationships) is unchanged and still accurate; only the underlying engine and a few MySQL-specific mechanics differ from what's written here:

- IDs are `varchar(36)` (MySQL has no native UUID type), generated client-side via `crypto.randomUUID()` — see `apps/learn/src/db/schema/columns.ts`.
- `jsonb` → MySQL `json`; `timestamptz` → MySQL `datetime`, always read/written in UTC by the app.
- No native array type — the one array column (`coupons.applicable_product_ids`) is a JSON array instead.
- **`audit_logs`'s insert-only enforcement needs two MySQL users, not one** — MySQL can't `REVOKE` a privilege from one table if it was granted at the database level, so the app's runtime user is provisioned with per-table grants from the start (`apps/learn/src/db/apply-grants.ts`), separate from the full-privilege user migrations run as. See that file's comments and `LMS_DECISIONS.md` #35–36 for why, and the open question about whether Hostinger's user has the `GRANT OPTION` this requires.

The actual, current schema is `apps/learn/src/db/schema/*.ts` — treat it as canonical over this document if the two ever disagree; this document is the design rationale, not a literal DDL reference anymore.

Grouped by domain. Foreign keys are named `<table>_id`.

## Identity & access control

- **`users`** — `id`, `email` (unique, citext), `password_hash` (argon2id, never plaintext), `full_name`, `country_code`, `phone` (nullable), `username` (nullable, unique), `email_verified_at` (nullable), `status` (`active` / `suspended`), `last_login_at`.
- **`roles`** — `id`, `name` (`super_admin`, `admin`, `instructor`, `student`, plus room for `moderator`/`teaching_assistant`/`support` later), `description`.
- **`permissions`** — `id`, `key` (e.g. `courses.create`, `payments.refund`), `description`.
- **`role_permissions`** — join table, `role_id`, `permission_id`. Permissions are granular and stored in the database, not hardcoded `if (role === 'admin')` checks scattered through the app — so a future `moderator` role can be granted exactly the permissions it needs without a code change.
- **`user_roles`** — join table, `user_id`, `role_id` (a user can hold more than one role, e.g. instructor + student).
- **`sessions`** — `id`, `user_id`, `session_token_hash`, `ip_address`, `user_agent`, `expires_at`, `created_at`. Managed by the auth library (Lucia/Auth.js), not hand-rolled.
- **`auth_events`** — `id`, `user_id` (nullable — failed logins may not resolve to a known user), `event_type` (`login_success`, `login_failed`, `password_reset_requested`, `suspicious_login`, …), `ip_address`, `user_agent`, `metadata jsonb`, `created_at`. Feeds brute-force detection and the admin audit trail.

## Courses & content

- **`instructors`** — `id`, `user_id` (nullable — an instructor profile can exist before a login account does), `display_name`, `bio`, `photo_url`, `credentials_text` (free text, never auto-generated).
- **`courses`** — `id`, `title`, `slug` (unique), `short_description`, `full_description`, `thumbnail_url`, `instructor_id`, `category`, `level` (`beginner`/`intermediate`/`advanced`/`expert`), `duration_minutes`, `language`, `status` (`draft`/`review`/`published`/`archived`), `published_at`, `featured` (bool), `seo_title`, `seo_description`, `canonical_url`, `og_image_url`. **No price column here** — price lives in `products`/`prices` (see Commerce) so a course can be free, bundled, or priced differently per country without touching this table.
- **`course_modules`** — `id`, `course_id`, `title`, `sort_order`.
- **`lessons`** — `id`, `module_id`, `title`, `type` (`video`/`text`/`pdf`/`image`/`code`/`quiz`/`assignment`/`external_resource`/`download`), `content jsonb` (shape depends on `type`), `is_free_preview` (bool), `requires_enrollment` (bool, default true), `drip_release_at` (nullable — absolute date) or `drip_release_days_after_enrollment` (nullable — relative), `estimated_duration_minutes`, `sort_order`.
- **`lesson_video_sources`** — `id`, `lesson_id`, `provider` (`youtube_unlisted`/`vimeo`/`cloud_storage`/`other`), `provider_reference` (video ID or URL — never a raw public URL for members-only content), `notes`. A separate table, not a column on `lessons`, so the video-hosting decision can change per lesson without a schema change — and so we're never pretending a hosting choice is DRM when it isn't (see `lms-security.md`).

## Enrollment & progress

- **`enrollments`** — `id`, `user_id`, `course_id`, `product_id` (what was actually purchased/granted — a course can be reached via direct purchase, a bundle, or a membership), `source` (`purchase`/`membership`/`manual_admin_grant`/`coupon`), `status` (`active`/`revoked`/`expired`), `enrolled_at`, `expires_at` (nullable).
- **`lesson_progress`** — `id`, `enrollment_id`, `lesson_id`, `status` (`not_started`/`in_progress`/`completed`), `watch_progress_seconds` (nullable, video only), `started_at`, `completed_at`.
- **`course_progress`** — `id`, `enrollment_id`, `percent_complete`, `last_lesson_id`, `updated_at`. Denormalized on purpose (recomputed from `lesson_progress` whenever it changes) so "Continue Learning" on the dashboard is a single indexed read, not an aggregate query on every page load.
- **`quizzes`** — `id`, `lesson_id`, `passing_percentage`, `max_attempts` (nullable = unlimited), `randomize_questions` (bool), `time_limit_minutes` (nullable), `show_answers_after_submit` (bool).
- **`quiz_questions`** — `id`, `quiz_id`, `type` (`multiple_choice`/`multiple_answer`/`true_false`/`short_answer`), `prompt`, `options jsonb`, `correct_answer jsonb`, `explanation` (nullable), `sort_order`.
- **`quiz_attempts`** — `id`, `quiz_id`, `enrollment_id`, `answers jsonb`, `score_percentage`, `passed` (bool), `started_at`, `submitted_at`.
- **`assignments`** — `id`, `lesson_id`, `instructions`, `submission_type` (`text`/`file_upload`/`external_link`).
- **`assignment_submissions`** — `id`, `assignment_id`, `enrollment_id`, `content jsonb`, `file_url` (nullable, validated per `lms-security.md`), `status` (`submitted`/`reviewed`/`needs_revision`), `instructor_feedback` (nullable), `submitted_at`, `reviewed_at`.

## Certificates

- **`certificates`** — `id`, `certificate_number` (public-facing, unique, not a raw sequential int — e.g. a short random slug to avoid enumeration), `user_id`, `course_id`, `enrollment_id`, `issued_at`, `instructor_id`, `title` (defaults to "Certificate of Course Completion" — never "certification" language unless a real accredited structure exists, per the brief).
- **`certificate_verifications`** — `id`, `certificate_id`, `verified_at`, `verifier_ip` (only if legally appropriate to log — confirm with a privacy review before enabling), for basic abuse monitoring on `/verify/[certificate-id]`.

## Commerce: products, pricing, orders, payments

This is the part of the schema doing the most work to satisfy "never hardcode PKR 800" and "prices update by country."

- **`products`** — `id`, `type` (`course`/`membership`/`bundle`/`workshop`/`bootcamp`/`mentoring`/`digital_product`/`live_class`), `name`, `description`, `status` (`draft`/`active`/`inactive`), `access_rules jsonb` (what owning this product actually grants — a course ID, a set of course IDs for a bundle, a membership tier, etc.), `duration` (nullable, for time-limited access), `instructor_id` (nullable), `seo jsonb`. **The "Learn with Shahid Enrollment" is just a row here, type `membership`** — not a special case anywhere in code.
- **`prices`** — `id`, `product_id`, `currency_code` (ISO 4217: `PKR`, `USD`, `AED`, `SAR`, `QAR`, `GBP`, `CAD`, `AUD`, …), `country_code` (ISO 3166-1 alpha-2, nullable — a null country with a given currency is the *default* price for that currency), `amount` (integer, minor units — paisa/cents, never a float), `sale_amount` (nullable), `is_active` (bool). **This is the single source of truth for "PKR 800."** The enrollment product has exactly one row here for `PKR`/no country override at launch; adding a UAE-specific `AED` price later is an insert into this table, not a code change.
- **`price_resolution`** (not a table — a documented rule): given a product and a resolved country (see `lms-business-model.md` §"Country/currency resolution"), the price shown and the price *charged* is: the most specific matching row in `prices` (`product_id` + `country_code` match) → else the row matching `product_id` + the currency conventionally used for that country with `country_code IS NULL` → else the product's default currency row. **The price is always looked up server-side at checkout time from this table — never trusted from anything the client sent**, per the brief's explicit "never determine paid access from frontend state" rule.
- **`orders`** — `id`, `order_number` (public-facing), `user_id`, `product_id`, `amount`, `currency_code`, `discount_amount`, `coupon_id` (nullable), `payment_provider`, `payment_reference` (nullable until paid), `status` (`pending`/`paid`/`failed`/`cancelled`/`refunded`/`partially_refunded`), `created_at`, `paid_at` (nullable).
- **`order_items`** — `id`, `order_id`, `product_id`, `unit_amount` — kept separate from `orders` even though V1 is single-item-per-order, so bundles/multi-item carts don't require a schema change later.
- **`payments`** — `id`, `order_id`, `provider`, `provider_payment_id` (nullable for manual payments), `amount`, `currency_code`, `status` (`pending_verification`/`succeeded`/`failed`/`refunded`), `method` (`online`/`manual_bank_transfer`), `verified_by_user_id` (nullable — the admin who approved a manual payment), `verified_at` (nullable), `idempotency_key` (unique — see `lms-payments.md`).
- **`manual_payment_submissions`** — `id`, `payment_id`, `transaction_reference`, `amount_claimed`, `payment_date`, `receipt_file_url` (nullable), `admin_notes` (nullable), `status` (`pending`/`approved`/`rejected`/`clarification_requested`).
- **`refunds`** — `id`, `payment_id`, `amount`, `reason`, `status` (`requested`/`approved`/`rejected`/`processed`), `requested_by_user_id`, `processed_by_user_id` (nullable), `processed_at` (nullable).
- **`coupons`** — `id`, `code` (unique), `discount_type` (`percentage`/`fixed`), `discount_value`, `expires_at` (nullable), `usage_limit` (nullable), `per_user_limit` (nullable, default 1), `applicable_product_ids uuid[]` (empty = all products), `minimum_order_amount` (nullable), `is_active` (bool).
- **`coupon_usage`** — `id`, `coupon_id`, `user_id`, `order_id`, `used_at`. Enforced with a unique constraint on `(coupon_id, user_id)` when `per_user_limit = 1`, and a count check otherwise — at the database level, not just application logic, to close the race-condition window the brief's anti-fraud section calls out.

## Memberships & communities

- **`memberships`** — `id`, `user_id`, `product_id` (the membership product purchased), `status` (`active`/`expired`/`cancelled`), `started_at`, `expires_at` (nullable — the launch membership may be lifetime; recurring plans are a later phase per the brief).
- **`communities`** — `id`, `name`, `description`, `platform` (`discord`/`facebook`/`telegram`/`whatsapp`/`other`), `url` (the actual invite/group link — **never returned by any public/unauthenticated API response**), `required_product_id` (nullable — which membership/product grants eligibility), `status` (`active`/`inactive`), `sort_order`.
- **`community_access`** — `id`, `user_id`, `community_id`, `status` (`not_eligible`/`eligible`/`invitation_pending`/`invited`/`joined`/`revoked`), `invited_at` (nullable), `joined_at` (nullable), `notes` (nullable, admin-only). This state machine exists precisely because, per the brief, "eligible" and "actually added to Discord" are different things until there's a real API integration — V1 ships as admin-assisted invitation, tracked honestly rather than faked as automatic.

## Live classes, resources, announcements, support

- **`live_classes`** — `id`, `course_id` (nullable — can be standalone), `instructor_id`, `scheduled_at`, `timezone`, `meeting_url` (private — never in a public API response), `recording_url` (nullable, filled in after), `status` (`scheduled`/`live`/`completed`/`cancelled`).
- **`live_class_attendance`** — `id`, `live_class_id`, `user_id`, `joined_at` (nullable), `attended` (bool).
- **`resources`** — `id`, `title`, `description`, `type` (`article`/`tool`/`video`/`external_link`/`download`), `url_or_file`, `related_roadmap_stage_id` (nullable), `related_course_id` (nullable), `status` (`draft`/`published`).
- **`roadmap_stages`** — `id`, `level_number`, `title`, `description`, `prerequisites_text`, `is_required` (bool — supports "this path isn't mandatory" per the brief), `sort_order`.
- **`roadmap_stage_resources`** — join table linking `roadmap_stages` to `resources`, `courses`, and blog article URLs (stored as a `jsonb` array of `{type, url, label}` for the blog-article case, since blog posts live in the *other* codebase and aren't a foreign key target).
- **`announcements`** — `id`, `title`, `body`, `target_type` (`all`/`membership`/`course`/`group`), `target_id` (nullable), `channels jsonb` (`{dashboard: true, email: true}`), `published_at`.
- **`support_tickets`** — `id`, `user_id`, `subject`, `status` (`open`/`in_progress`/`resolved`/`closed`), `related_course_id` (nullable).
- **`support_ticket_messages`** — `id`, `ticket_id`, `sender_user_id`, `body`, `created_at`.

## Platform: audit, notifications, settings

- **`audit_logs`** — `id`, `actor_user_id`, `action` (e.g. `course_created`, `payment_approved`, `price_changed`), `target_type`, `target_id`, `metadata jsonb`, `ip_address` (only where a privacy review confirms it's appropriate to log), `created_at`. **Insert-only from application code** — no `UPDATE`/`DELETE` grant on this table for the application's normal database role; only a separate, rarely-used maintenance role can touch it, which is how "ordinary admins cannot silently delete audit records" gets enforced at the database level rather than just the UI.
- **`notifications`** — `id`, `user_id`, `type`, `payload jsonb`, `read_at` (nullable), `created_at`. In-app notification feed, separate from email.
- **`settings`** — `id`, `key` (unique, e.g. `default_enrollment_product_id`, `support_email`, `certificate_org_name`), `value jsonb`. The generic admin-configurable settings store — this is *how* "no hardcoded PKR 800" and "no hardcoded community links" actually get satisfied at the code level: application code reads `settings`/`products`/`communities` tables, never a constant.

## What's explicitly deferred, not designed away

Subscriptions (recurring billing), multi-instructor revenue splits, and true DRM-grade video protection are called out in the brief as future/optional. The schema above doesn't block them (e.g. `memberships.expires_at` already supports a recurring model once a provider that supports recurring charges is chosen), but their full design is deferred to whichever phase actually implements them, per the brief's "do not build subscriptions until payment provider support is properly implemented" instruction.
