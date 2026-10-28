import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as learnSchema from './schema/learn';

/**
 * A second, separate connection to apps/learn's own database — this
 * app's unified dashboard reads/writes Learn's data directly (students,
 * courses, enrollments, products, orders, payments, communities,
 * announcements, roadmap, settings) under the /dashboard/learn section,
 * per the decision to manage both from one admin panel. Deliberately a
 * distinct pool/client from the main `db` export (./index.ts), which
 * stays scoped to this app's own business-CMS database — these are two
 * real, separate MySQL databases, not one shared schema.
 *
 * LEARN_DATABASE_URL should point at the SAME narrow runtime user
 * apps/learn's own DATABASE_URL uses — this connection only needs the
 * same read/write access that app's own server process already has,
 * never DDL (migrations for Learn's schema still only ever run from
 * within apps/learn itself).
 */
const connectionString = process.env.LEARN_DATABASE_URL;
if (!connectionString) {
  throw new Error('LEARN_DATABASE_URL is required — see apps/admin/.env.example.');
}

// connectionLimit kept low: see ./index.ts — this host is memory-
// constrained and runs three separate mysql2 pools in the same budget.
const pool = mysql.createPool({ uri: connectionString, connectionLimit: 3, timezone: 'Z' });

// See ./index.ts for why this is required: an unhandled 'error' event on
// a mysql2 pool crashes the whole Node process, not just one request.
// `.pool` is the underlying callback-style pool — see ./index.ts for why
// the listener has to go there, not on the promise wrapper directly.
pool.pool.on('error', (err) => {
  console.error('[learnDb] MySQL pool error (recovered, not crashing):', err);
});

export const learnDb = drizzle(pool, { schema: learnSchema, mode: 'default' });
export { learnSchema };
