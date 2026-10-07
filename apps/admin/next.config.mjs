/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deliberately NOT output: 'standalone' here, unlike apps/learn. On
  // Hostinger's git-connected "Web App" product, a monorepo's standalone
  // output nests an extra apps/admin/ level inside .next/standalone
  // (outputFileTracingRoot points at the workspace root so hoisted
  // node_modules trace correctly), and that product's own publish step
  // doesn't preserve the sibling node_modules folder when it copies that
  // nested output to its deploy version — every run crashes instantly
  // with "Error: Cannot find module 'next'" (confirmed against a real
  // deploy, not assumed). Leaving output unset makes Hostinger fall back
  // to running the app directly against the full pnpm install it already
  // did during the build (the same one `pnpm build` used), so module
  // resolution just works. If this app ever moves to a deploy mechanism
  // that handles monorepo standalone output correctly (e.g. the
  // GitHub-Actions-over-SSH path in .github/workflows/deploy-admin.yml),
  // standalone can be reinstated there.
  poweredByHeader: false,
  // Served at shahidiqbal.com/admin, not its own subdomain — every
  // internal link, asset path, and router.push() call is automatically
  // rewritten under this prefix. This only handles the Next.js side;
  // the Hostinger Web App for this deployment must itself be configured
  // so requests under /admin/* reach this process — see
  // docs/DEPLOYMENT.md.
  basePath: '/admin',
  experimental: {
    // Same Turbopack workaround as apps/learn's next.config.mjs — avoids a
    // process-spawn panic seen under load on this host.
    turbopackPluginRuntimeStrategy: 'workerThreads',
  },
  async headers() {
    return [
      // Unlike apps/learn, this entire application is a private
      // administration panel — it has no public-facing pages at all, so
      // every route gets noindex, not just a subset.
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
