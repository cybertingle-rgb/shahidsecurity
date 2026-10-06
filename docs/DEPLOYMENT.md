# Deployment

This doc covers deploying **the admin app itself** (`apps/admin`, a
separate Next.js application, served at `shahidiqbal.com/admin` — a
path on the main domain, not a subdomain, per Shahid's explicit
preference). For how publishing content *from* the admin reaches the
**public Astro site**'s own separate deploy pipeline
(`.github/workflows/deploy.yml`), see
`docs/ADMIN_PUBLIC_SITE_INTEGRATION.md` and `docs/CONTENT_PUBLISHING.md`
instead — those two pipelines are independent of each other on purpose.

## Reality check first

As of this writing, **`apps/admin` has never successfully deployed
anywhere** — every run of `.github/workflows/deploy-admin.yml` to date
has failed at the build step, because none of its required secrets
exist in the GitHub repo yet. This isn't a code bug; it's expected
behavior for an app whose hosting was never configured. Same situation
for `apps/learn`/`deploy-lms.yml`, confirmed separately, if that's ever
tackled too.

## Two ways to actually deploy this — pick one

### Option A: a second "Website" in the same Hostinger panel you're already using

The marketing site (`shahidiqbal.com`) is live today through a
Hostinger product that auto-builds directly from this GitHub repo on
push — no GitHub Actions involved for it at all. If that same product
lets you add a second "Website" pointed at this repo with its own build
command and a path (not just a subdomain) on the existing domain, that
is the **simplest, most proven path** — it's exactly the mechanism
already working for the main site, just configured for `apps/admin`
instead:

