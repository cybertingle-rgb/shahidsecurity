import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { pricingPlans, addOnServices } from '@/db/schema';

/**
 * Initial content for the public /pricing page — the exact plans,
 * prices, and inclusions the business owner specified (docs/PRICING.md
 * §4-7). Idempotent by slug, same pattern as seedSuperAdmin.ts: safe to
 * run more than once, and never overwrites a row an admin has since
 * edited in the dashboard (only inserts rows that don't exist yet).
 * Run via `pnpm db:seed-pricing` (src/db/seed-pricing-data.ts) or the
 * secret-gated POST /api/internal/seed-pricing-data for a host with no
 * shell access — same two-path pattern as seed-super-admin.
 */
const PLANS: Array<typeof pricingPlans.$inferInsert> = [
  {
    id: crypto.randomUUID(),
    slug: 'security-essential',
    name: 'Security Essential',
    targetAudience: 'Startups and micro-businesses',
    category: 'assurance',
    monthlyPriceUsd: '499.00',
    isStartingAtPrice: false,
    minContractMonths: 3,
    includedFeatures: [
      'Up to 5 agreed internet-facing assets',
      'Monthly external vulnerability scan',
      'One limited-scope website security review',
      'SSL review',
      'DNS security review',
      'Basic security configuration review',
      'Security update recommendations',
      'Monthly security summary',
      'Up to 3 analyst hours per month',
      'Business-hours email support',
      'Monthly consultation within the agreed service scope',
    ],
    includedAssetLimit: 5,
    includedAnalystHoursPerMonth: 3,
    isRecommended: false,
    status: 'active',
    ctaLabel: 'Get Started',
    requiresEnterpriseContact: false,
    requires24x7Readiness: false,
    sortOrder: 0,
  },
  {
    id: crypto.randomUUID(),
    slug: 'security-professional',
    name: 'Security Professional',
    targetAudience: 'Small and growing businesses',
    category: 'assurance',
    monthlyPriceUsd: '1499.00',
    isStartingAtPrice: false,
    minContractMonths: 3,
    includedFeatures: [
      'Everything in Essential',
      'Up to 15 agreed assets',
      'Biweekly vulnerability reviews',
      'Monthly limited-scope web application security review',
      'Firewall and network configuration review',
      'Identity and access management review',
      'Security log review for up to 3 agreed sources',
      'Threat intelligence briefing',
      'Remediation recommendations',
      'Remediation verification',
      'Monthly security consultation',
      'Up to 10 analyst hours monthly',
      'Priority business-hours email support',
      'Monthly security report and action plan',
    ],
    includedAssetLimit: 15,
    includedAnalystHoursPerMonth: 10,
    isRecommended: true,
    status: 'active',
    ctaLabel: 'Get Started',
    requiresEnterpriseContact: false,
    requires24x7Readiness: false,
    sortOrder: 1,
  },
  {
    id: crypto.randomUUID(),
    slug: 'security-advanced',
    name: 'Security Advanced',
    targetAudience: 'Established and more complex businesses',
    category: 'assurance',
    monthlyPriceUsd: '3499.00',
    isStartingAtPrice: false,
    minContractMonths: 3,
    includedFeatures: [
      'Everything in Professional',
      'Up to 40 agreed assets',
      'Weekly vulnerability reviews',
      'External attack-surface monitoring',
      'Cloud security configuration review',
      'Endpoint security posture review',
      'SIEM alert review for agreed sources during contracted hours',
      'Monthly risk register',
      'Remediation tracking',
      'Incident response planning and advisory',
      'Quarterly incident-response tabletop exercise',
      'Monthly executive security meeting',
      'Up to 25 analyst hours monthly',
      'Priority business-hours support',
      'Monthly executive security report',
    ],
    includedAssetLimit: 40,
    includedAnalystHoursPerMonth: 25,
    isRecommended: false,
    status: 'active',
    ctaLabel: 'Get Started',
    requiresEnterpriseContact: false,
    requires24x7Readiness: false,
    sortOrder: 2,
  },
  {
    id: crypto.randomUUID(),
    slug: 'enterprise-security-partnership',
    name: 'Enterprise Security Partnership',
    targetAudience: 'Large organizations, regulated businesses and multi-location enterprises',
    category: 'assurance',
    monthlyPriceUsd: '7500.00',
    isStartingAtPrice: true,
    minContractMonths: 12,
    includedFeatures: [
      'Dedicated security service manager',
      'Customized security assessment program',
      'Multiple networks and business applications',
      'Cloud environment assessments',
      'Vulnerability management program',
      'SIEM use-case and detection engineering',
      'Compliance and security governance assistance',
      'Vendor and third-party risk reviews',
      'Executive and board-level security reporting',
      'Custom support hours and escalation arrangements',
      'Dedicated resource allocation',
      'Customized security roadmap',
      'Quarterly strategic reviews',
    ],
    includedAssetLimit: null,
    includedAnalystHoursPerMonth: null,
    isRecommended: false,
    status: 'active',
    ctaLabel: 'Request Enterprise Proposal',
    requiresEnterpriseContact: true,
    requires24x7Readiness: false,
    sortOrder: 3,
  },
  // --- Managed Security Operations (separate section/category) ---
  {
    id: crypto.randomUUID(),
    slug: 'co-managed-security-monitoring',
    name: 'Co-Managed Security Monitoring',
    targetAudience: 'Businesses wanting shared-responsibility monitoring',
    category: 'managed_security',
    monthlyPriceUsd: '2500.00',
    isStartingAtPrice: true,
    minContractMonths: 3,
    includedFeatures: ['Agreed monitoring sources', 'Business-hours alert review', 'Shared responsibility', 'Escalation and reporting'],
    includedAssetLimit: null,
    includedAnalystHoursPerMonth: null,
    isRecommended: false,
    status: 'active',
    ctaLabel: 'Request a Proposal',
    requiresEnterpriseContact: true,
    requires24x7Readiness: false,
    sortOrder: 4,
  },
  {
    id: crypto.randomUUID(),
    slug: 'managed-detection-response',
    name: 'Managed Detection and Response',
    targetAudience: 'Businesses needing 24/7 internal monitoring',
    category: 'managed_security',
    monthlyPriceUsd: '5000.00',
    isStartingAtPrice: true,
    minContractMonths: 3,
    includedFeatures: [
      'Intended 24/7 internal monitoring service',
      'Security alert triage',
      'Detection and escalation',
      'Defined response procedures',
      'Agreed endpoint and log sources',
    ],
    includedAssetLimit: null,
    includedAnalystHoursPerMonth: null,
    isRecommended: false,
    status: 'active',
    ctaLabel: 'Request a Proposal',
    requiresEnterpriseContact: true,
    // Gated — see docs/SOC_READINESS.md. Must stay true until an admin
    // deliberately confirms internal 24/7 operational readiness.
    requires24x7Readiness: true,
    sortOrder: 5,
  },
  {
    id: crypto.randomUUID(),
    slug: 'enterprise-mdr',
    name: 'Enterprise MDR',
    targetAudience: 'Complex environments needing customized coverage',
    category: 'managed_security',
    monthlyPriceUsd: '10000.00',
    isStartingAtPrice: true,
    minContractMonths: 12,
    includedFeatures: ['Customized coverage for complex environments'],
    includedAssetLimit: null,
    includedAnalystHoursPerMonth: null,
    isRecommended: false,
    status: 'active',
    ctaLabel: 'Request Enterprise Proposal',
    requiresEnterpriseContact: true,
    requires24x7Readiness: true,
    sortOrder: 6,
  },
];

