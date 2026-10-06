import { desc, eq } from 'drizzle-orm';
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