- Build command: `cd apps/admin && pnpm install && pnpm build`
- Start command: `node apps/admin/.next/standalone/apps/admin/server.js`
  (the standalone output nests under `apps/admin/` again inside itself
  — confirmed by inspecting a real build, not assumed; see the comment
  in `.github/workflows/deploy-admin.yml`'s "Assemble standalone deploy
  bundle" step for why)
- Static assets: after build, `apps/admin/.next/static` and
  `apps/admin/public` (if present) must be copied into
  `apps/admin/.next/standalone/apps/admin/.next/static` and
  `.../apps/admin/public` respectively before starting the server — if
  this Hostinger product runs an arbitrary post-build command, add that
  copy there; if it doesn't, Option B (below) already does this step.
- URL: `shahidiqbal.com/admin` — whether this specific product supports
  a path on an existing domain (vs. only a new domain/subdomain) is
  something only visible from inside that panel; check when creating
  the second Website.
- Environment variables: paste the full list below into that Website's
  own "Environment variables" screen (the one already shown in Shahid's
  screenshot, currently empty).

### Option B: `.github/workflows/deploy-admin.yml` (GitHub Actions + SSH)

Already written, fixed this phase (a wrong hardcoded Hostinger user id
in its deploy path, and a wrong destination path for static assets —
both found and corrected, neither ever exercised in a real run since
every run has died earlier at the build step). Needs classic hPanel
"Setup Node.js App" access with an **Application startup file** field
you can point at `apps/admin/server.js` (relative to the app's
configured Application Root) — a standard cPanel/Passenger Node.js
hosting field. If your plan doesn't expose that, use Option A instead.

1. Under hPanel's **Setup Node.js App** (or equivalent), create a new
   app with **Application URL** = `shahidiqbal.com/admin` (a path on
   the existing domain) and **Application startup file** =
   `apps/admin/server.js`.
2. Create a MySQL database and a full-privilege user for it (this
   becomes `ADMIN_DATABASE_ADMIN_URL`).
3. Add the GitHub Actions secrets listed in
   `.github/workflows/deploy-admin.yml`'s own comment — the build-time
   ones. Separately, set the full runtime list below directly on the
   Node.js App itself (GitHub Actions' build-time secrets don't carry
   into the deployed running process).
4. Set up a Cron Job (hPanel → Cron Jobs) calling
   `/admin/api/internal/publish-scheduled` every ~15 minutes — see
   `docs/BLOG_CMS.md`.
5. Push to `claude/wizardly-keller-yg0bj7` with changes under
   `apps/admin/**` (or trigger the workflow manually from the Actions
   tab).

## Environment variables — the full runtime list

Whichever option above is used, the **running Node.js process** needs
these set (Hostinger's own "Environment variables" screen for that
app, not GitHub Actions secrets, which only affect the build):

```
DATABASE_URL=mysql://<narrow-runtime-user>:<password>@127.0.0.1:3306/<db-name>
DATABASE_ADMIN_URL=mysql://<full-privilege-user>:<password>@127.0.0.1:3306/<db-name>
SESSION_SECRET=<32+ random characters>
TOKEN_ENCRYPTION_KEY=<64 hex characters — node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_APP_URL=https://shahidiqbal.com/admin
NODE_ENV=production

GITHUB_TOKEN=<fine-grained PAT or GitHub App token — docs/CONTENT_PUBLISHING.md>
GITHUB_REPO_OWNER=cybertingle-rgb
GITHUB_REPO_NAME=shahidsecurity
GITHUB_REPO_BRANCH=claude/wizardly-keller-yg0bj7

MIGRATE_SECRET=<random — distinct from every other secret here>
SEED_SECRET=<random — see docs/ADMIN_AUTH.md; rotate/remove after first use>
PUBLISH_SCHEDULED_SECRET=<random>
LEADS_INTAKE_SECRET=<random — must match shahid-security-config.php's ADMIN_LEADS_INTAKE_SECRET>
AI_QUESTIONS_INTAKE_SECRET=<random — must match apps/learn's ADMIN_AI_QUESTIONS_INTAKE_SECRET>

SMTP_HOST=<your Hostinger mail host, e.g. smtp.hostinger.com>
SMTP_PORT=587
SMTP_USER=info@shahidiqbal.com
SMTP_PASSWORD=<that mailbox's real password>
SMTP_FROM_EMAIL=info@shahidiqbal.com
SMTP_FROM_NAME=Shahid Security Admin

GOOGLE_CLIENT_ID=<optional — Google Cloud Console>
GOOGLE_CLIENT_SECRET=<optional>
GOOGLE_REDIRECT_URI=https://shahidiqbal.com/admin/api/google/callback
GOOGLE_ANALYTICS_PROPERTY_ID=<optional, unused by the current property-picker flow>
```

`GOOGLE_REDIRECT_URI` must also be added to the OAuth client's
"Authorized redirect URIs" list in Google Cloud Console — an unlisted
URI makes Google reject the OAuth flow outright.

## First deploy checklist

1. Confirm every variable above is set on the actual running app.
2. Deploy (push, or trigger the workflow, or Hostinger's own
   auto-deploy, depending which option was used).
3. Confirm `https://shahidiqbal.com/admin/login` returns a real page,
   not a 404 or 500.
4. Bootstrap the first account over HTTP (no shell access on this
   host) — see `docs/ADMIN_AUTH.md`:
   ```bash
   curl -X POST https://shahidiqbal.com/admin/api/internal/seed-super-admin \
     -H "Content-Type: application/json" \
     -H "x-seed-secret: <SEED_SECRET value>" \
     -d '{"email":"info@shahidiqbal.com","password":"<a real temporary password>"}'
   ```
5. Log in, then use "Forgot password?" to set a password only you know.
6. Rotate or remove `MIGRATE_SECRET` and `SEED_SECRET` once initial
   setup is confirmed working — a permanent HTTP bootstrap/migration
   endpoint is a standing surface even when secret-gated.

## Not yet done (requires Shahid's own action)

This session has no access to the Hostinger account or GitHub repo
secrets, so none of the panel setup, DNS/path configuration, database
creation, or secret values above have actually been entered anywhere.
Everything above was verified against a local build of this exact code
(seed → login → authenticated dashboard access, all under the `/admin`
basePath) — not against the real Hostinger deployment, which this
session cannot reach.
