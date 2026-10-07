import { eq } from 'drizzle-orm';
import { learnDb, learnSchema } from '@/db/learnDb';

/** Signs a Learn student out of learn.shahidiqbal.com everywhere — used when an admin suspends their account from here. */
export async function destroyAllLearnSessionsForUser(userId: string) {
  await learnDb.delete(learnSchema.sessions).where(eq(learnSchema.sessions.userId, userId));
}
