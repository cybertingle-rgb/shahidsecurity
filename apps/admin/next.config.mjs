import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output, same as apps/learn — required on this host (no
  // shell access to install deps at runtime). outputFileTracingRoot MUST
  // stay pointed at the pnpm workspace root: this app's real
  // node_modules entries are symlinks out to the workspace's shared
  // .pnpm store, and Turbopack refuses to resolve/compile anything
  // outside the configured tracing root at all (confirmed — narrowing
  // this to the app's own directory breaks the build outright, not just
  // the deploy). The unavoidable side effect is that the standalone
  // output nests an extra apps/admin/ level inside itself
  // (.next/standalone/apps/admin/server.js, with node_modules sitting
  // one level up as a sibling, not inside that folder) — see
  // scripts/flatten-standalone.mjs, run as part of `pnpm build` below,
  // for why that nesting has to be collapsed back out after the build.
  output: 'standalone',
  outputFileTracingRoot: path.join(dirname, '../../'),
  // The standalone build only bundles files actually imported by traced
  // code — the drizzle-kit migrator reads these SQL files and
  // meta/_journal.json from disk at runtime (migrationsFolder: './drizzle'),
  // so they'd otherwise be silently missing from the deployed output.
  // Needed by /api/internal/migrate, which runs migrations from inside
  // the already-running server on hosts with no separate shell access to
  // the build environment (confirmed missing against a real deploy —
  // "Can't find meta/_journal.json file" — not assumed).
  outputFileTracingIncludes: {
    '/api/internal/migrate/route': ['./drizzle/**/*'],
  },
  poweredByHeader: false,
  // Served at admin.shahidiqbal.com (its own subdomain, not a path) —
  // no basePath needed since the app already sits at the subdomain's
  // root. See docs/DEPLOYMENT.md.
  experimental: {
    // Same Turbopack workaround as apps/learn's next.config.mjs — avoids a
    // process-spawn panic seen under load on this host.
    turbopackPluginRuntimeStrategy: 'workerThreads',
  },
  async headers() {
    return [
      // Unlike apps/learn, this entire application is a private
      // administration panel — it has no public-facing pages at all, so
      // every route gets noindex, not just a subset.
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
