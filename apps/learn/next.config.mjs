/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output copies only the files the app needs into .next/standalone,
  // which is what makes this deployable to a shared-hosting Node runtime
  // (Hostinger's "Setup Node.js App") without shipping the whole workspace.
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Everything in this app is authenticated or admin-only in V1 (the
        // indexable marketing pages live on the separate Astro site) — see
        // docs/lms-architecture.md §6.
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
