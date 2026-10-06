import overridesData from '@/data/seo-overrides.generated.json';

export interface SeoOverride {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  robotsDirective?: string;
}

/**
 * Reads the admin-published SEO override for an exact page path, if one
 * exists — generated and committed by apps/admin's SEO publish action,
 * never hand-edited (see docs/ADMIN_PUBLIC_SITE_INTEGRATION.md). Returns
 * null for every path with no override, which is every path until one
 * is explicitly published — this function changes nothing about any
 * page that hasn't been migrated to the CMS.
 */
export function getSeoOverride(path: string): SeoOverride | null {
  const overrides = (overridesData as { overrides?: Record<string, SeoOverride> }).overrides ?? {};
  return overrides[path] ?? null;
}
