#!/usr/bin/env node
// Verifies every old-WordPress-URL redirect rule in public/.htaccess against
// a live (or staging) site. Run this against the real Hostinger deployment —
// mod_rewrite rules in .htaccess are Apache-only and do nothing under
// `astro dev`, `astro preview`, or `php -S` (see README "Testing notes").
//
// Usage: node scripts/verify-redirects.mjs https://shahidiqbal.com

const base = process.argv[2];
if (!base) {
  console.error('Usage: node scripts/verify-redirects.mjs <base-url>');
  console.error('Example: node scripts/verify-redirects.mjs https://shahidiqbal.com');
  process.exit(1);
}

// Mirrors the RewriteRule entries in public/.htaccess. Keep these in sync.
const redirects = [
  { from: '/about-us/', to: '/about/' },
  { from: '/contact-us/', to: '/contact/' },
  { from: '/appointment/', to: '/book/' },
  { from: '/services-1/', to: '/services/' },
  { from: '/service/', to: '/services/' },
  { from: '/service/network-security/', to: '/services/network-cloud-security/' },
  { from: '/service/data-encryption/', to: '/services/network-cloud-security/' },
  { from: '/service/identity-access/', to: '/services/network-cloud-security/' },
  { from: '/service/security-configuration/', to: '/services/network-cloud-security/' },
  { from: '/service/security-monitoring/', to: '/services/monitoring-training/' },
  { from: '/service/backup-recovery/', to: '/services/incident-response/' },
  { from: '/portfolio/', to: '/case-studies/' },
  { from: '/portfolio/some-old-project/', to: '/case-studies/' },
  { from: '/blog-standard/', to: '/blog/' },
  { from: '/tag/', to: '/blog/' },
  { from: '/tag/security/', to: '/blog/' },
  {
    from: '/business-cyber-defense-2025-the-zero-day-challenge/',
    to: '/blog/',
  },
  {
    from: '/latest-zero-day-vulnerabilities-every-business-should-know/',
    to: '/blog/',
  },
  {
    from: '/phishing-scams-on-the-rise-how-to-protect-your-team/',
    to: '/blog/',
  },
];

const gone = ['/wp-admin/', '/wp-admin/edit.php', '/wp-login.php', '/xmlrpc.php'];

let failures = 0;

async function checkRedirect({ from, to }) {
  const url = new URL(from, base).toString();
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const location = res.headers.get('location');
    const isRedirect = res.status >= 300 && res.status < 400;
    const locationMatches = location && new URL(location, base).pathname === to;
    if (isRedirect && locationMatches) {
      console.log(`OK    ${from} -> ${location} (${res.status})`);
    } else {
      failures++;
      console.log(
        `FAIL  ${from} -> expected ${to}, got status=${res.status} location=${location ?? '(none)'}`,
      );
    }
  } catch (err) {
    failures++;
    console.log(`ERROR ${from}: ${err.message}`);
  }
}

async function checkGone(path) {
  const url = new URL(path, base).toString();
  try {
    const res = await fetch(url, { redirect: 'manual' });
    if (res.status === 410 || res.status === 404) {
      console.log(`OK    ${path} -> ${res.status}`);
    } else {
      failures++;
      console.log(`FAIL  ${path} -> expected 410/404, got ${res.status}`);
    }
  } catch (err) {
    failures++;
    console.log(`ERROR ${path}: ${err.message}`);
  }
}

console.log(`Verifying redirects against ${base}\n`);
for (const r of redirects) await checkRedirect(r);
console.log('');
for (const p of gone) await checkGone(p);

console.log(`\n${failures === 0 ? 'All redirects verified.' : `${failures} redirect(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
