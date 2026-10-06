'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { aiKnowledgeSources, aiQuestions } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';

/**
 * A knowledge source's bodyMarkdown must be a real, verifiable fact
 * about the business — this draft/approve workflow exists specifically
 * so nothing reaches 'approved' without a second set of eyes, but it
 * doesn't itself check truthfulness; that's on whoever approves it.
 */
export async function createKnowledgeSource(formData: FormData) {
  const admin = await requireAdminAction('ai.manage');
  const title = String(formData.get('title') ?? '').trim();
  const bodyMarkdown = String(formData.get('bodyMarkdown') ?? '').trim();
  if (!title || !bodyMarkdown) throw new Error('Title and body are required.');

  const id = crypto.randomUUID();
  await db.insert(aiKnowledgeSources).values({ id, title, bodyMarkdown, status: 'draft', createdByUserId: admin.id });

  await logAudit({ actorUserId: admin.id, action: 'ai_knowledge_source.created', targetType: 'ai_knowledge_source', targetId: id, metadata: { title } });
  revalidatePath('/dashboard/ai');
}

export async function approveKnowledgeSource(id: string) {
  const admin = await requireAdminAction('ai.manage');
  await db.update(aiKnowledgeSources).set({ status: 'approved', approvedByUserId: admin.id, approvedAt: new Date() }).where(eq(aiKnowledgeSources.id, id));
  await logAudit({ actorUserId: admin.id, action: 'ai_knowledge_source.approved', targetType: 'ai_knowledge_source', targetId: id });
  revalidatePath('/dashboard/ai');
}

export async function rejectKnowledgeSource(id: string) {
  const admin = await requireAdminAction('ai.manage');
  await db.update(aiKnowledgeSources).set({ status: 'rejected', approvedByUserId: admin.id, approvedAt: new Date() }).where(eq(aiKnowledgeSources.id, id));
  await logAudit({ actorUserId: admin.id, action: 'ai_knowledge_source.rejected', targetType: 'ai_knowledge_source', targetId: id });
  revalidatePath('/dashboard/ai');
}

export async function markQuestionReviewed(id: string) {
  const admin = await requireAdminAction('ai.manage');
  await db.update(aiQuestions).set({ reviewedByUserId: admin.id }).where(eq(aiQuestions.id, id));
  await logAudit({ actorUserId: admin.id, action: 'ai_question.marked_reviewed', targetType: 'ai_question', targetId: id });
  revalidatePath('/dashboard/ai/questions');
}
