import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiKnowledgeSources, aiQuestions } from '@/db/schema';

export async function listKnowledgeSources() {
  return db.select().from(aiKnowledgeSources).orderBy(desc(aiKnowledgeSources.createdAt));
}

export async function getKnowledgeSourceById(id: string) {
  const rows = await db.select().from(aiKnowledgeSources).where(eq(aiKnowledgeSources.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listUnansweredQuestions() {
  return db.select().from(aiQuestions).orderBy(desc(aiQuestions.createdAt));
}
