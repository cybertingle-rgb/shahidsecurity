import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';
import * as schema from './schema';

// A single pooled connection shared across the process — Next.js's
// standalone server runs as one long-lived Node process (unlike serverless
// functions), so a module-level pool is the correct pattern here, not a
// per-request connection. timezone: 'Z' keeps every datetime read/write in
// UTC regardless of the MySQL server's session timezone default.
const pool = mysql.createPool({ uri: env.DATABASE_URL, connectionLimit: 10, timezone: 'Z' });

export const db = drizzle(pool, { schema, mode: 'default' });
export { schema };
