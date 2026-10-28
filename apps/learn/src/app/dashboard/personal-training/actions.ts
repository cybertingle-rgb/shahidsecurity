'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { submitTrainingRequest } from '@/lib/personalTraining';

/**
 * Submitting a request never charges anything and never requires a
 * payment method — see submitTrainingRequest (lib/personalTraining.ts).
 * Session is re-checked here rather than trusted from a hidden form
 * field, same as every other mutation in this app.
 */
export async function submitPersonalTrainingRequest(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const experienceLevel = String(formData.get('experienceLevel') ?? 'beginner');
  const formatPreference = String(formData.get('formatPreference') ?? 'no_preference');

  const result = await submitTrainingRequest(user.id, {
    contactName: String(formData.get('contactName') ?? ''),
    contactEmail: String(formData.get('contactEmail') ?? ''),
    areaOfInterest: String(formData.get('areaOfInterest') ?? ''),
    experienceLevel: experienceLevel as 'beginner' | 'intermediate' | 'advanced' | 'expert',
    goals: String(formData.get('goals') ?? ''),
    specialRequest: String(formData.get('specialRequest') ?? ''),
    formatPreference: formatPreference as 'one_on_one' | 'group' | 'no_preference',
    preferredAvailability: String(formData.get('preferredAvailability') ?? ''),
  });

  if (!result.ok) throw new Error(result.error);

  revalidatePath('/dashboard/personal-training');
}
