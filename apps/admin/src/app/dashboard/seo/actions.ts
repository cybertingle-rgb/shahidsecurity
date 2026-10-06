'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { seoPages, seoRedirects } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getSeoPageById } from '@/lib/seo';

function normalizePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Path is required.');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export async function createSeoPageOverride(formData: FormData) {
  const admin = await requireAdminAction('seo.manage');
  const path = normalizePath(String(formData.get('path') ?? ''));

  const [existing] = await db.select({ id: seoPages.id }).from(seoPages).where(eq(seoPages.path, path));
  if (existing) throw new Error(`An override for ${path} already exists.`);

  const id = crypto.randomUUID();
  await db.insert(seoPages).values({
    id,
    path,
    title: String(formData.get('title') ?? '').trim() || null,
    description: String(formData.get('description') ?? '').trim() || null,
    canonicalUrl: String(formData.get('canonicalUrl') ?? '').trim() || null,
    robotsDirective: String(formData.get('robotsDirective') ?? '').trim() || null,
    updatedByUserId: admin.id,
  });

  await logAudit({ actorUserId: admin.id, action: 'seo_page.created', targetType: 'seo_page', targetId: id, metadata: { path } });
  redirect(`/dashboard/seo/pages/${id}`);
}

export async function updateSeoPageOverride(id: string, formData: FormData) {
  const admin = await requireAdminAction('seo.manage');
  const current = await getSeoPageById(id);
  if (!current) throw new Error('Override not found.');

  await db
    .update(seoPages)
    .set({
      title: String(formData.get('title') ?? '').trim() || null,
      description: String(formData.get('description') ?? '').trim() || null,
      canonicalUrl: String(formData.get('canonicalUrl') ?? '').trim() || null,
      robotsDirective: String(formData.get('robotsDirective') ?? '').trim() || null,
      updatedByUserId: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(seoPages.id, id));

  await logAudit({ actorUserId: admin.id, action: 'seo_page.updated', targetType: 'seo_page', targetId: id });
  revalidatePath(`/dashboard/seo/pages/${id}`);
}

export async function deleteSeoPageOverride(id: string) {
  const admin = await requireAdminAction('seo.manage');
  await db.delete(seoPages).where(eq(seoPages.id, id));
  await logAudit({ actorUserId: admin.id, action: 'seo_page.deleted', targetType: 'seo_page', targetId: id });
  revalidatePath('/dashboard/seo/pages');
}

export async function createSeoRedirect(formData: FormData) {
  const admin = await requireAdminAction('seo.manage');
  const fromPath = normalizePath(String(formData.get('fromPath') ?? ''));
  const toUrl = String(formData.get('toUrl') ?? '').trim();
  if (!toUrl) throw new Error('Destination URL is required.');
  const statusCode = String(formData.get('statusCode') ?? '301') as '301' | '302';

  const [existing] = await db.select({ id: seoRedirects.id }).from(seoRedirects).where(eq(seoRedirects.fromPath, fromPath));
  if (existing) throw new Error(`A redirect from ${fromPath} already exists.`);

  const id = crypto.randomUUID();
  await db.insert(seoRedirects).values({ id, fromPath, toUrl, statusCode, createdByUserId: admin.id });

  await logAudit({ actorUserId: admin.id, action: 'seo_redirect.created', targetType: 'seo_redirect', targetId: id, metadata: { fromPath, toUrl, statusCode } });
  revalidatePath('/dashboard/seo/redirects');
}

export async function deleteSeoRedirect(id: string) {
  const admin = await requireAdminAction('seo.manage');
  await db.delete(seoRedirects).where(eq(seoRedirects.id, id));
  await logAudit({ actorUserId: admin.id, action: 'seo_redirect.deleted', targetType: 'seo_redirect', targetId: id });
  revalidatePath('/dashboard/seo/redirects');
}
