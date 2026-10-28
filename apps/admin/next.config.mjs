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
    // Defaults to os.cpus().length - 1 — this host reports ~60+ CPUs
    // (a shared-hosting container, not a dedicated 60-core box), so the
    // "Collecting page data" phase was spawning 60+ build workers, each
    // initializing its own native Rust thread pool, and blowing through
    // the container's real (much lower) OS thread/process ulimit:
    // "OS can't spawn worker thread: Resource temporarily unavailable".
    // Capped to a small, safe worker count regardless of detected CPUs.
    cpus: 2,
    // This app has 59 page routes. Next.js's default behavior preloads
    // every page's JS module into memory at server start (larger baseline
    // footprint, faster first response). On this host's limited container
    // memory, that startup spike is the leading suspect for the repeated
    // silent process restarts seen in production ("Ready in 0ms" looping
    // in the deploy log with no error — the signature of a supervisor
    // restarting an OOM-killed process, not a normal clean boot). Deferring
    // each page's module load to its first real request trades a small
    // amount of per-route first-load latency for a much smaller, spread-out
    // memory footprint instead of one large spike at boot.
    preloadEntriesOnStart: false,
    // Both uploadCourseThumbnail (courses/actions.ts) and uploadMedia
    // (dashboard/media/actions.ts) send the raw file straight through a
    // Server Action as FormData — Next's own default cap on a Server
    // Action's request body is 1MB, independent of and far below the
    // 10MB limit this app's own code actually enforces
    // (MAX_FILE_SIZE_BYTES, src/lib/media.ts) and advertises in both
    // upload UIs ("up to 10MB"). Any real photo (routinely 2-8MB) blew
    // past Next's 1MB ceiling before saveUploadedFile ever ran, which
    // surfaced client-side as an opaque, minified React error instead of
    // the app's own clear "File exceeds the 10MB limit" message —
    // confirmed directly from production's own server log: "Error: Body
    // exceeded 1 MB limit." Raised to just above the app's real limit so
    // a legitimate close-to-10MB upload isn't rejected by multipart
    // framing overhead alone; the app's own 10MB check is still what
    // actually enforces the real limit either way.
    serverActions: { bodySizeLimit: '11mb' },
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
