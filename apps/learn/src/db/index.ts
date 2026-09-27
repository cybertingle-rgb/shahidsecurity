import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from './schema';

// A single pooled connection shared across the process — Next.js's
// standalone server runs as one long-lived Node process (unlike serverless
// functions), so a module-level pool is the correct pattern here, not a
// per-request connection.
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });

export const db = drizzle(pool, { schema });
export { schema };
