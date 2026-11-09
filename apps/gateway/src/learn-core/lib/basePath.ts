// Mirrors next.config.mjs's `basePath` — kept as a plain constant (not
// read from next.config.mjs, which isn't meant to be imported into app
// code) because Next.js only auto-prefixes basePath for <Link>,
// useRouter(), and redirect(); a raw fetch() call with a literal leading
// slash does NOT get it, and silently hits the gateway's Astro catch-all
// instead of this app once requests arrive via the Multi-Zones gateway
// (docs/consolidation/UNIFIED_ARCHITECTURE.md) — confirmed as a real
// production bug (apps/admin's login fetch('/api/auth/login') 404ing
// through the gateway), not a theoretical one. Use this for every
// client-side fetch() call that targets this app's own API routes.
export const BASE_PATH = '/learn';
