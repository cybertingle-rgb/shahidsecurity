import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { permissions, roles, rolePermissions, users, userRoles } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';

/**
 * One-time production bootstrap: creates the real permission/role rows
 * (same set as db/seed.ts, minus every fake account/course/product) and
 * exactly one super_admin user for the email given in the request body.
 * Reached over HTTP for the same reason as /api/internal/migrate — no
 * shell Node access on this host to run a script directly. Idempotent:
 * safe to call again, but only ever prints the generated password once,
 * on the run that actually creates the user.
 */
const PERMISSION_KEYS = [
  'users.manage',
  'roles.manage',
  'courses.create',
  'courses.update',
  'courses.delete',
  'courses.publish',
  'enrollments.manage',
  'products.manage',
  'prices.manage',
  'orders.manage',
  'payments.verify',
  'payments.refund',
  'communities.manage',
  'announcements.manage',
  'certificates.manage',
  'coupons.manage',
  'settings.manage',
  'audit_logs.view',
] as const;

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Buffer.from(bytes).toString('base64url');
}

export async function POST(request: NextRequest) {
  const secret = process.env.MIGRATE_SECRET;
  const provided = request.headers.get('x-migrate-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const fullName = typeof body.fullName === 'string' && body.fullName.trim() ? body.fullName.trim() : 'Super Admin';
  if (!email) {
    return NextResponse.json({ error: 'email is required in the JSON body' }, { status: 400 });
  }

  const permByKey = new Map<string, { id: string }>();
  for (const key of PERMISSION_KEYS) {
    const [existing] = await db.select().from(permissions).where(eq(permissions.key, key));
    if (existing) {
      permByKey.set(key, existing);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(permissions).values({ id, key });
    permByKey.set(key, { id });
  }

  async function upsertRole(name: string, description: string) {
    const [existing] = await db.select().from(roles).where(eq(roles.name, name));
    if (existing) return existing;
    const id = crypto.randomUUID();
    await db.insert(roles).values({ id, name, description });
    return { id, name, description };
  }

  const superAdminRole = await upsertRole('super_admin', 'Full access to everything.');
  await upsertRole('admin', 'Full operational access, except managing other roles.');
  await upsertRole('instructor', 'Scoped to their own assigned courses.');
  await upsertRole('student', 'Default role for every registered account.');

  for (const key of PERMISSION_KEYS) {
    const perm = permByKey.get(key);
    if (!perm) continue;
    const [existing] = await db
      .select()
      .from(rolePermissions)
      .where(and(eq(rolePermissions.roleId, superAdminRole.id), eq(rolePermissions.permissionId, perm.id)));
    if (!existing) await db.insert(rolePermissions).values({ roleId: superAdminRole.id, permissionId: perm.id });
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  if (existingUser) {
    const [existingRole] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, existingUser.id), eq(userRoles.roleId, superAdminRole.id)));
    if (!existingRole) await db.insert(userRoles).values({ userId: existingUser.id, roleId: superAdminRole.id });
    return NextResponse.json({
      success: true,
      created: false,
      message: `${email} already existed — ensured it has the super_admin role. Password unchanged.`,
    });
  }

  const password = randomPassword();
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, email, passwordHash, fullName, emailVerifiedAt: new Date() });
  await db.insert(userRoles).values({ userId, roleId: superAdminRole.id });

  return NextResponse.json({ success: true, created: true, email, password });
}
