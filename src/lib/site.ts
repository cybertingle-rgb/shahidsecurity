export const site = {
  name: 'Shahid Security',
  legalName: 'Shahid Security',
  legalEntity: 'Shahid Security — sole proprietorship of Muhammad Shahid Iqbal',
  founder: 'Muhammad Shahid Iqbal',
  // Primary brand tagline (from the logo): hero eyebrow, footer, meta.
  tagline: 'Protect. Build. Scale.',
  // Secondary line: About pull-quote and CTA bands.
  taglineSecondary: 'Prevention is cheaper than a breach.',
  domain: 'shahidiqbal.com',
  url: 'https://shahidiqbal.com',
  description:
    'Independent cybersecurity consulting for businesses worldwide: penetration testing, vulnerability assessments, security audits and incident response. Book a free consultation.',
  email: 'info@shahidiqbal.com',
  phone: '+923116234126',
  phoneDisplay: '+92 311 6234126',
  whatsappNumber: '923116234126',
  // Public-facing location shown on the Contact page.
  address: {
    locality: 'Islamabad',
    region: 'Islamabad Capital Territory',
    country: 'PK',
    countryName: 'Pakistan',
    displayLine: 'Islamabad, Pakistan',
  },
  // Registered office — used in JSON-LD, footer legal line and invoices, not the hero/contact cards.
  registeredAddress: {
    locality: 'Islamabad',
    region: 'Islamabad Capital Territory',
    country: 'PK',
    countryName: 'Pakistan',
    full: 'Islamabad, Pakistan',
  },
  hours: {
    days: 'Monday–Saturday',
    open: '10:00',
    close: '20:00',
    timezone: 'PKT',
    display: 'Monday–Saturday, 10:00–20:00 PKT',
  },
  social: {
    facebook: 'https://www.facebook.com/shahidsecurityofficial',
    instagram: 'https://www.instagram.com/shahidsecurityofficial',
    x: 'https://x.com/shahidsecurity',
    linkedin: 'https://www.linkedin.com/in/shahidlooper',
  },
  founderExperienceSince: 2020,
} as const;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${site.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function mailtoLink(subject?: string) {
  const base = `mailto:${site.email}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}

export function telLink() {
  return `tel:${site.phone}`;
}