const ADD_ONS: Array<typeof addOnServices.$inferInsert> = [
  { id: crypto.randomUUID(), slug: 'website-security-assessment', name: 'Website Security Assessment', startingPriceUsd: '750.00', status: 'active', sortOrder: 0 },
  { id: crypto.randomUUID(), slug: 'web-app-penetration-test', name: 'Web Application Penetration Test', startingPriceUsd: '2000.00', status: 'active', sortOrder: 1 },
  { id: crypto.randomUUID(), slug: 'network-vulnerability-assessment', name: 'Network Vulnerability Assessment', startingPriceUsd: '1000.00', status: 'active', sortOrder: 2 },
  { id: crypto.randomUUID(), slug: 'external-attack-surface-assessment', name: 'External Attack-Surface Assessment', startingPriceUsd: '750.00', status: 'active', sortOrder: 3 },
  { id: crypto.randomUUID(), slug: 'cloud-security-assessment', name: 'Cloud Security Assessment', startingPriceUsd: '1500.00', status: 'active', sortOrder: 4 },
  { id: crypto.randomUUID(), slug: 'security-awareness-session', name: 'Security Awareness Session', startingPriceUsd: '500.00', status: 'active', sortOrder: 5 },
  { id: crypto.randomUUID(), slug: 'incident-response-engagement', name: 'Incident Response Engagement', startingPriceUsd: '2000.00', status: 'active', sortOrder: 6 },
  { id: crypto.randomUUID(), slug: 'iot-security-assessment', name: 'IoT Security Assessment', startingPriceUsd: null, status: 'active', sortOrder: 7 },
  { id: crypto.randomUUID(), slug: 'iso27001-readiness-gap-assessment', name: 'ISO 27001 Readiness / Gap Assessment', startingPriceUsd: null, status: 'active', sortOrder: 8 },
  { id: crypto.randomUUID(), slug: 'digital-forensics', name: 'Digital Forensics', startingPriceUsd: null, status: 'active', sortOrder: 9 },
];

export async function seedPricingData(): Promise<{ plansCreated: string[]; addOnsCreated: string[] }> {
  const plansCreated: string[] = [];
  for (const plan of PLANS) {
    const existing = await db.select().from(pricingPlans).where(eq(pricingPlans.slug, plan.slug)).limit(1);
    if (existing[0]) continue;
    await db.insert(pricingPlans).values(plan);
    plansCreated.push(plan.slug);
  }

  const addOnsCreated: string[] = [];
  for (const addOn of ADD_ONS) {
    const existing = await db.select().from(addOnServices).where(eq(addOnServices.slug, addOn.slug)).limit(1);
    if (existing[0]) continue;
    await db.insert(addOnServices).values(addOn);
    addOnsCreated.push(addOn.slug);
  }

  return { plansCreated, addOnsCreated };
}
