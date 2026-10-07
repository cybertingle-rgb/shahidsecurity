import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { leads, consultations, type Lead } from '@/db/schema';

export async function listLeads(): Promise<Lead[]> {
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listConsultations() {
  return db.select().from(consultations).orderBy(desc(consultations.requestedAt));
}

export async function getConsultationById(id: string) {
  const rows = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Only future-dated, not-yet-resolved bookings — for the dashboard's upcoming-bookings widget. Ascending so the soonest shows first. */
export async function listUpcomingConsultations(limit: number) {
  return db
    .select()
    .from(consultations)
    .where(and(gte(consultations.requestedAt, new Date()), inArray(consultations.status, ['requested', 'confirmed'])))
    .orderBy(asc(consultations.requestedAt))
    .limit(limit);
}

export async function countNewLeadsSince(since: Date): Promise<number> {
  const rows = await db.select({ id: leads.id }).from(leads).where(gte(leads.createdAt, since));
  return rows.length;
}
