#!/usr/bin/env node
// Collapses the pnpm-monorepo nesting out of Next's standalone build
// output, and copies in this app's astro-dist/ (the Astro site's build,
// placed here by scripts/copy-astro-dist.mjs) alongside server.js. Same
// pattern, same reasoning, as apps/admin/scripts/flatten-standalone.mjs
// and apps/learn's own copy — see that file's comments for the full
// rationale (Hostinger's deploy product only follows server.js and its
// immediate siblings, not the whole monorepo tree around it).
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(scriptDir, '..');
const standaloneDir = path.join(appDir, '.next', 'standalone');
const nestedAppDir = path.join(standaloneDir, 'apps', 'gateway');

console.log('flatten-standalone (gateway): running');

if (!existsSync(nestedAppDir)) {
  console.log('flatten-standalone: no nested apps/gateway/ in .next/standalone — nothing to flatten.');
} else {
  for (const entry of readdirSync(nestedAppDir)) {
    const src = path.join(nestedAppDir, entry);
    const dest = path.join(standaloneDir, entry);
    if (entry === 'node_modules') {
      for (const subEntry of readdirSync(src)) {
        const subSrc = path.join(src, subEntry);
        const subDest = path.join(dest, subEntry);
        rmSync(subDest, { recursive: true, force: true });
        cpSync(subSrc, subDest, { recursive: true });
      }
      continue;
    }
    rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, { recursive: true });
  }
  rmSync(path.join(standaloneDir, 'apps'), { recursive: true, force: true });
}

let fixedCount = 0;
function fixAbsoluteSymlinks(dir) {
  if (!existsSync(dir)) return;
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

function findRealPackageDir(nodeModulesDir) {
  for (const entry of readdirSync(nodeModulesDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) continue;
    const fullPath = path.join(nodeModulesDir, entry.name);
    if (entry.name.startsWith('@')) {
      for (const scopedEntry of readdirSync(fullPath, { withFileTypes: true })) {
        if (scopedEntry.isSymbolicLink() || !scopedEntry.isDirectory()) continue;
        return { name: path.join(entry.name, scopedEntry.name), dir: path.join(fullPath, scopedEntry.name) };
      }
    } else {
      return { name: entry.name, dir: fullPath };
    }
  }
  return null;
}

const nodeModulesDir = path.join(standaloneDir, 'node_modules');
const pnpmDir = path.join(nodeModulesDir, '.pnpm');
let linkedCount = 0;
if (existsSync(pnpmDir)) {
  for (const entry of readdirSync(pnpmDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const entryNodeModules = path.join(pnpmDir, entry.name, 'node_modules');
    if (!existsSync(entryNodeModules)) continue;
    const pkg = findRealPackageDir(entryNodeModules);
    if (!pkg) continue;
    const linkPath = path.join(nodeModulesDir, pkg.name);
    if (existsSync(linkPath)) {
      if (lstatSync(linkPath).isSymbolicLink()) continue;
      rmSync(linkPath, { recursive: true, force: true });
    }
    const linkParent = path.dirname(linkPath);
    if (!existsSync(linkParent)) mkdirSync(linkParent, { recursive: true });
    symlinkSync(path.relative(linkParent, pkg.dir), linkPath);
    linkedCount += 1;
  }
}
console.log(`flatten-standalone: added ${linkedCount} missing top-level node_modules symlink(s).`);

// Standalone output never includes static assets, public/, or this app's
// own astro-dist/ (a plain runtime fs.readFile target, not something
// Next's tracer follows) — all copied in manually, same remove-then-copy
// reasoning as above (Hostinger's build environment can reuse a dirty
// working directory across deploys).
const staticDest = path.join(standaloneDir, '.next', 'static');
rmSync(staticDest, { recursive: true, force: true });
cpSync(path.join(appDir, '.next', 'static'), staticDest, { recursive: true });

const publicDir = path.join(appDir, 'public');
if (existsSync(publicDir)) {
  const publicDest = path.join(standaloneDir, 'public');
  rmSync(publicDest, { recursive: true, force: true });
  cpSync(publicDir, publicDest, { recursive: true });
}

const astroDistDir = path.join(appDir, 'astro-dist');
if (existsSync(astroDistDir)) {
  const astroDistDest = path.join(standaloneDir, 'astro-dist');
  rmSync(astroDistDest, { recursive: true, force: true });
  cpSync(astroDistDir, astroDistDest, { recursive: true });
}

console.log('flatten-standalone: done — .next/standalone/server.js is now self-contained.');
