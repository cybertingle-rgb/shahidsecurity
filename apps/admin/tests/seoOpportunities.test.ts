import { describe, it, expect } from 'vitest';
import { findSeoOpportunities, pathFromFullUrl } from '@/lib/google/seoOpportunities';

describe('findSeoOpportunities', () => {
  it('flags a page with high impressions but far-below-typical CTR for its position', () => {
    const rows = [
      { keys: ['https://shahidiqbal.com/blog/underperforming/'], clicks: 2, impressions: 500, ctr: 0.004, position: 4 },
    ];
    const opportunities = findSeoOpportunities(rows);
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.page).toBe('https://shahidiqbal.com/blog/underperforming/');
    expect(opportunities[0]?.note).toMatch(/title\/meta/i);
  });

  it('does not flag a page performing at or above the typical CTR for its position', () => {
    const rows = [
      { keys: ['https://shahidiqbal.com/blog/doing-fine/'], clicks: 30, impressions: 500, ctr: 0.06, position: 4 },
    ];
    expect(findSeoOpportunities(rows)).toHaveLength(0);
  });

  it('ignores low-impression pages even with a poor CTR, to avoid flagging noise', () => {
    const rows = [
      { keys: ['https://shahidiqbal.com/blog/rarely-seen/'], clicks: 0, impressions: 5, ctr: 0, position: 3 },
    ];
    expect(findSeoOpportunities(rows)).toHaveLength(0);
  });

  it('sorts flagged opportunities by impressions, highest first', () => {
    const rows = [
      { keys: ['https://shahidiqbal.com/a/'], clicks: 1, impressions: 100, ctr: 0.005, position: 5 },
      { keys: ['https://shahidiqbal.com/b/'], clicks: 2, impressions: 900, ctr: 0.005, position: 5 },
    ];
    const opportunities = findSeoOpportunities(rows);
    expect(opportunities.map((o) => o.page)).toEqual(['https://shahidiqbal.com/b/', 'https://shahidiqbal.com/a/']);
  });

  it('never fabricates a ranking-improvement promise in its note', () => {
    const rows = [{ keys: ['https://shahidiqbal.com/x/'], clicks: 1, impressions: 200, ctr: 0.001, position: 2 }];
    const [opportunity] = findSeoOpportunities(rows);
    expect(opportunity?.note.toLowerCase()).not.toMatch(/guarantee|will rank|will improve ranking/);
  });
});

describe('pathFromFullUrl', () => {
  it('extracts the path from a full URL', () => {
    expect(pathFromFullUrl('https://shahidiqbal.com/blog/ransomware-2026-trends/')).toBe('/blog/ransomware-2026-trends/');
  });

  it('returns the input unchanged if it is not a parseable URL', () => {
    expect(pathFromFullUrl('/already/a/path/')).toBe('/already/a/path/');
  });
});
