import type { PortalIconName } from '@/components/PortalIcon';

export type NavSection = { href: string; label: string; icon: PortalIconName };

export const BUSINESS_NAV: NavSection[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/dashboard/business', label: 'Business', icon: 'briefcase' },
  { href: '/dashboard/content', label: 'Content', icon: 'file-text' },
  { href: '/dashboard/seo', label: 'SEO', icon: 'search' },
  { href: '/dashboard/leads', label: 'Customers & Leads', icon: 'user-plus' },
  { href: '/dashboard/pricing', label: 'Pricing', icon: 'tag' },
  { href: '/dashboard/payments', label: 'Payments', icon: 'wallet' },
  { href: '/dashboard/testimonials', label: 'Reviews', icon: 'star' },
  { href: '/dashboard/google', label: 'Google', icon: 'trending-up' },
  { href: '/dashboard/ai', label: 'AI Assistant', icon: 'sparkles' },
  { href: '/dashboard/media', label: 'Media', icon: 'image' },
  { href: '/dashboard/users', label: 'Users', icon: 'users' },
  { href: '/dashboard/configurations', label: 'Configurations', icon: 'sliders' },
];

export const LEARN_NAV: NavSection[] = [
  { href: '/dashboard/learn', label: 'Overview', icon: 'home' },
  { href: '/dashboard/learn/students', label: 'Students', icon: 'users' },
  { href: '/dashboard/learn/courses', label: 'Courses', icon: 'graduation-cap' },
  { href: '/dashboard/learn/training-requests', label: 'Personal Training', icon: 'user-plus' },
  { href: '/dashboard/learn/products', label: 'Products', icon: 'tag' },
  { href: '/dashboard/learn/enrollments', label: 'Enrollments', icon: 'user-plus' },
  { href: '/dashboard/learn/orders', label: 'Orders', icon: 'receipt' },
  { href: '/dashboard/learn/payments', label: 'Payments', icon: 'wallet' },
  { href: '/dashboard/learn/payment-methods', label: 'Payment Methods', icon: 'credit-card' },
  { href: '/dashboard/learn/communities', label: 'Communities', icon: 'users' },
  { href: '/dashboard/learn/announcements', label: 'Announcements', icon: 'megaphone' },
  { href: '/dashboard/learn/roadmap', label: 'Roadmap', icon: 'map' },
  { href: '/dashboard/learn/exchange-rates', label: 'Exchange Rates', icon: 'trending-up' },
  { href: '/dashboard/learn/settings', label: 'Settings', icon: 'settings' },
];

export const LEARN_SECTION_PREFIX = '/dashboard/learn';
