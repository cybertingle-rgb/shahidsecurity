import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output copies only the files the app needs into .next/standalone,
  // which is what makes this deployable to a shared-hosting Node runtime
  // (Hostinger's "Setup Node.js App") without shipping the whole workspace.
  output: 'standalone',
  poweredByHeader: false,
  // Explicit per Hostinger support (2026-09-27): this app lives two levels
  // below the pnpm workspace root (repo-root/apps/learn), and Next's
  // auto-detected tracing root wasn't lining up with how their deploy
  // pipeline packages the standalone output — the real node_modules never
  // reached the live server ("Cannot find module 'next'" on every deploy)
  // even though the build itself always succeeded. Pointing this at the
  // actual workspace root removes the ambiguity.
  outputFileTracingRoot: path.join(dirname, '../../'),
  // The standalone build only bundles files actually imported by traced
  // code — the drizzle-kit migrator reads these SQL files from disk at
  // runtime (migrationsFolder: './drizzle'), so they'd otherwise be
  // silently missing from the deployed output. Needed by
  // /api/internal/migrate, which runs migrations from inside the already
  // -running server on hosts where there's no separate shell access to
  // the build environment (see that route's comment for why it exists).
  outputFileTracingIncludes: {
    '/api/internal/migrate/route': ['./drizzle/**/*'],
  },
  async headers() {
    return [
      {
        // Everything in this app is authenticated or admin-only in V1 (the
        // indexable marketing pages live on the separate Astro site) — see
        // docs/lms-architecture.md §6.
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
