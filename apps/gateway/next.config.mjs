import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output, same as before — required on this host (no shell
  // access to install deps at runtime).
  output: 'standalone',
  outputFileTracingRoot: path.join(dirname, '../../'),
  // Platform consolidation, take two (docs/consolidation/UNIFIED_ARCHITECTURE.md):
  // apps/admin and apps/learn are no longer separately-deployed Next.js
  // apps that this app proxies to over HTTP — their entire route trees,
  // components, lib and db code now live directly in this app, as
  // src/app/admin/* and src/app/learn/* (moved from their own src/app),
  // with their non-route code under src/admin-core/* and src/learn-core/*
  // respectively. This is the only way to satisfy "no subdomains at all"
  // on this host: Hostinger's shared Node.js hosting runs exactly one
  // Passenger-managed process per domain, so three separately-deployed
  // apps always meant three subdomains, however the gateway stitched
  // their *responses* together. One merged app is the only way to get
  // every route onto shahidiqbal.com with nothing else registered in
  // Hostinger's panel.
  //
  // Each former app's own `basePath` config is gone with it — a single
  // Next.js instance can only have one basePath for the whole app, and
  // these two zones need different ones (/admin vs /learn). Every
  // <Link>/useRouter()/redirect() call in their moved code that relied on
  // basePath auto-prefixing now goes through small compatibility shims
  // instead (src/admin-core/_compat/*, src/learn-core/_compat/*) that
  // reproduce exactly that behavior; fetch()/Image src/metadata icon
  // calls were already manually prefixed with each section's own
  // BASE_PATH constant (a plain string, unrelated to this basePath
  // config) during the earlier Multi-Zones migration and still are.
  //
  // The drizzle-kit migrator reads these SQL files and meta/_journal.json
  // from disk at runtime (migrationsFolder: './drizzle' in each section's
  // own drizzle.config.ts) — /admin/api/internal/migrate and
  // /learn/api/internal/migrate each need their own section's migrations
  // folder explicitly included, since the standalone build only bundles
  // files actually imported by traced code.
  outputFileTracingIncludes: {
    '/admin/api/internal/migrate/route': ['./src/admin-core/drizzle/**/*'],
    '/learn/api/internal/migrate/route': ['./src/learn-core/drizzle/**/*'],
  },
  poweredByHeader: false,
  // Astro's own astro.config.mjs sets trailingSlash: 'always' (every page's
  // canonical URL/sitemap entry already ends in '/'), but the merged
  // /admin/* and /learn/* route trees both use Next's default (no trailing
  // slash). A single global `trailingSlash` value can't satisfy both at
  // once, so Next's automatic redirect is turned off entirely here and
  // handled per-prefix instead, in src/proxy.ts: trailing slash added for
  // Astro-site paths, left alone for /admin/* and /learn/*.
  skipTrailingSlashRedirect: true,
  experimental: {
    // Avoids a process-spawn panic seen under load on this host (both
    // former apps independently found and worked around the same issue).
    turbopackPluginRuntimeStrategy: 'workerThreads',
    // Defaults to os.cpus().length - 1 — this host reports ~60+ CPUs (a
    // shared-hosting container, not a dedicated 60-core box), which blew
    // through the container's real OS thread/process ulimit during
    // "Collecting page data". Capped to a small, safe worker count
    // regardless of detected CPUs.
    cpus: 2,
    // This merged app has 150+ page routes across three former apps.
    // Next's default behavior preloads every page's JS module into memory
    // at server start — on this host's limited container memory, that
    // startup spike was the leading suspect for repeated silent process
    // restarts in production (both former apps independently disabled
    // this for the same reason). Deferring each page's module load to its
    // first real request trades a small amount of per-route first-load
    // latency for a much smaller, spread-out memory footprint.
    preloadEntriesOnStart: false,
    // Both uploadCourseThumbnail/uploadMedia (apps/admin, moved) send raw
    // files straight through a Server Action as FormData — Next's default
    // cap on a Server Action's request body is 1MB, well below the apps'
    // own enforced 10MB limit. Raised to just above that real limit so a
    // legitimate close-to-10MB upload isn't rejected by multipart framing
    // overhead alone.
    serverActions: { bodySizeLimit: '11mb' },
  },
  async headers() {
    return [
      // apps/admin was a private administration panel in its entirety —
      // every one of its routes gets noindex, not just a subset. Source
      // is now literally '/admin/:path*' (no basePath auto-prefixing
      // anymore — see the top-of-file comment).
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      // apps/learn's public homepage, course catalog and course detail
      // pages are meant to be indexed — only its authenticated dashboard,
      // its own (gateway-blocked, but defense in depth) duplicate admin
      // panel, and its API routes are not.
      {
        source: '/learn/dashboard/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/learn/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/learn/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
