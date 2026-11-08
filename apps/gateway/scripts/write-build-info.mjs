#!/usr/bin/env node
// Same pattern as apps/admin and apps/learn's own write-build-info.mjs —
// see those files' comments for the full rationale (a real incident where
// a migration ran against the stale pre-swap server). This app has no
// migrate route of its own, but keeping the same build-info.json
// convention lets a future deploy workflow for this app poll it the same
// way deploy-admin.yml/deploy-lms.yml already do.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(scriptDir, '..');
const publicDir = path.join(appDir, 'public');

function resolveSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: appDir }).toString().trim();
  } catch {
    return null;
  }
}

const sha = resolveSha();
if (!sha) {
  console.log('write-build-info: could not resolve a git SHA — skipping public/build-info.json.');
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, 'build-info.json'), JSON.stringify({ sha, builtAt: new Date().toISOString() }) + '\n');
console.log(`write-build-info: wrote public/build-info.json (sha=${sha})`);
