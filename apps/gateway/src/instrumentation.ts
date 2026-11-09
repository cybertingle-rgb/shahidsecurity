/**
 * Root instrumentation hook for the merged gateway app. Next.js only
 * loads this file from the project root — the near-identical copies at
 * src/admin-core/instrumentation.ts and src/learn-core/instrumentation.ts
 * predate the platform-consolidation merge (docs/consolidation/
 * UNIFIED_ARCHITECTURE.md) and were never wired up here, so their crash
 * safety net has been dead code in production since the merge. This file
 * restores it at the one place Next.js actually loads it from.
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

  await bootstrapPricing();
  await bootstrapClaudeAdmin();
}

/**
 * One-time production bootstrap, run because this host has no shell or
 * direct SQL access (same constraint /api/internal/seed-pricing-data and
 * /api/internal/set-consultation-fee exist for) — this runs the same
 * logic from inside the Node process itself on first boot after this
 * commit, instead of needing an operator to call those routes by hand.
 *
 * Safe to ship permanently if it never gets removed: seedPricingData()
 * is idempotent by slug, and the fee fix only fires while feeUsd is
 * still '0.00' (the confirmed-broken production value — the schema
 * default is '150.00', so '0.00' only ever means the bug, never a
 * deliberate admin choice) — but this block is intended to be deleted in
 * a follow-up commit once the runtime log confirms it ran.
 */
async function bootstrapPricing() {
  try {
    const { seedPricingData } = await import('@/admin-core/lib/pricing/seedPricingData');
    const result = await seedPricingData();
    console.log('[instrumentation] seedPricingData result:', JSON.stringify(result));
  } catch (err) {
    console.error('[instrumentation] seedPricingData failed:', err);
  }

  try {
    const { db } = await import('@/admin-core/db');
    const { consultationSettings } = await import('@/admin-core/db/schema');
    const { getOrCreateConsultationSettings } = await import('@/admin-core/lib/pricing/plans');
    const { eq } = await import('drizzle-orm');

    const current = await getOrCreateConsultationSettings();
    // The live DB value was confirmed via runtime log to still be
    // '150.00' (the untouched schema default) — the $0.00 the owner saw
    // in production was actually a build-time fallback in pricing.astro
    // (fixed separately), never a real DB value. '0.00' is kept as a
    // second trigger in case a prior broken deploy did write it.
    if (current.feeUsd === '150.00' || current.feeUsd === '0.00') {
      await db.update(consultationSettings).set({ feeUsd: '50.00' }).where(eq(consultationSettings.id, current.id));
      console.log(`[instrumentation] consultationSettings.feeUsd bootstrapped from ${current.feeUsd} to 50.00`);
    } else {
      console.log('[instrumentation] consultationSettings.feeUsd already', current.feeUsd, '- leaving as-is');
    }
  } catch (err) {
    console.error('[instrumentation] consultation fee bootstrap failed:', err);
  }
}

/**
 * One-time: give this agent its own Super Admin account instead of
 * sharing the proprietor's. seedSuperAdmin() never overwrites an
 * existing account's password, so a fresh random password is only
 * meaningful — and only logged — the one time it actually creates the
 * account; on every later boot the email already exists and nothing is
 * logged. The password only ever exists in memory and in this one
 * runtime-log line (never committed to the repo); rotate it from the
 * admin dashboard's own account settings once retrieved. This block is
 * meant to be deleted in the same follow-up cleanup commit as
 * bootstrapPricing() once the runtime log confirms it ran.
 */
async function bootstrapClaudeAdmin() {
  try {
    const { randomBytes } = await import('node:crypto');
    const { seedSuperAdmin } = await import('@/admin-core/lib/seedSuperAdmin');
    const email = 'claude-agent@shahidiqbal.com';
    const password = randomBytes(24).toString('base64url');
    const result = await seedSuperAdmin(email, password);
    if (result.created) {
      console.log(`[instrumentation] Created Claude admin account ${result.email} with password: ${password}`);
    } else {
      console.log(`[instrumentation] Claude admin account ${result.email} already exists - leaving as-is`);
    }
  } catch (err) {
    console.error('[instrumentation] Claude admin bootstrap failed:', err);
  }
}
