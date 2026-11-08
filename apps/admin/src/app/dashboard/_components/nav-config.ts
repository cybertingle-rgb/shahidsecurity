import type { PortalIconName } from '@/components/PortalIcon';

export type NavSection = {
  href: string;
  label: string;
  icon: PortalIconName;
  /**
   * The permission key (`requireAdminAction`'s argument on that page's own
   * server actions — verified against the actual call sites, not guessed)
   * that gates this section. Undefined means every signed-in admin can see
   * it (the overview page itself). super_admin always sees every item,
   * per docs/ADMIN_ARCHITECTURE.md's RBAC model — filtering happens in
   * DashboardShell, which already receives that bypass.
   */
  permission?: string;
  /** Sidebar group label (brief's "Overview/Website/Finance/Administration" structure — docs/consolidation/UNIFIED_ARCHITECTURE.md §8 groundwork). */
  group: string;
};

export const BUSINESS_NAV: NavSection[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home', group: 'Overview' },

  { href: '/dashboard/business', label: 'Business', icon: 'briefcase', permission: 'business.manage', group: 'Website' },
  { href: '/dashboard/content', label: 'Content', icon: 'file-text', permission: 'blog.manage', group: 'Website' },
  { href: '/dashboard/seo', label: 'SEO', icon: 'search', permission: 'seo.manage', group: 'Website' },
  { href: '/dashboard/leads', label: 'Customers & Leads', icon: 'user-plus', permission: 'leads.manage', group: 'Website' },
  { href: '/dashboard/testimonials', label: 'Reviews', icon: 'star', permission: 'testimonials.manage', group: 'Website' },

  { href: '/dashboard/pricing', label: 'Pricing', icon: 'tag', permission: 'pricing.manage', group: 'Finance' },
  { href: '/dashboard/payments', label: 'Payments', icon: 'wallet', permission: 'payments.manage', group: 'Finance' },

  { href: '/dashboard/google', label: 'Google', icon: 'trending-up', permission: 'google.manage', group: 'Administration' },
  { href: '/dashboard/ai', label: 'AI Assistant', icon: 'sparkles', permission: 'ai.manage', group: 'Administration' },
  { href: '/dashboard/media', label: 'Media', icon: 'image', permission: 'media.manage', group: 'Administration' },
  { href: '/dashboard/users', label: 'Users', icon: 'users', permission: 'users.manage', group: 'Administration' },
  { href: '/dashboard/configurations', label: 'Configurations', icon: 'sliders', permission: 'settings.manage', group: 'Administration' },
];

// Every page under /dashboard/learn is gated by the single coarse
// 'learn.manage' permission, not individually (apps/admin/src/lib/learn/guard.ts's
// own comment: "a single coarse 'learn.manage' key... the specific key
// argument is accepted for call-site compatibility but ignored") — so
// unlike BUSINESS_NAV, there is no finer-grained filtering to apply here
// without changing that enforcement first, which this is not the place to
// do unilaterally. All-or-nothing on 'learn.manage' is accurate to what
// the backend actually checks.
export const LEARN_NAV: NavSection[] = [
  { href: '/dashboard/learn', label: 'Overview', icon: 'home', group: 'Overview' },

  { href: '/dashboard/learn/courses', label: 'Courses', icon: 'graduation-cap', permission: 'learn.manage', group: 'Learning Management' },
  { href: '/dashboard/learn/students', label: 'Students', icon: 'users', permission: 'learn.manage', group: 'Learning Management' },
  { href: '/dashboard/learn/enrollments', label: 'Enrollments', icon: 'user-plus', permission: 'learn.manage', group: 'Learning Management' },
  { href: '/dashboard/learn/training-requests', label: 'Personal Training', icon: 'user-plus', permission: 'learn.manage', group: 'Learning Management' },
  { href: '/dashboard/learn/communities', label: 'Communities', icon: 'users', permission: 'learn.manage', group: 'Learning Management' },
  { href: '/dashboard/learn/announcements', label: 'Announcements', icon: 'megaphone', permission: 'learn.manage', group: 'Learning Management' },
  { href: '/dashboard/learn/roadmap', label: 'Roadmap', icon: 'map', permission: 'learn.manage', group: 'Learning Management' },

  { href: '/dashboard/learn/products', label: 'Products', icon: 'tag', permission: 'learn.manage', group: 'Finance' },
  { href: '/dashboard/learn/orders', label: 'Orders', icon: 'receipt', permission: 'learn.manage', group: 'Finance' },
  { href: '/dashboard/learn/payments', label: 'Payments', icon: 'wallet', permission: 'learn.manage', group: 'Finance' },
  { href: '/dashboard/learn/payment-methods', label: 'Payment Methods', icon: 'credit-card', permission: 'learn.manage', group: 'Finance' },
  { href: '/dashboard/learn/exchange-rates', label: 'Exchange Rates', icon: 'trending-up', permission: 'learn.manage', group: 'Finance' },

  { href: '/dashboard/learn/settings', label: 'Settings', icon: 'settings', permission: 'learn.manage', group: 'Administration' },
];

export const LEARN_SECTION_PREFIX = '/dashboard/learn';

/** Groups items by their `group` field, preserving each group's first-seen order and each item's original order within it. */
export function groupNav(items: NavSection[]): { label: string; items: NavSection[] }[] {
  const order: string[] = [];
  const byGroup = new Map<string, NavSection[]>();
  for (const item of items) {
    if (!byGroup.has(item.group)) {
      byGroup.set(item.group, []);
      order.push(item.group);
    }
    byGroup.get(item.group)!.push(item);
  }
  return order.map((label) => ({ label, items: byGroup.get(label)! }));
}

/** super_admin sees everything (docs/ADMIN_ARCHITECTURE.md's RBAC model — implicit full access, no role_permissions rows needed). */
export function visibleNav(items: NavSection[], permissionKeys: ReadonlySet<string>, isSuperAdmin: boolean): NavSection[] {
  if (isSuperAdmin) return items;
  return items.filter((item) => !item.permission || permissionKeys.has(item.permission));
}
