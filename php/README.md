# PHP dependencies (contact form)

This folder holds the PHPMailer dependency used by `public/api/contact.php`. It is **not**
part of the Astro build (`dist/`) — it is uploaded separately, as a sibling of `public_html`,
so the library code and mail credentials never sit inside the web-servable directory.

## Setup

```bash
cd php
composer install --no-dev
```

This creates `php/vendor/` (gitignored). Nothing here needs a `.env` — SMTP credentials live
in the config file described below, not in this folder.

## Deploying to Hostinger

Upload this whole `php/` folder (including `vendor/`) to the directory **one level above**
`public_html`, e.g.:

```
/home/<hostinger-user>/
├── public_html/        ← contents of dist/ go here
├── php/                ← this folder (composer install already run)
│   └── vendor/
└── shahid-security-config.php   ← copy from php/config-template/, filled in, chmod 600
```

`public/api/contact.php` resolves this directory automatically via `dirname(__DIR__, 2)`
(two levels up from `public_html/api/contact.php`). If your Hostinger account nests
`public_html` differently (e.g. under `domains/shahidiqbal.com/public_html`), edit the
`SITE_PARENT_DIR_LEVELS` constant at the top of `contact.php` to match.

## Gated report downloads

`public/api/report-download.php` and `public/api/report-file.php` serve the "request the
full report" flow on case study pages (e.g. `/case-studies/iot-smart-campus-threat-analysis/`).
The actual PDF files live outside `public_html` too, alongside this folder:

```
/home/<hostinger-user>/
├── public_html/
├── php/
│   ├── vendor/
│   └── protected/
│       └── reports/
│           └── iot-smart-campus-thesis.pdf   ← upload manually, not part of the git repo
└── shahid-security-config.php
```

Add a new report by (1) dropping the PDF into `php/protected/reports/`, and (2) adding its
slug to the `ALLOWED_REPORTS` map in both `report-download.php` and `report-file.php` — the
slug is never taken from user input beyond that allowlist lookup, so there's no path
traversal risk. Download tokens (minted after a visitor submits the gate form) live in
`shahid-security-data/report-tokens/` and expire after 48 hours.

## Config file

Copy `config-template/shahid-security-config.php` to the location above, fill in real
SMTP credentials and the Turnstile secret key, and set file permissions to `600`. See the
comments in that file for what each constant does. If this file is missing, the contact
form fails safely with a generic error instead of crashing — useful for local testing
without real credentials.
