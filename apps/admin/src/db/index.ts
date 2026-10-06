import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';
import * as schema from './schema';

// A single pooled connection shared across the process — same reasoning
// as apps/learn/src/db/index.ts (Next's standalone server is one
// long-lived Node process here, not a serverless function per request).
// This points at a database entirely separate from the LMS's.
const pool = mysql.createPool({ uri: env.DATABASE_URL, connectionLimit: 10, timezone: 'Z' });

export const db = drizzle(pool, { schema, mode: 'default' });
export { schema };
