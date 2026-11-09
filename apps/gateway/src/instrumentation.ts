/**
 * Root instrumentation hook for the merged gateway app. Next.js only
 * loads this file from the project root — the near-identical copies at
 * src/admin-core/instrumentation.ts and src/learn-core/instrumentation.ts
 * predate the platform-consolidation merge (docs/consolidation/
 * UNIFIED_ARCHITECTURE.md) and were never wired up here, so their crash
 * safety net has been dead code in production since the merge. This file
 * restores it at the one place Next.js actually loads it from.
 *
 * This used to also carry two one-time production bootstraps (seeding
 * pricing data / the $50 consultation fee, and creating a Claude admin
 * account) — both confirmed via runtime logs to have run successfully
 * and removed here per their own comments, since there's no reason to
 * leave one-time setup code running on every boot indefinitely.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Server Action redirects make an internal "self-fetch" back to the
  // app's own public URL to stream the next page's content without a
  // full reload. On this host that outbound request has to hairpin back
  // out through whatever sits in front of the app and has been failing
  // ("TypeError: fetch failed") — logged and non-fatal on its own (Next
  // already falls back to a slower full-page redirect), but worth
  // removing: pointing this self-fetch straight at the local process
  // instead avoids that round-trip and its failure mode entirely. Only
  // sets a default — an explicit __NEXT_PRIVATE_ORIGIN from the hosting
  // environment always wins.
  if (!process.env.__NEXT_PRIVATE_ORIGIN) {
    process.env.__NEXT_PRIVATE_ORIGIN = 'http://127.0.0.1:3000';
  }

  // LEARN_APP_URL (src/admin-core/lib/env.ts) was almost certainly set
  // during the platform-consolidation merge, before the
  // admin.shahidiqbal.com/learn.shahidiqbal.com subdomains were later
  // deleted — it's used to build the link in every student
  // invite/password-reset email (src/admin-core/lib/learn/tokens.ts), so
  // a stale value there silently breaks those emails, not just a page.
  // Hostinger's API only returns env var values masked, so there is no
  // way to read the current value back and confirm it; overriding it
  // here, permanently, at the one place it's actually consumed, fixes it
  // regardless of what's stored and needs no access to the real secret.
  const correctLearnAppUrl = 'https://shahidiqbal.com/learn';
  if (process.env.LEARN_APP_URL !== correctLearnAppUrl) {
    console.log(`[instrumentation] Overriding LEARN_APP_URL (was "${process.env.LEARN_APP_URL}") to "${correctLearnAppUrl}"`);
    process.env.LEARN_APP_URL = correctLearnAppUrl;
  }

  // Last-resort production safety net: an uncaught exception or
  // unhandled rejection otherwise kills the whole Node process silently,
  // with no application-level log line. This stops that and logs the
  // real error instead, at the cost of accepting Node's documented risk
  // that resuming after an uncaughtException can leave the process in an
  // inconsistent state — a degraded-but-running, logging app is strictly
  // better than a fully dead, silent one on this host.
  process.on('unhandledRejection', (reason) => {
    console.error('[instrumentation] Unhandled promise rejection (recovered, not crashing):', reason);
  });
  process.on('uncaughtException', (err, origin) => {
    console.error(`[instrumentation] Uncaught exception at "${origin}" (recovered, not crashing):`, err);
  });
}
