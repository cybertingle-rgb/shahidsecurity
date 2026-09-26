import { site } from './site';

export interface SeoProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  ogImage?: string;
}

export function absoluteUrl(path: string) {
  return new URL(path, site.url).toString();
}

export function pageTitle(title: string, isHome = false) {
  return isHome ? title : `${title} | ${site.name}`;
}

/** Derives an "@handle" from the site's X/Twitter profile URL for twitter:site. */
export function twitterHandle() {
  const match = site.social.x.match(/x\.com\/([^/?#]+)/);
  return match ? `@${match[1]}` : undefined;
}
