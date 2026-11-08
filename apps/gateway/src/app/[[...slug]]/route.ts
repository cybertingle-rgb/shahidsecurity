import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Serves the Astro site's static build (shahidiqbal.com's actual content —
// homepage, blog, services, etc.) directly out of astro-dist/, copied in
// at build time by scripts/copy-astro-dist.mjs. /admin/* and /learn/* never
// reach this handler — next.config.mjs's rewrites() intercept those first
// and forward them to the real admin/learn apps (docs/consolidation/
// UNIFIED_ARCHITECTURE.md §2.1). This is the ONLY route in this app; its
// one job is "resolve a URL path to a file astro-dist/ and serve it",
// nothing else — no business logic, no auth, no database.
//
// Anchored on process.cwd(), not this file's own location: Next bundles
// route handlers into .next/server/..., which does not sit at a fixed
// relative distance from astro-dist/ the way the source tree does. Both
// `next dev`/`next start` (cwd = this app's own directory) and the
// standalone server (cwd = .next/standalone, where
// scripts/flatten-standalone.mjs copies astro-dist/ alongside server.js —
// the same convention admin/learn already use for `public/`) put
// astro-dist/ directly under cwd, matching apps/admin and apps/learn's own
// convention for runtime-relative paths (e.g. drizzle's migrationsFolder:
// './drizzle').
const ASTRO_DIST_ROOT = path.resolve(process.cwd(), 'astro-dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json',
  '.pdf': 'application/pdf',
};

/**
 * Resolves the request's path segments to an absolute file path inside
 * ASTRO_DIST_ROOT, or null if nothing matches. Every candidate is
 * re-verified to still be inside ASTRO_DIST_ROOT after path.resolve() —
 * the segments come straight from the URL, so this is the one thing here
 * that must never be gotten wrong (a `..` segment resolving outside the
 * dist directory would turn this into an arbitrary-file-read bug).
 */
async function resolveFile(slug: string[]): Promise<string | null> {
  const requestedPath = path.join(ASTRO_DIST_ROOT, ...slug);
  const resolved = path.resolve(requestedPath);
  if (resolved !== ASTRO_DIST_ROOT && !resolved.startsWith(ASTRO_DIST_ROOT + path.sep)) {
    return null;
  }

  const hasExtension = path.extname(resolved) !== '';
  const candidates = hasExtension ? [resolved] : [path.join(resolved, 'index.html'), `${resolved}.html`];

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // Not found — try the next candidate.
    }
  }
  return null;
}

// turbopackIgnore on every dynamic readFile below: the path is only known
// at request time (it comes from the URL), which makes Turbopack's static
// analysis default to tracing — and bundling — this app's ENTIRE source
// tree into the standalone output "just in case" it's needed. It never is:
// astro-dist/ is guaranteed present by scripts/flatten-standalone.mjs's own
// explicit copy step (the same convention admin/learn already use for
// public/), not by anything the tracer would find by following imports.
async function notFound(): Promise<Response> {
  try {
    const custom404 = path.join(ASTRO_DIST_ROOT, '404.html');
    const body = await readFile(/* turbopackIgnore: true */ custom404);
    return new Response(body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }): Promise<Response> {
  const { slug = [] } = await params;
  const filePath = await resolveFile(slug);
  if (!filePath) return notFound();

  const body = await readFile(/* turbopackIgnore: true */ filePath);
  const contentType = MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      // Astro's own build output is content-hashed under /_astro/ already;
      // HTML pages are not, so they're left at the browser/CDN default
      // instead of being cached aggressively here.
      ...(filePath.includes(`${path.sep}_astro${path.sep}`) ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {}),
    },
  });
}
