#!/usr/bin/env node
// Copies the Astro site's own build output (repo root's dist/, built by
// `pnpm build` at the repo root — completely unchanged by this project,
// per docs/consolidation/UNIFIED_ARCHITECTURE.md) into this app's own
// astro-dist/, which src/app/[[...slug]]/route.ts serves at runtime.
// Run before `next build` (see package.json) so a build always picks up
// whatever the most recent Astro build produced.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(scriptDir, '..');
const repoRoot = path.join(appDir, '..', '..');
const sourceDist = path.join(repoRoot, 'dist');
const destDir = path.join(appDir, 'astro-dist');

if (!existsSync(sourceDist)) {
  // Never fail the build over this — a `pnpm dev`/`pnpm typecheck` on
  // this app alone, with no Astro build run yet, should still work. Real
  // deploys run `astro build` first (see the updated root deploy
  // workflow), so this only fires here in an incomplete local setup.
  console.warn(
    `copy-astro-dist: no build output at ${sourceDist} — run the repo root's \`pnpm build\` first. ` +
      'Writing a placeholder astro-dist/ so this app still builds.',
  );
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  writeFileSync(
    path.join(destDir, 'index.html'),
    '<!doctype html><html><body><p>Astro build output not found. Run `pnpm build` at the repo root first.</p></body></html>\n',
  );
  process.exit(0);
}

rmSync(destDir, { recursive: true, force: true });
cpSync(sourceDist, destDir, { recursive: true });
console.log(`copy-astro-dist: copied ${sourceDist} -> ${destDir}`);
