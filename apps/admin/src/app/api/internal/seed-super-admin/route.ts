import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { seedSuperAdmin } from '@/lib/seedSuperAdmin';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

/**
 * Same reasoning as /api/internal/migrate: this host has no interactive
 * shell access to the deployed build, so the one-time super-admin
 * bootstrap runs over HTTP instead of the CLI script
 * (src/db/seed-super-admin.ts, still available for a host that does
 * have shell access). Secret-gated by SEED_SECRET — a separate value
 * from MIGRATE_SECRET and every other app's secrets. Remove this route
 * (or at minimum rotate SEED_SECRET) once the first Super Admin account
 * is created; it stays idempotent (re-running it is harmless — it never
 * overwrites an existing account's password) but there's no reason to
 * leave a working bootstrap endpoint reachable indefinitely.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  const provided = request.headers.get('x-seed-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'email and password (12+ characters) are required.' }, { status: 400 });
  }

  try {
    const result = await seedSuperAdmin(parsed.data.email, parsed.data.password);
    return NextResponse.json({
      success: true,
      created: result.created,
      email: result.email,
      message: result.created
        ? `Created super admin account for ${result.email}.`
        : `${result.email} already exists — left as is (this endpoint never overwrites an existing account's password; use "Forgot password?" on the login page instead).`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
