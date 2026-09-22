// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const site = 'https://shahidiqbal.com';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const caseStudiesDir = fileURLToPath(new URL('./src/content/caseStudies', import.meta.url));
const hasCaseStudies = readdirSync(caseStudiesDir).some(
  (f) => f.endsWith('.mdx') || f.endsWith('.md'),
);

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
        "connect-src 'self' https://challenges.cloudflare.com",
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
    }),
  ],
  image: {
    remotePatterns: [],
  },
  build: {
    // Inline all page CSS instead of an external, render-blocking
    // stylesheet request — most visits land on a single page from search
    // or social, so there's little cross-page cache to give up, and the
    // inlined <style> gets auto-hashed by security.csp above.
    inlineStylesheets: 'always',
  },
  trailingSlash: 'always',
});
