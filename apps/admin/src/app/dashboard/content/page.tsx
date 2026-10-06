import Link from 'next/link';

export default function ContentIndexPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Content</h1>
      <Link href="/dashboard/content/blog" className="block rounded-lg border border-border bg-bg-elevated/60 p-4 text-neon">
        Blog posts →
      </Link>
    </div>
  );
}
