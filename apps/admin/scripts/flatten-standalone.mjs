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
import { cpSync, existsSync, mkdirSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(scriptDir, '..');
const standaloneDir = path.join(appDir, '.next', 'standalone');
const nestedAppDir = path.join(standaloneDir, 'apps', 'admin');

// Printed unconditionally, before anything else in this script, so a
// stale Hostinger checkout/cache that silently skips re-pulling this
// file is visible directly from the build log instead of having to be
// inferred from runtime crashes days later — bump this string any time
// this file changes materially.
console.log('flatten-standalone: running script version 2024-10-18-symlink-fix');

if (!existsSync(nestedAppDir)) {
  console.log('flatten-standalone: no nested apps/admin/ in .next/standalone — nothing to flatten.');
  process.exit(0);
}

// Copy entry-by-entry, removing each destination path first, rather than
// one bulk recursive cpSync straight onto standaloneDir. Confirmed against
// a real Hostinger build: its build environment reuses the working
// directory across deploys instead of starting from a clean checkout, so
// .next/standalone/node_modules (etc.) can already exist from a previous
// run. fs.cpSync refuses to copy a directory over an existing path of a
// different type — e.g. a stale symlink where this run wants a real
// directory — even with force: true (its default), and throws EEXIST.
// Removing the destination first makes this safe to re-run against a
// dirty build directory, not just a pristine one.
//
// node_modules is handled separately (merged, not replaced): confirmed
// against a real deploy that the naive version of this loop — rmSync the
// destination, then cpSync the source, for every entry including
// node_modules — was silently destroying the real, comprehensive
// node_modules that Next's bundler already places at the top level of
// .next/standalone (see this file's header comment), replacing it with
// nestedAppDir's own node_modules, which contains only the handful of
// per-app-hoisted symlinks pnpm creates there (e.g. just `next`) — not
// the actual dependency tree. The deployed app ended up with a
// node_modules holding a single, now-dangling `next` symlink and nothing
// else, crashing with "Cannot find module 'next'" despite this script
// having reported success. Merging each nested node_modules entry into
// the existing top-level one (instead of wiping the directory first)
// keeps the real tree intact while still layering in whatever the nested
// one has.
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

// Next's tracer only pre-creates a handful of top-level node_modules
// symlinks (confirmed against a real deploy: just `next` and `sharp`)
// for packages it expects compiled code to require by bare name at
// runtime — but that set isn't complete or predictable. A real deploy
// crashed with "Cannot find module
// '.../node_modules/@swc/helpers/esm/_interop_require_default.js'":
// Turbopack's compiled runtime chunk does an externalRequire for
// @swc/helpers, which was never given a top-level symlink even though
// the real package sits right there in node_modules/.pnpm. Rather than
// guess which specific packages Turbopack's runtime will decide to
// require externally (it clearly isn't limited to `next`/`sharp`, and
// there's no documented list), this gives every real package actually
// stored under .pnpm a top-level symlink, matching what a flat (non-
// monorepo) install would already provide for free. Pure filesystem
// introspection, not pnpm folder-name parsing (version strings and
// peer-dep suffixes in those names make that fragile) — each .pnpm/<X>
// entry has exactly one real (non-symlink) package directory inside
// its own node_modules, found by walking it directly.
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
    if (existsSync(linkPath)) continue; // already linked (e.g. next, sharp)
    const linkParent = path.dirname(linkPath);
    // linkParent is nodeModulesDir itself for an unscoped package (already
    // exists) or a scope dir like node_modules/@swc for a scoped one,
    // which may not exist yet if this is its first package — never remove
    // it first, only create it if missing, so sibling scoped packages
    // already linked here are never touched.
    if (!existsSync(linkParent)) mkdirSync(linkParent, { recursive: true });
    symlinkSync(path.relative(linkParent, pkg.dir), linkPath);
    linkedCount += 1;
  }
}
console.log(`flatten-standalone: added ${linkedCount} missing top-level node_modules symlink(s).`);

// Standalone output never includes static assets or public/ — Next's own
// docs require copying these in manually (see
// https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
// Same remove-before-copy reasoning as above applies here too.
const staticDest = path.join(standaloneDir, '.next', 'static');
rmSync(staticDest, { recursive: true, force: true });
cpSync(path.join(appDir, '.next', 'static'), staticDest, { recursive: true });

const publicDir = path.join(appDir, 'public');
if (existsSync(publicDir)) {
  const publicDest = path.join(standaloneDir, 'public');
  rmSync(publicDest, { recursive: true, force: true });
  cpSync(publicDir, publicDest, { recursive: true });
}

console.log('flatten-standalone: done — .next/standalone/server.js is now self-contained.');
