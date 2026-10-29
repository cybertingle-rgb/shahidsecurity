#!/usr/bin/env node
// Writes public/build-info.json with the git commit SHA being built,
// so a deploy pipeline can tell "the new code is actually live" apart
// from "the old code is still answering requests" — the two looked
// identical from the outside before this existed.
//
// Why this exists: Hostinger's own Git-connected pipeline builds and
// swaps this app in asynchronously, on its own schedule, completely
// decoupled from deploy-lms.yml's GitHub Actions job (same push event,
// no shared signal). That workflow's migrate step used to fire its
// first request immediately — and on at least one real deploy
// (the same commit, run 40789899956) it got a 200 "Migrations
// complete" back on the very first attempt, in under a second, which
// is the signature of hitting the OLD, not-yet-replaced server: the
// NEW migration file for that commit didn't exist on disk yet for the
// migrate route to find and run, so "success" was actually a silent
// no-op. The app's new code (querying products.thumbnail_url
// unconditionally on the homepage) went live moments later against a
// database that never actually got that column — a believable, if
// unconfirmed without direct DB access, explanation for a
// Server-Components-render crash (React minified error #441, whose
// real text — decoded from react-dom's own error-codes map — is
// exactly "An error occurred in the Server Components render... the
// digest property may provide more detail" — i.e. "look at the
// server's real error", not a specific bug on its own).
//
// deploy-lms.yml now polls GET /build-info.json and waits for its sha
// to match the commit actually being deployed before ever calling
// /api/internal/migrate — turning this race into a deterministic
// wait instead of a guess. Served as a plain static file (this host's
// Apache/Passenger layer serves public/ directly, confirmed elsewhere
// in this app), so polling it costs nothing extra and needs no new
// route or auth.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(scriptDir, '..');
const publicDir = path.join(appDir, 'public');

function resolveSha() {
  // GITHUB_SHA covers the (unused for this app's real deploy, but
  // harmless to check) case of building inside a GitHub Actions
  // runner; git covers Hostinger's actual git-clone-based build.
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: appDir }).toString().trim();
  } catch {
    return null;
  }
}

const sha = resolveSha();
if (!sha) {
  // Never fail the build over this — worst case, the deploy
  // workflow's poll for a matching sha times out and falls back to
  // migrating immediately (same behavior as before this existed).
  console.log('write-build-info: could not resolve a git SHA — skipping public/build-info.json.');
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, 'build-info.json'), JSON.stringify({ sha, builtAt: new Date().toISOString() }) + '\n');
console.log(`write-build-info: wrote public/build-info.json (sha=${sha})`);
