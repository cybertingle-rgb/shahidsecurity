import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { seedAdmin } from '@/lib/seedAdmin';

/**
 * One-time bootstrap for the first LMS admin account, reached over HTTP
 * for a host with no shell access to the deployed build — same pattern
 * as /api/internal/migrate, and as apps/admin's identical route. Never
 * overwrites an existing account's password; safe to call more than
 * once. Rotate/remove SEED_SECRET once the first admin account exists.
 */
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  fullName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  const provided = request.headers.get('x-seed-secret');

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  try {
    const result = await seedAdmin(parsed.data.email, parsed.data.password, parsed.data.fullName);
    return NextResponse.json({ ...result, message: result.created ? `Created admin account for ${result.email}.` : `${result.email} already exists.` });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
