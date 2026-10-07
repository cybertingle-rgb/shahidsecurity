import { desc, eq } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { announcements } = learnSchema;

export async function listAnnouncements() {
  return db.select().from(announcements).orderBy(desc(announcements.publishedAt)).limit(50);
}

export async function getAnnouncement(id: string) {
  const [row] = await db.select().from(announcements).where(eq(announcements.id, id));
  return row ?? null;
}
