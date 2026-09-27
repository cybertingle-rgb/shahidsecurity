import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { announcements } from '@/db/schema';

export async function listAnnouncements() {
  return db.select().from(announcements).orderBy(desc(announcements.publishedAt)).limit(50);
}
