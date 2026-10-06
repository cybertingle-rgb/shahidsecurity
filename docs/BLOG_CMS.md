# Blog CMS

## What it does

Draft → scheduled → published workflow for `blog_posts`, with tags
(`blog_tags`/`blog_post_tags`, created on the fly from a comma-separated
input, reused by slug so "Cloud Security" and "cloud security" don't
create duplicates) and FAQs (`blog_post_faqs`, parsed from a simple
`Q: ...\nA: ...` block format).

Field shape deliberately mirrors the Astro site's existing blog content
collection schema (`src/content.config.ts`) — title, description, tags,
`relatedServiceSlug`, FAQs — so an approved post here is a drop-in match
for that `.mdx` frontmatter shape, not a diverging format.

## Scheduling needs an external cron

This app has no long-running background process of its own — it's a
request-driven Next.js server. Scheduling a post sets its status and
`scheduled_for` time correctly (verified), but nothing flips it to
`published` on its own. `/api/internal/publish-scheduled` is a
secret-gated sweep endpoint that does that flip when called — set up
Hostinger hPanel's **Cron Jobs** feature to curl it every ~15 minutes:

```
curl -X POST https://admin.shahidiqbal.com/api/internal/publish-scheduled \
  -H "x-publish-secret: <PUBLISH_SCHEDULED_SECRET>"
```

Verified live: a post scheduled for a past time was correctly flipped
to `published` (with `published_at` set) when this endpoint was called,
and a wrong secret got a 403 with no mutation.

## Deleting vs. unpublishing

Only a draft that was never published can be hard-deleted. A published
post goes back to draft (unpublish) instead — per the brief's
archive-over-delete rule for anything with a historical/indexed
footprint.

## Not yet built

- Publishing a post here doesn't generate the actual `.mdx` file on the
  Astro site — that export/sync step isn't built. This is the content
  *system of record*, not yet a publishing pipeline to the static site.
- Categories (`blog_categories`) exist in the schema with a
  `listCategories()` helper but no CRUD UI yet — not required for any
  of the posts actually drafted so far.
