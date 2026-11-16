# File Storage Restoration Guide

Full depth: manual §1.5 (File and media storage architecture), §7.5 (Restoring uploaded files and media).

## The one fact this entire document exists to state clearly

**There is no separate "uploads folder" in this architecture, and therefore no separate file-storage restoration procedure.** Every uploaded file's bytes live inside the `media` table's `data` column in the admin database — a MySQL `LONGBLOB`, up to 4GB per row — not on any filesystem.

This was a deliberate design decision, not an oversight: a local-disk upload directory was tried first, but Hostinger's actual deploy mechanism replaces the *entire* app directory (not just the build output) with a fresh versioned copy on every deploy. Anything written to local disk during one deployment is gone by the next. This caused a real incident — uploaded course thumbnails vanishing after a routine deploy — which is why the storage model was changed to put file bytes in the database, the one thing the deploy pipeline never touches.

## What this means for restoration

**Restoring the database (`DATABASE_RESTORATION_GUIDE.md`) restores every uploaded file along with it.** There is no step 2. If you find yourself writing a script to copy files from a filesystem path as part of a restoration, stop — that script has nothing to operate on in this architecture, and its absence is correct, not a gap.

## Upload validation rules (for context, not restoration)

- MIME-type allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf` only. SVG is deliberately excluded — it can carry embedded script and is an XSS vector.
- 10MB cap per file.
- Stored filename is always `<uuid><allowlisted-extension>` — the browser-supplied filename and MIME type are never trusted, which closes the classic "upload shell.php.jpg" bypass at the source.

## If a file genuinely appears missing (not a restoration scenario)

Check the `media` table record first. A filesystem-based fix will never find anything, because nothing is ever written to a filesystem by design (manual §8, troubleshooting table).
