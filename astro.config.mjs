// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const site = 'https://shahidiqbal.com';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const caseStudiesDir = fileURLToPath(new URL('./src/content/caseStudies', import.meta.url));
const blogDir = fileURLToPath(new URL('./src/content/blog', import.meta.url));
const hasCaseStudies = readdirSync(caseStudiesDir).some(
  (f) => f.endsWith('.mdx') || f.endsWith('.md'),
);

// Real lastmod dates, sourced from content frontmatter — only for the
// collections that actually track publishedAt/updatedAt. Everything else
// (services, static pages) has no genuine "last changed" date to report,
// and Google explicitly recommends omitting lastmod over guessing one.
/** @param {string} dir @param {string} pathPrefix */
function collectLastmods(dir, pathPrefix) {
  const map = new Map();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
    const { data } = matter(readFileSync(`${dir}/${file}`, 'utf8'));
    if (data.draft) continue;
    const date = data.updatedAt ?? data.publishedAt;
    if (!date) continue;
    const slug = file.replace(/\.mdx?$/, '');
    map.set(`${pathPrefix}${slug}/`, new Date(date).toISOString());
  }
  return map;
}

const lastmodByPath = new Map([
  ...collectLastmods(caseStudiesDir, '/case-studies/'),
  ...collectLastmods(blogDir, '/blog/'),
]);

// Hosting target: Hostinger shared hosting (static export uploaded to public_html).
// No SSR adapter — the contact form is handled by a plain PHP script (public/api/contact.php),
// and all redirects / security headers live in public/.htaccess (see README).
export default defineConfig({
  site,
  output: 'static',
  security: {
    // Astro hashes every inline <script>/<style> it bundles and emits a
    // per-page <meta http-equiv="content-security-policy"> tag — this is
    // how we get a strict script-src (no 'unsafe-inline') on static hosting
    // with no server to mint nonces per request. The remaining security
    // headers (HSTS, X-Frame-Options, etc.) live in public/.htaccess.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        // https://learn.shahidiqbal.com: the Luna chat widget's fetch()
        // target — this static site has no backend of its own, so Luna's
        // widget calls the one real server in the project directly from
        // the visitor's browser (src/components/LunaWidget.astro).
        "connect-src 'self' https://challenges.cloudflare.com https://learn.shahidiqbal.com",
        'frame-src https://challenges.cloudflare.com',
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com'],
      },
      styleDirective: {
        resources: ["'self'"],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': srcDir,
      },
    },
    build: {
      // Force every font/image asset to its own hashed file instead of being
      // inlined as a base64 data: URI in CSS — keeps font-src limited to
      // 'self' (no data:) and lets fonts be cached independently.
      assetsInlineLimit: 0,
    },
  },
  integrations: [
    mdx(),
    icon(),
    sitemap({
      filter: (page) =>
        !page.includes('/contact/thanks') &&
        !page.includes('/book/thanks') &&
        (hasCaseStudies || !page.includes('/case-studies')),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const lastmod = lastmodByPath.get(path);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  image: {
    remotePatterns: [],
  },
  build: {
    // 'auto' lets Astro split the shared Tailwind bundle into a small
    // number of cacheable external files instead of re-inlining the full
    // ~100KB+ of CSS into every page. Measured with Lighthouse before
    // switching from 'always': this was NOT a case where inlining helped
    // first-load performance — it came out the same or better on FCP/LCP
    // on every page type tested (smaller HTML to parse offsets the extra
    // request), and it removes the real cost of the old setup: every
    // multi-page visit (the site's own browse -> service -> contact
    // funnel) re-downloaded the same CSS on every page instead of hitting
    // cache. CSP needs no change either way — style-src already allows
    // 'self', which covers external stylesheets without hashing.
    inlineStylesheets: 'auto',
  },
  trailingSlash: 'always',
});
