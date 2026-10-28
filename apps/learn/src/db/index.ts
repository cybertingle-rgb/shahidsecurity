import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';
import * as schema from './schema';

// A single pooled connection shared across the process — Next.js's
// standalone server runs as one long-lived Node process (unlike serverless
// functions), so a module-level pool is the correct pattern here, not a
// per-request connection. timezone: 'Z' keeps every datetime read/write in
// UTC regardless of the MySQL server's session timezone default.
// connectionLimit kept low: this host is a memory-constrained shared
// container (it already needed a build-time CPU-overcount workaround —
// see next.config.mjs). Each pooled connection holds its own socket +
// read/write buffers; 10 was reserving far more headroom than this app's
// actual concurrency ever needs, and idle connections aren't released early.
const pool = mysql.createPool({ uri: env.DATABASE_URL, connectionLimit: 3, timezone: 'Z' });

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
