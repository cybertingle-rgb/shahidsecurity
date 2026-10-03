import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Matches the X-Robots-Tag headers in next.config.mjs and the
      // explicit noindex metadata on these layouts — three layers for the
      // areas that must never be indexed, one source of truth for why
      // (docs/lms-security.md).
      disallow: ['/dashboard/', '/admin/', '/api/', '/reset-password', '/verify-email'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
