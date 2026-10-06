# Rollback (public-site content publishes)

See `docs/CONTENT_PUBLISHING.md` for the full publish flow this is part
of. This doc covers only what rolling back actually does.

## Status: Implemented (blog posts), not yet built (SEO overrides)

## How it works

A "publish" is a real git commit on the deploy branch. Rolling back a
specific publication (`src/lib/publish/blogPublish.ts`'s
`rollbackBlogPublication`) does not rewrite git history or force-push —
it:

1. Reads the file's exact content as it existed at the commit
   immediately **before** that publication's own commit
   (`previousCommitSha`, recorded at publish time).
2. Commits that historical content again, as a brand-new commit.
3. Records this as its own new row in `publications` (status
   `building` → `published`/`failed`, same as any publish), not a
   mutation of the original row — so the publish history shows both the
   original publish and the rollback as separate, equally real events.
4. The new commit flows through the exact same
   `.github/workflows/deploy.yml` build-then-deploy pipeline as any
   other publish. The previous production build stays live and
   untouched until that workflow run finishes — a rollback is exactly
   as safe (or risky) as any other publish, no more and no less, since
   it's the identical mechanism.

Guarded against a real mistake found during this phase's own security
review: rollback first checks that the publication being rolled back is
actually a `blog_post` (not an `seo_page`) before building a blog file
path from it — see the commit fixing this for the full reasoning.

## What's not built yet

**SEO override rollback.** `seoPublish.ts`'s publish action records
`previousCommitSha` the same way blog posts do, so the data needed for a
rollback already exists — but no `rollbackSeoPublication` function or UI
button exists yet to use it. A failed or unwanted SEO override publish
currently has to be corrected by publishing a new, corrected override
(which is itself safe and auditable), not by a one-click revert.

## What a rollback does **not** do

It never touches the admin's own database content (the blog post's
title/body/etc., or the SEO override's fields) — only the file committed
to the public site's repo. If the admin-side content was also edited
incorrectly, that still needs a manual edit in the CMS; rolling back only
un-does what's live on the public site.
