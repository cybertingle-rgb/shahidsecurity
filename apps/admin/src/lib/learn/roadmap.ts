import { asc, eq } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { roadmapStages } = learnSchema;

export async function listRoadmapStages() {
  return db.select().from(roadmapStages).orderBy(asc(roadmapStages.sortOrder));
}

export async function getRoadmapStage(id: string) {
  const [row] = await db.select().from(roadmapStages).where(eq(roadmapStages.id, id));
  return row ?? null;
}
