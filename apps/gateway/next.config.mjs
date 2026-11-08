import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Falls back to the real, currently-live subdomains so this works with no
// env vars set at all (see .env.example) — staging/local only need to
// override these, never admin/learn's own deploy.
const ADMIN_APP_URL = process.env.ADMIN_APP_URL ?? 'https://admin.shahidiqbal.com';
const LEARN_APP_URL = process.env.LEARN_APP_URL ?? 'https://learn.shahidiqbal.com';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Same standalone + outputFileTracingRoot pattern as apps/admin/apps/learn
  // — see those files' own comments for why both are required on this
  // pnpm-monorepo + Hostinger-Node.js-hosting combination.
  output: 'standalone',
  outputFileTracingRoot: path.join(dirname, '../../'),
  poweredByHeader: false,
  // Astro's own astro.config.mjs sets trailingSlash: 'always' (every page's
  // canonical URL/sitemap entry already ends in '/'), but apps/admin and
  // apps/learn both use Next's default (no trailing slash) for their own
  // routes. A single global `trailingSlash` value can't satisfy both at
  // once, so Next's automatic redirect is turned off entirely here and
  // handled per-prefix instead, in src/proxy.ts: trailing slash added for
  // Astro-site paths, left alone for /admin/* and /learn/*. Confirmed by
  // testing the standalone server directly that without this, Next's
  // default redirect either breaks the Astro site's URLs (trailingSlash
  // false) or breaks /admin and /learn's rewrites (trailingSlash true) —
  // there's no single setting that gets both right.
  skipTrailingSlashRedirect: true,
  // This app's own job is only to route and to serve the Astro site's
  // static output (docs/consolidation/UNIFIED_ARCHITECTURE.md §2.1) — it
  // has no pages of its own worth indexing differently from the Astro
  // site it's fronting, so no noindex header here (unlike admin/learn):
  // the Astro site's own per-page metadata is what actually controls
  // indexing, and passes through unchanged since this app never touches
  // the response body for `/`.
  async rewrites() {
    return [
      { source: '/admin', destination: `${ADMIN_APP_URL}/admin` },
      { source: '/admin/:path*', destination: `${ADMIN_APP_URL}/admin/:path*` },
      { source: '/learn', destination: `${LEARN_APP_URL}/learn` },
      { source: '/learn/:path*', destination: `${LEARN_APP_URL}/learn/:path*` },
    ];
  },
};

export default nextConfig;
