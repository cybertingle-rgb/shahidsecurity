import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { testimonials, reviewRequests, customers, type Testimonial } from '@/db/schema';

export async function listTestimonials(): Promise<Testimonial[]> {
  return db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
}

export async function getTestimonialById(id: string): Promise<Testimonial | null> {
  const rows = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listReviewRequests() {
  return db
    .select({
      id: reviewRequests.id,
      customerId: reviewRequests.customerId,
      customerName: customers.fullName,
      sentAt: reviewRequests.sentAt,
      status: reviewRequests.status,
    })
    .from(reviewRequests)
    .innerJoin(customers, eq(reviewRequests.customerId, customers.id))
    .orderBy(desc(reviewRequests.sentAt));
}
