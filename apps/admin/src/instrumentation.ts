// This app has been crashing and silently restarting in production —
// repeatedly, on effectively every route, with no fatal error ever
// visible in the runtime log (every logged error found so far, like the
// Server Action self-fetch failure in Next's own redirect handling, was
// already caught internally and never actually reached this point). That
// combination — "the process keeps dying" + "nothing fatal is ever
// logged" — is the signature of an uncaught exception or unhandled
// promise rejection happening somewhere outside any try/catch this
// codebase has review visibility into. Node's default behavior for
// either one is to terminate the whole process immediately, silently,
// with no application-level log line at all (the crash happens *before*
// any catch block gets a chance to log it) — which is exactly why every
// prior fix (closing one specific unguarded mysql2 pool, reducing the
// startup memory footprint) addressed a real, confirmed bug but didn't
// fully stop this: there was never any guarantee that was the ONLY such
// gap, only the only one this session could find and reproduce from
// static code review.
//
// This is a deliberate last-resort production safety net, not a fix for
// a known bug: it stops *any* unhandled rejection or uncaught exception,
// wherever it actually originates, from taking the entire server down,
// and — critically — it logs the real error for the first time, which is
// the one piece of evidence needed to find and fix the actual root cause
// surgically instead of by repeated guesswork.
//
// Node's own docs are explicit that resuming "normal" operation after an
// uncaughtException is inherently riskier than after an unhandled
// rejection — the process could theoretically be left in an inconsistent
// state. That tradeoff is accepted deliberately here: the alternative
// this session has directly observed is a fully, repeatedly unusable
// production app, for everyone, continuously. A degraded-but-running app
// that logs its real errors is strictly better than a fully dead one.
// This is a mitigation to stop the bleeding and surface the real cause —
// not a replacement for fixing whatever that cause turns out to be once
// it's visible in the logs.
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server Action redirects make an internal "self-fetch" back to the
    // app's own public URL (e.g. https://admin.shahidiqbal.com) to stream
    // the next page's content without a full reload. On this host that
    // outbound request has to hairpin back out through whatever sits in
    // front of the app (reverse proxy / CDN) and has been failing
    // ("TypeError: fetch failed") — logged and non-fatal on its own
    // (Next already falls back to a slower full-page redirect), but worth
    // removing: pointing this self-fetch straight at the local process
    // instead avoids that round-trip and its failure mode entirely. Only
    // sets a default — an explicit __NEXT_PRIVATE_ORIGIN from the hosting
    // environment always wins.
    if (!process.env.__NEXT_PRIVATE_ORIGIN) {
      process.env.__NEXT_PRIVATE_ORIGIN = 'http://127.0.0.1:3000';
    }

    process.on('unhandledRejection', (reason) => {
      console.error('[instrumentation] Unhandled promise rejection (recovered, not crashing):', reason);
    });
    process.on('uncaughtException', (err, origin) => {
      console.error(`[instrumentation] Uncaught exception at "${origin}" (recovered, not crashing):`, err);
    });
  }
}
