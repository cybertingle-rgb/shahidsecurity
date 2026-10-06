'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { leads, consultations, customers } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getLeadById } from '@/lib/leads';

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

export async function updateLeadStatus(id: string, formData: FormData) {
  const admin = await requireAdminAction('leads.manage');
  const status = String(formData.get('status') ?? '') as LeadStatus;
  if (!LEAD_STATUSES.includes(status)) throw new Error('Invalid status.');

  await db.update(leads).set({ status, updatedAt: new Date() }).where(eq(leads.id, id));
  await logAudit({ actorUserId: admin.id, action: `lead.status_changed.${status}`, targetType: 'lead', targetId: id });
  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${id}`);
}

export async function assignLead(id: string, formData: FormData) {
  const admin = await requireAdminAction('leads.manage');
  const assignedToUserId = String(formData.get('assignedToUserId') ?? '').trim() || null;

  await db.update(leads).set({ assignedToUserId, updatedAt: new Date() }).where(eq(leads.id, id));
  await logAudit({ actorUserId: admin.id, action: 'lead.assigned', targetType: 'lead', targetId: id, metadata: { assignedToUserId } });
  revalidatePath(`/dashboard/leads/${id}`);
}

/**
 * Creates a real customer record from a lead's own submitted details —
 * never fabricates or infers data the lead didn't actually provide.
 */
export async function convertLeadToCustomer(id: string) {
  const admin = await requireAdminAction('leads.manage');
  const lead = await getLeadById(id);
  if (!lead) throw new Error('Lead not found.');

  const customerId = crypto.randomUUID();
  await db.insert(customers).values({
    id: customerId,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    convertedFromLeadId: lead.id,
  });
  await db.update(leads).set({ status: 'converted', updatedAt: new Date() }).where(eq(leads.id, id));

  await logAudit({ actorUserId: admin.id, action: 'lead.converted_to_customer', targetType: 'lead', targetId: id, metadata: { customerId } });
  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${id}`);
}

const CONSULTATION_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export async function updateConsultationStatus(id: string, formData: FormData) {
  const admin = await requireAdminAction('leads.manage');
  const status = String(formData.get('status') ?? '') as ConsultationStatus;
  if (!CONSULTATION_STATUSES.includes(status)) throw new Error('Invalid status.');

  await db.update(consultations).set({ status }).where(eq(consultations.id, id));
  await logAudit({ actorUserId: admin.id, action: `consultation.status_changed.${status}`, targetType: 'consultation', targetId: id });
  revalidatePath('/dashboard/leads/consultations');
}
