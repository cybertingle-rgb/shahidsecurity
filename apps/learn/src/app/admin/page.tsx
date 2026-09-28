import Link from 'next/link';
import { getAdminOverviewStats } from '@/lib/admin/analytics';

const SECTIONS = [
  { href: '/admin/students', label: 'Students', description: 'Search, view profiles, suspend/reactivate, manual enroll' },
  { href: '/admin/courses', label: 'Courses', description: 'Create, edit, and publish courses' },
  { href: '/admin/products', label: 'Products & Pricing', description: 'Catalog items and their per-currency/country prices' },
  { href: '/admin/enrollments', label: 'Enrollments', description: 'All enrollments across every student' },
  { href: '/admin/orders', label: 'Orders', description: 'Order history and status' },
  { href: '/admin/payments', label: 'Payments', description: 'Manual payment verification queue' },
  { href: '/admin/communities', label: 'Communities', description: 'Discord/Facebook/Telegram invite links and eligibility rules' },
  { href: '/admin/announcements', label: 'Announcements', description: 'Publish updates to students' },
  { href: '/admin/settings', label: 'Settings', description: 'Bank transfer instructions and support email' },
  { href: '/admin/roadmap', label: 'Roadmap', description: 'The 18-stage cybersecurity roadmap shown on shahidiqbal.com/learn/roadmap' },
];

export default async function AdminDashboardPage() {
  const stats = await getAdminOverviewStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-text-muted">
          Coupons and certificates are V2 and intentionally not here yet — see `docs/LMS_V1_SCOPE.md`.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted">Total students</p>
          <p className="mt-1 text-2xl font-semibold">{stats.totalStudents}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted">Active enrollments</p>
          <p className="mt-1 text-2xl font-semibold">{stats.activeEnrollments}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted">Total orders</p>
          <p className="mt-1 text-2xl font-semibold">{stats.totalOrders}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted">Revenue (paid orders)</p>
          <p className="mt-1 text-2xl font-semibold text-neon">PKR {(stats.totalRevenueMinorUnits / 100).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-lg border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface"
          >
            <p className="font-medium text-neon">{section.label}</p>
            <p className="mt-1 text-sm text-text-muted">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
