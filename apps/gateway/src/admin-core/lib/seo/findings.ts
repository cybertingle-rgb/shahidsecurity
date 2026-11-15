/**
 * Snapshot of docs/seo-growth/SEO_PRIORITY_MATRIX.md (2026-11-15 audit),
 * hardcoded rather than read from the repo at request time — this app's
 * deployed standalone bundle doesn't carry the rest of the monorepo's
 * docs/ folder with it, so a runtime fs read would work locally and fail
 * in production. Re-sync this array by hand each time the audit re-runs
 * (see docs/seo-growth/SEO_AUTOMATION_WORKFLOW.md for the re-audit
 * cadence) — it is a point-in-time snapshot for visibility, not a live
 * query against the markdown file.
 */
export type SeoFindingPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type SeoFinding = {
  id: string;
  priority: SeoFindingPriority;
  finding: string;
  impact: string;
  effort: string;
  phase: string;
  status: 'open' | 'resolved' | 'owner-dependent';
};

export const SEO_AUDIT_SNAPSHOT_DATE = '2026-11-15';

export const seoFindings: SeoFinding[] = [
  {
    id: 'F1',
    priority: 'P0',
    finding: 'No Google Search Console / GA4 / Bing Webmaster access this session',
    impact: 'Cannot measure the real-world effect of any SEO work — every priority is evidence-based, not outcome-verified, until this closes.',
    effort: 'None (owner action)',
    phase: 'Owner grants access; Phase 10',
    status: 'owner-dependent',
  },
  {
    id: 'F2',
    priority: 'P0',
    finding: 'No live network access to shahidiqbal.com from the research session',
    impact: 'Every crawl was of the local build, not confirmed against production.',
    effort: 'None (owner action, or a future session with access)',
    phase: 'Owner runs a live crawl and compares to SEO_URL_INVENTORY.csv',
    status: 'owner-dependent',
  },
  {
    id: 'F3',
    priority: 'P1',
    finding: '99 pages had a meta description over 160 characters',
    impact: 'Truncated search-result snippets depress CTR across most of the blog, the homepage, every industry page, and /pricing/.',
    effort: 'Medium — editorial judgment per page',
    phase: 'Phase 6/7',
    status: 'resolved',
  },
  {
    id: 'F4',
    priority: 'P1',
    finding: 'No analytics installed anywhere on the site',
    impact: 'Zero first-party visibility into real traffic/conversions independent of Search Console; compounds F1.',
    effort: 'Low (adding the tag) once a GA4 property + owner approval exist',
    phase: 'Phase 10 — blocked on explicit owner approval for a new third-party script',
    status: 'owner-dependent',
  },
  {
    id: 'F5',
    priority: 'P2',
    finding: '98% of <img> tags were missing an explicit loading attribute',
    impact: 'Second-order Core Web Vitals (LCP) opportunity.',
    effort: 'Medium — shared components site-wide',
    phase: 'Phase 6',
    status: 'resolved',
  },
  {
    id: 'F6',
    priority: 'P2',
    finding: 'Three /learn/* auth pages indexable by default while their siblings were correctly noindexed',
    impact: 'Minor thin-content/crawl-budget inconsistency.',
    effort: 'Low',
    phase: 'Phase 6',
    status: 'resolved',
  },
  {
    id: 'F7',
    priority: 'P2',
    finding: 'Only 1 published case study',
    impact: 'Thin social-proof signal; limits what GCC/location-page content can credibly cite as evidence.',
    effort: 'N/A from content generation — requires a real client’s written permission',
    phase: 'Business-development dependency, not a content task',
    status: 'owner-dependent',
  },
  {
    id: 'F8',
    priority: 'P2',
    finding: "apps/gateway's own public /learn/* pages (courses, personal-training) not yet technically audited",
    impact: 'Unknown whether their own metadata/structured-data/internal-linking is sound.',
    effort: 'Medium (a dedicated audit pass)',
    phase: 'New Phase 6/7 sub-task',
    status: 'open',
  },
  {
    id: 'F9',
    priority: 'P3',
    finding: '22 pages had a meta description under 70 characters (20 non-indexable tag pages, 2 real pages)',
    impact: 'Minimal — mostly non-indexable pages; /terms/ and /learn/pricing/ were the 2 worth fixing.',
    effort: 'Low',
    phase: 'Phase 6',
    status: 'resolved',
  },
  {
    id: 'F10',
    priority: 'P3',
    finding: '/pricing/ and /learn/pricing/ build-time fetch to the admin API fails gracefully when unreachable',
    impact: 'Low — only a risk if the live admin app is down at the exact moment a scheduled rebuild runs. Confirmed by design, not a bug.',
    effort: 'N/A — already has retry+fallback handling',
    phase: 'Informational',
    status: 'resolved',
  },
  {
    id: 'F11',
    priority: 'P3',
    finding: '22 .htaccess legacy redirect rules unverified against the live server',
    impact: 'Cannot confirm old WordPress-era URLs still correctly redirect.',
    effort: 'None from a sandboxed session (needs live access, same as F2)',
    phase: 'Owner runs scripts/verify-redirects.mjs against the live domain',
    status: 'owner-dependent',
  },
  {
    id: 'F12',
    priority: 'P3',
    finding: 'Zero hreflang tags, English-only site',
    impact: 'Honest starting point for Arabic SEO work, not a defect — a dedicated Arabic experience is a strategic decision gated on real evidence.',
    effort: 'N/A',
    phase: 'Phase 8 decision point',
    status: 'open',
  },
  {
    id: 'F13',
    priority: 'P3',
    finding: 'Confirmed strength: 0 duplicate titles/descriptions, 0 missing canonicals, 0 heading-structure issues, 0 missing alt text, 0 broken links, 0 fabricated schema',
    impact: 'Strong technical foundation — most remaining opportunity is content/market strategy and measurement, not technical remediation.',
    effort: 'N/A',
    phase: 'Maintain via periodic re-crawl',
    status: 'resolved',
  },
];

export function countByPriority(findings: SeoFinding[]): Record<SeoFindingPriority, number> {
  const counts: Record<SeoFindingPriority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const f of findings) counts[f.priority] += 1;
  return counts;
}
