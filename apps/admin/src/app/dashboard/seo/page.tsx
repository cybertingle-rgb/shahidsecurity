import Link from 'next/link';

export default function SeoIndexPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">SEO control center</h1>
      <div className="rounded-lg border border-warn/40 bg-warn/5 p-4 text-sm text-text-muted">
        <strong className="text-warn">Not yet wired to the live site.</strong> shahidiqbal.com is a statically-generated
        Astro site, built and deployed separately from this admin app. The overrides and redirects managed here are stored
        correctly, but they only take effect once the Astro site's build process is updated to read from this app (a
        documented follow-up, not yet implemented — see docs/SEO_CONTROL_CENTER.md). Treat this as the system of record
        to build that integration against, not as something already live.
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/seo/pages" className="rounded-lg border border-border bg-bg-elevated/60 p-4 text-neon">
          Per-page overrides →
        </Link>
        <Link href="/dashboard/seo/redirects" className="rounded-lg border border-border bg-bg-elevated/60 p-4 text-neon">
          Redirects →
        </Link>
      </div>
    </div>
  );
}
