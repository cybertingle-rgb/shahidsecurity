import { site } from './site';
import { absoluteUrl } from './seo';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${site.url}/#organization`,
    name: site.name,
    legalName: site.legalEntity,
    founder: { '@id': `${site.url}/about/#person` },
    url: site.url,
    logo: absoluteUrl('/brand/logo-stacked-dark-bg.png'),
    image: absoluteUrl('/brand/logo-stacked-dark-bg.png'),
    description: site.description,
    email: site.email,
    telephone: site.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.registeredAddress.street,
      addressLocality: site.registeredAddress.district.replace('District ', ''),
      addressRegion: site.registeredAddress.region,
      addressCountry: site.registeredAddress.country,
    },
    areaServed: 'Worldwide',
    openingHours: `${site.hours.days.slice(0, 2)}-${site.hours.days.slice(-3, -1)} ${site.hours.open}-${site.hours.close}`,
    sameAs: [site.social.facebook, site.social.instagram, site.social.x, site.social.linkedin],
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function serviceSchema(opts: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    provider: { '@id': `${site.url}/#organization` },
    areaServed: 'Worldwide',
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function blogPostingSchema(opts: {
  title: string;
  description: string;
  path: string;
  publishedAt: Date;
  updatedAt?: Date;
  author: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: absoluteUrl(opts.path),
    datePublished: opts.publishedAt.toISOString(),
    dateModified: (opts.updatedAt ?? opts.publishedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: opts.author,
    },
    publisher: { '@id': `${site.url}/#organization` },
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  publishedAt: Date;
  updatedAt?: Date;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: absoluteUrl(opts.path),
    datePublished: opts.publishedAt.toISOString(),
    dateModified: (opts.updatedAt ?? opts.publishedAt).toISOString(),
    author: { '@id': `${site.url}/about/#person` },
    publisher: { '@id': `${site.url}/#organization` },
  };
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${site.url}/about/#person`,
    name: site.founder,
    jobTitle: 'Founder & Cybersecurity Consultant',
    worksFor: { '@id': `${site.url}/#organization` },
    url: absoluteUrl('/about/'),
    sameAs: [site.social.linkedin, site.social.x],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    name: site.name,
    url: site.url,
    publisher: { '@id': `${site.url}/#organization` },
    inLanguage: 'en',
  };
}

export function webPageSchema(opts: {
  path: string;
  name: string;
  description: string;
  type?: 'WebPage' | 'ContactPage' | 'ProfilePage' | 'CollectionPage';
  mainEntityId?: string;
}) {
  const url = absoluteUrl(opts.path);
  return {
    '@context': 'https://schema.org',
    '@type': opts.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': `${site.url}/#website` },
    about: { '@id': `${site.url}/#organization` },
    ...(opts.mainEntityId ? { mainEntity: { '@id': opts.mainEntityId } } : {}),
    inLanguage: 'en',
  };
}
