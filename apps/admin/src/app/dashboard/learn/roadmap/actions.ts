'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { roadmapStages } = learnSchema;
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';

export async function createRoadmapStage(formData: FormData) {
  const admin = await requireAdminAction('settings.manage');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required.');

  const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(roadmapStages);

  const id = crypto.randomUUID();
  await db.insert(roadmapStages).values({
    id,
    levelNumber: Number(formData.get('levelNumber') ?? Number(count) + 1),
    title,
    description: String(formData.get('description') ?? '') || null,
    prerequisitesText: String(formData.get('prerequisitesText') ?? '') || null,
    isRequired: formData.get('isRequired') === 'on',
    sortOrder: Number(count),
  });

  await logLearnAudit({ actorUserId: null, action: 'roadmap_stage.created', targetType: 'roadmap_stage', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/roadmap');
}

export async function updateRoadmapStage(id: string, formData: FormData) {
  const admin = await requireAdminAction('settings.manage');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required.');

  await db
    .update(roadmapStages)
    .set({
      levelNumber: Number(formData.get('levelNumber') ?? 0),
      title,
      description: String(formData.get('description') ?? '') || null,
      prerequisitesText: String(formData.get('prerequisitesText') ?? '') || null,
      isRequired: formData.get('isRequired') === 'on',
    })
    .where(eq(roadmapStages.id, id));

  await logLearnAudit({ actorUserId: null, action: 'roadmap_stage.updated', targetType: 'roadmap_stage', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/roadmap');
}

export async function deleteRoadmapStage(id: string) {
  const admin = await requireAdminAction('settings.manage');
  await db.delete(roadmapStages).where(eq(roadmapStages.id, id));
  await logLearnAudit({ actorUserId: null, action: 'roadmap_stage.deleted', targetType: 'roadmap_stage', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/roadmap');
}
