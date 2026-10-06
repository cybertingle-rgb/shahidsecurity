import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { services, type Service } from '@/db/schema';

export async function listServices(): Promise<Service[]> {
  return db.select().from(services).orderBy(services.sortOrder, desc(services.createdAt));
}

export async function getServiceById(id: string): Promise<Service | null> {
  const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return rows[0] ?? null;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
