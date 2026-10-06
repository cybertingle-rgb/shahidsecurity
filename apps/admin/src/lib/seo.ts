import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { seoPages, seoRedirects, type SeoPage } from '@/db/schema';

export async function listSeoPages(): Promise<SeoPage[]> {
  return db.select().from(seoPages).orderBy(seoPages.path);
}

export async function getSeoPageById(id: string) {
  const rows = await db.select().from(seoPages).where(eq(seoPages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listSeoRedirects() {
  return db.select().from(seoRedirects).orderBy(desc(seoRedirects.createdAt));
}
