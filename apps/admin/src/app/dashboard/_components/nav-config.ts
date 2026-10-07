export type NavSection = { href: string; label: string };

export const BUSINESS_NAV: NavSection[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/business', label: 'Business' },
  { href: '/dashboard/content', label: 'Content' },
  { href: '/dashboard/seo', label: 'SEO' },
  { href: '/dashboard/leads', label: 'Customers & Leads' },
  { href: '/dashboard/payments', label: 'Payments' },
  { href: '/dashboard/testimonials', label: 'Reviews' },
  { href: '/dashboard/google', label: 'Google' },
  { href: '/dashboard/ai', label: 'AI Assistant' },
  { href: '/dashboard/media', label: 'Media' },
  { href: '/dashboard/users', label: 'Users' },
  { href: '/dashboard/configurations', label: 'Configurations' },
];

export const LEARN_NAV: NavSection[] = [
  { href: '/dashboard/learn', label: 'Overview' },
  { href: '/dashboard/learn/students', label: 'Students' },
  { href: '/dashboard/learn/courses', label: 'Courses' },
  { href: '/dashboard/learn/products', label: 'Products' },
  { href: '/dashboard/learn/enrollments', label: 'Enrollments' },
  { href: '/dashboard/learn/orders', label: 'Orders' },
  { href: '/dashboard/learn/payments', label: 'Payments' },
  { href: '/dashboard/learn/payment-methods', label: 'Payment Methods' },
  { href: '/dashboard/learn/communities', label: 'Communities' },
  { href: '/dashboard/learn/announcements', label: 'Announcements' },
  { href: '/dashboard/learn/roadmap', label: 'Roadmap' },
  { href: '/dashboard/learn/exchange-rates', label: 'Exchange Rates' },
  { href: '/dashboard/learn/settings', label: 'Settings' },
];

export const LEARN_SECTION_PREFIX = '/dashboard/learn';
