import type { SearchAnalyticsRow } from './searchConsole';

export type SeoOpportunity = {
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  note: string;
};

/**
 * Roughly what a well-matched title/meta description earns at each
 * ranking tier on Google's organic results — approximate, published
 * industry click-through-rate curves, not a Google-stated guarantee.
 * Used only as a comparison baseline to flag pages worth a human look;
 * never to promise a ranking or traffic outcome.
 */
function expectedCtrForPosition(position: number): number {
  if (position <= 3) return 0.05;
  if (position <= 10) return 0.02;
  if (position <= 20) return 0.005;
  return 0.001;
}

const MIN_IMPRESSIONS_TO_FLAG = 50;

/** Reduces a page-dimension row's full URL to a site-relative path, for linking into the SEO override editor. */
export function pathFromFullUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Flags pages with real, meaningful impression volume whose actual CTR
 * is well below what's typical for their average position — a signal
 * the title/meta description may be underperforming for how often the
 * page already appears, not a prediction that changing it will improve
 * rankings. Never auto-applies anything; the caller surfaces a "Review"
 * link into the SEO override editor and a human decides.
 */
export function findSeoOpportunities(rows: SearchAnalyticsRow[]): SeoOpportunity[] {
  return rows
    .filter((row) => row.impressions >= MIN_IMPRESSIONS_TO_FLAG)
    .filter((row) => row.ctr < expectedCtrForPosition(row.position) * 0.5)
    .map((row) => ({
      page: row.keys[0] ?? '',
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      position: row.position,
      note: 'Potential title/meta description improvement — CTR is notably below typical for this ranking position.',
    }))
    .sort((a, b) => b.impressions - a.impressions);
}
