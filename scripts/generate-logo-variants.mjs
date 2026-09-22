// Downsizes the source brand logos (shipped at print/marketing resolution)
// into on-page sizes actually used by the header, footer and 404, so the
// browser isn't asked to download a 1200x571 PNG to render an 80px-tall navbar
// logo. Run via `pnpm run logos` (wired into `prebuild`).
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const brandDir = path.join(root, 'public/brand');

const variants = [
  { src: 'logo-horizontal-dark-bg.png', out: 'logo-horizontal-dark-bg-nav', width: 340 },
  { src: 'logo-stacked-dark-bg.png', out: 'logo-stacked-dark-bg-sm', width: 320 },
];

async function main() {
  if (!existsSync(brandDir)) mkdirSync(brandDir, { recursive: true });

  for (const v of variants) {
    const input = path.join(brandDir, v.src);
    const buf = readFileSync(input);
    await sharp(buf)
      .resize({ width: v.width })
      .png()
      .toFile(path.join(brandDir, `${v.out}.png`));
    await sharp(buf)
      .resize({ width: v.width })
      .webp({ quality: 90 })
      .toFile(path.join(brandDir, `${v.out}.webp`));
  }

  console.log(`Generated ${variants.length} resized logo variants in public/brand/`);
}

main();
