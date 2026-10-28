import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';
import * as schema from './schema';

// A single pooled connection shared across the process — same reasoning
// as apps/learn/src/db/index.ts (Next's standalone server is one
// long-lived Node process here, not a serverless function per request).
// This points at a database entirely separate from the LMS's.
// connectionLimit balances two real, conflicting constraints on this
// host: it's a memory-constrained shared container (see next.config.mjs's
// CPU-overcount workaround) running three separate mysql2 pools in the
// same memory budget, which is why this was dropped from the original 10
// — but 3 proved too low in practice: at least 15 admin pages run 3+
// concurrent queries via Promise.all on a single render (e.g.
// dashboard/configurations/page.tsx), so a single page view could already
// exhaust a 3-connection pool on its own, and mysql2's default behavior
// when a pool is exhausted is to queue the request rather than fail it
// immediately — which, combined with this host's own ~120-second request
// timeout (confirmed via Hostinger support), meant a request could sit
// queued long enough to be killed by the host as a generic failure,
// surfacing as exactly the "page errors, reload fixes it" pattern this
// was meant to fix. 8 keeps real headroom below the original 10 while
// comfortably covering this app's actual real concurrent-query shape.
const pool = mysql.createPool({ uri: env.DATABASE_URL, connectionLimit: 8, timezone: 'Z' });

// mysql2 pools emit a background 'error' event for problems outside any
// single query — a dropped idle connection, the DB server closing it, a
// brief network blip to the host. Node's default behavior for an
// EventEmitter with no 'error' listener is to throw, and since this fires
// outside any request's call stack, nothing can catch it: it becomes an
// uncaught exception that kills the entire process, taking down every
// in-flight request, not just the one that hit the bad connection. The
// pool already recovers from this internally (discards the dead
// connection, opens a fresh one on the next query) — logging here instead
// of leaving this unhandled stops that recovery from being pre-empted by
// a full process crash. mysql2/promise's own Pool type doesn't type
// 'error' on `on()` (only connection/acquire/release/enqueue), but it
// exposes the underlying callback-style pool via `.pool`, which is a real
// EventEmitter and is what actually emits this event at runtime.
pool.pool.on('error', (err) => {
  console.error('[db] MySQL pool error (recovered, not crashing):', err);
});

export const db = drizzle(pool, { schema, mode: 'default' });
export { schema };
