import { eq } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { settings } = learnSchema;

export async function getLearnSetting<T = unknown>(key: string): Promise<T | null> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key));
  return (row?.value as T) ?? null;
}

export async function setLearnSetting(key: string, value: unknown): Promise<void> {
  const [existing] = await db.select({ id: settings.id }).from(settings).where(eq(settings.key, key));
  if (existing) {
    await db.update(settings).set({ value }).where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({ id: crypto.randomUUID(), key, value });
  }
}
