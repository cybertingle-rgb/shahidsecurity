import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { env } from '@/lib/env';

/**
 * Only the genuinely public, indexable pages — the authenticated
 * dashboard and admin panel (robots: noindex on both) have no business in
 * a sitemap. Course URLs are generated from real published courses, never
 * a hardcoded list, so this stays accurate as courses are added/archived.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  const publishedCourses = await db
    .select({ slug: courses.slug, updatedAt: courses.updatedAt })
    .from(courses)
    .where(eq(courses.status, 'published'));

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/courses`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/login`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/register`, changeFrequency: 'yearly', priority: 0.3 },
    ...publishedCourses.map((c) => ({
      url: `${base}/courses/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
