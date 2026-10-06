import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output copies only the files the app needs into .next/standalone,
  // which is what makes this deployable to a shared-hosting Node runtime
  // (Hostinger's "Setup Node.js App") without shipping the whole workspace —
  // same pattern as apps/learn (see that app's next.config.mjs).
  output: 'standalone',
  poweredByHeader: false,
  // Served at shahidiqbal.com/admin, not its own subdomain — every
  // internal link, asset path, and router.push() call is automatically
  // rewritten under this prefix. This only handles the Next.js side;
  // Hostinger's Node.js App for this deployment must itself be
  // configured with an Application URL of shahidiqbal.com/admin (a path
  // on the existing domain, not a new subdomain) so requests under
  // /admin/* actually reach this process — see docs/DEPLOYMENT.md.
  basePath: '/admin',
  // This app lives two levels below the pnpm workspace root
  // (repo-root/apps/admin) — same reasoning as apps/learn's identical
  // setting (see that file's comment): without this, the standalone
  // output's traced node_modules don't line up with the real workspace
  // root on Hostinger's deploy pipeline.
  outputFileTracingRoot: path.join(dirname, '../../'),
  outputFileTracingIncludes: {
    '/api/internal/migrate/route': ['./drizzle/**/*'],
  },
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
