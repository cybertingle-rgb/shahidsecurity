# AI assistant (Luna) knowledge workflow

## What this actually is today

Luna (apps/learn) is, by its own code comment, a deliberately scoped V1: a
single hand-curated static system prompt plus a small local FAQ fast-path —
not a RAG pipeline reading from any database. This phase adds two real,
working pieces around that without changing Luna's own answering logic:

1. **A logged-question pipeline.** Every time a visitor's message falls
   through Luna's local FAQ fast-path (`matchLunaFaq` returns null) and
   gets a real Claude-generated answer, apps/learn best-effort posts the
   question text to apps/admin's `/api/public/ai-questions-intake`. This
   is the one reliable, non-fragile signal available without inspecting
   Claude's own output text: "the curated instant-answer set didn't cover
   this." Verified live end-to-end: a real cross-app HTTPS call from
   apps/learn's intake helper landed a real row in apps/admin's
   `ai_questions` table, visible and markable-reviewed in the admin UI.
2. **A knowledge-source draft/approve workflow** (`ai_knowledge_sources`)
   in apps/admin, so an admin can turn a logged question into a reviewed,
   approved fact — verified live (create → approve, confirmed in MySQL).

## What's NOT yet wired, and why

**Approving a knowledge source here does not yet change what Luna says.**
Luna's system prompt lives as a TypeScript constant in apps/learn
(`src/lib/luna.ts`) — making an admin-approved fact actually reach it
requires apps/learn to fetch approved sources from apps/admin (at request
time or build time) and splice them into the prompt, which is not built.
This is the same category of gap as the SEO control center's "stored
correctly, not yet wired to the live site" — stated here directly rather
than left implicit.

## Failure mode

The question-logging call is fire-and-forget with a 3-second timeout, and
every error is caught and logged, never thrown. If apps/admin is down,
unreachable, or `ADMIN_AI_QUESTIONS_INTAKE_URL`/`_SECRET` are unset (the
default), Luna answers exactly as before — nothing about the visitor's
chat experience depends on this pipeline.

## Required environment variables

**apps/admin**: `AI_QUESTIONS_INTAKE_SECRET`

**apps/learn**: `ADMIN_AI_QUESTIONS_INTAKE_URL`, `ADMIN_AI_QUESTIONS_INTAKE_SECRET`
(same secret value as above)

Both unset by default; nothing in this pipeline activates without them.

## Media library

A separate, unrelated piece of this phase: apps/admin now has a working
media library (`/dashboard/media`) — upload, list, delete — for images and
PDFs used across the admin's own content (blog covers, service icons).

Validation, verified live against both a real PNG (accepted, correctly
stored under a UUID filename with the real extension) and a real PHP
payload (correctly rejected by its real content-type):

- MIME-type allowlist: JPEG, PNG, WebP, GIF, PDF only — no SVG (can carry
  embedded script) and no executable/script type.
- 10MB size limit.
- The browser-supplied original filename is never used as the stored
  path — every file is written as `<uuid>.<allowlisted-extension>`, and
  the serving route (`/api/media/[id]`) always sends the Content-Type
  recorded in the database, not one re-derived from the uploaded
  filename or re-sniffed from the file's bytes.

**Known, honest limitation**: MIME-type allowlisting checks the
browser-reported `Content-Type` header, which an attacker controls — it
is not content-sniffing. A forged `image/png` header on real PHP bytes
would be accepted and stored. What actually neutralizes that case, also
verified: this app has no PHP runtime at all (it's a Next.js/Node
process, unlike the Astro site's PHP form handlers, which are a
completely separate deployment), and the serving route always serves
the database-recorded Content-Type, so such a file is returned as inert
bytes labeled `image/png`, never executed. True content-sniffing
(checking actual file-header magic bytes against the claimed type)
would close this more completely and is a reasonable follow-up, not
added now to avoid pulling in an unverified new dependency for it.
