// Generates on-brand Open Graph images at build time (1200x630), one per page,
// using sharp to rasterise a hand-built SVG template — no headless browser needed.
// Run via `pnpm run og` (wired into `prebuild`).
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import matter from 'gray-matter';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = path.join(root, 'public/og');
const shieldSvg = readFileSync(path.join(root, 'public/brand/shield-icon.svg'), 'utf8');

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(str) {
  return str.replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c],
  );
}

function wrapText(text, maxCharsPerLine, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines - 1) break;
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

async function renderOgImage(title, outPath) {
  const lines = wrapText(title, 26, 3);
  const lineHeight = 68;
  const startY = HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2 - 20;

  const titleTspans = lines
    .map((line, i) => `<tspan x="80" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  // Extract just the shield's inner shape so we can scale/position it as a watermark.
  const shieldInner = shieldSvg
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '');

  const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#05070a" />
      <stop offset="100%" stop-color="#0b0f14" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  <rect x="0" y="0" width="10" height="${HEIGHT}" fill="#00bf63" />
  <g transform="translate(760, 40) scale(0.42)" opacity="0.16">
    ${shieldInner}
  </g>
  <text x="80" y="90" font-family="DejaVu Sans, sans-serif" font-size="28" letter-spacing="4" fill="#00bf63" font-weight="700">SHAHID SECURITY</text>
  <text font-family="DejaVu Sans, sans-serif" font-size="56" font-weight="700" fill="#e6f1ea">
    ${titleTspans}
  </text>
  <text x="80" y="${HEIGHT - 60}" font-family="DejaVu Sans Mono, monospace" font-size="24" fill="#8aa396">Protect. Build. Scale.</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

async function main() {
  const pages = [
    { slug: 'home', title: 'Find the gaps before attackers do.' },
    { slug: 'services', title: 'Cybersecurity services' },
    { slug: 'about', title: 'About Shahid Security' },
    { slug: 'contact', title: 'Talk to a security expert' },
    { slug: 'book', title: 'Book a free 30-minute consultation' },
    { slug: 'blog', title: 'Notes on staying secure' },
    { slug: 'case-studies', title: 'Real work, real results' },
  ];

  const servicesDir = path.join(root, 'src/content/services');
  for (const file of readdirSync(servicesDir)) {
    if (!file.endsWith('.mdx')) continue;
    const raw = readFileSync(path.join(servicesDir, file), 'utf8');
    const { data } = matter(raw);
    pages.push({ slug: `service-${file.replace('.mdx', '')}`, title: data.title });
  }

  const blogDir = path.join(root, 'src/content/blog');
  for (const file of readdirSync(blogDir)) {
    if (!file.endsWith('.mdx')) continue;
    const raw = readFileSync(path.join(blogDir, file), 'utf8');
    const { data } = matter(raw);
    pages.push({ slug: `blog-${file.replace('.mdx', '')}`, title: data.title });
  }

  for (const page of pages) {
    await renderOgImage(page.title, path.join(outDir, `${page.slug}.png`));
  }

  console.log(`Generated ${pages.length} OG images in public/og/`);
}

main();
