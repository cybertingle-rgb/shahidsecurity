/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output copies only the files the app needs into .next/standalone,
  // which is what makes this deployable to a shared-hosting Node runtime
  // (Hostinger's "Setup Node.js App") without shipping the whole workspace.
  output: 'standalone',
  poweredByHeader: false,
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
