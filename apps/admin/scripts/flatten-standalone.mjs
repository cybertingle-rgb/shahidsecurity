#!/usr/bin/env node
// Collapses the pnpm-monorepo nesting out of Next's standalone build
// output. next.config.mjs's outputFileTracingRoot points at the
// workspace root (required so Turbopack can resolve this app's
// symlinked node_modules — see that file's comment), which has the
// side effect of nesting the real entry point an extra apps/admin/
// level inside .next/standalone, with the real node_modules sitting
// one level up as a SIBLING of that nested folder, not inside it.
//
// Hostinger's Web App deploy product locates and copies just the
// server.js entry file it finds in the standalone output, not the
// whole directory tree around it — so it was grabbing
// .next/standalone/apps/admin/server.js without its sibling
// node_modules, and every deploy crashed instantly with
// "Error: Cannot find module 'next'" (confirmed against a real
// deploy, not assumed).
//
// This moves the nested apps/admin/ folder's contents up to sit
// directly beside the already-correct node_modules, so
// .next/standalone/server.js ends up fully self-contained — the
// layout Next's own docs assume and Hostinger's product expects.
import { cpSync, existsSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(scriptDir, '..');
const standaloneDir = path.join(appDir, '.next', 'standalone');
const nestedAppDir = path.join(standaloneDir, 'apps', 'admin');

if (!existsSync(nestedAppDir)) {
  console.log('flatten-standalone: no nested apps/admin/ in .next/standalone — nothing to flatten.');
  process.exit(0);
}

cpSync(nestedAppDir, standaloneDir, { recursive: true });
rmSync(path.join(standaloneDir, 'apps'), { recursive: true, force: true });

// Next's own standalone bundler (confirmed against a real build, this
// Next/pnpm version pair) emits node_modules/next itself as a symlink
// into node_modules/.pnpm using an ABSOLUTE path baked in from the
// build machine — unlike every other package in the same tree, which
// correctly uses relative paths. An absolute symlink only resolves on
// the exact machine/path it was built on, so it breaks the instant the
// output is copied anywhere else (confirmed: moving a real build to a
// different path reproduces "Cannot find module 'next'" exactly).
// Rewriting any absolute symlink here to the equivalent relative one
// makes the whole tree genuinely portable, and is a no-op for the
// symlinks that were already relative.
let fixedCount = 0;
function fixAbsoluteSymlinks(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = readlinkSync(fullPath);
      if (path.isAbsolute(target)) {
        const relativeTarget = path.relative(path.dirname(fullPath), target);
        rmSync(fullPath);
        symlinkSync(relativeTarget, fullPath);
        fixedCount += 1;
      }
    } else if (entry.isDirectory()) {
      fixAbsoluteSymlinks(fullPath);
    }
  }
}
fixAbsoluteSymlinks(path.join(standaloneDir, 'node_modules'));
console.log(`flatten-standalone: rewrote ${fixedCount} absolute symlink(s) to relative.`);

// Standalone output never includes static assets or public/ — Next's own
// docs require copying these in manually (see
// https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
cpSync(path.join(appDir, '.next', 'static'), path.join(standaloneDir, '.next', 'static'), { recursive: true });

const publicDir = path.join(appDir, 'public');
if (existsSync(publicDir)) {
  cpSync(publicDir, path.join(standaloneDir, 'public'), { recursive: true });
}

console.log('flatten-standalone: done — .next/standalone/server.js is now self-contained.');
