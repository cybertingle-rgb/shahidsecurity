import 'dotenv/config';
import { seedSuperAdmin } from '../lib/seedSuperAdmin';

/**
 * CLI entry point for a host with shell access. See
 * src/lib/seedSuperAdmin.ts for what this actually does; this file is
 * just env-var plumbing + process exit codes.
 *
 * Run as:
 *   ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD='a real strong password' pnpm db:seed-super-admin
 */
async function main() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required — set them to real credentials you choose, not a placeholder.');
  }

  const result = await seedSuperAdmin(email, password);
  console.log(result.created ? `Created admin user ${result.email}.` : `Admin user ${result.email} already exists — left as is.`);
  console.log('Done. Roles, permissions, and the super admin account are ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
