# SEO Validation Report

**Date:** 2026-10-27
**Scope:** shahidiqbal.com (repo root), 10 new blog posts + 18 reciprocal-link edits to existing posts.

## 1. Commands run and exact results

```
$ pnpm astro check
Result (67 files):
- 0 errors
- 0 warnings
- 1 hint   (pre-existing eslint.config.js deprecation warning, unrelated to this batch)
```

```
$ pnpm build
✓ 151 page(s) built (up from 118 before this batch — +10 blog posts, plus their tag-index and sitemap contribution)
```

```
$ ls src/content/blog/*.mdx | wc -l
→ 51 (41 pre-existing + 10 new — confirms no filename collisions)
```

```
$ grep -l "wordpress-hacked-checklist" src/content/blog/*.mdx   (draft/dead-link check)
→ found and fixed 3 instances: 2 in newly-written articles (anatomy-of-a-website-compromise-case-study,
  ecommerce-security-skimming-fraud-guide) and 1 pre-existing instance in web-application-security-testing-checklist-2026
  that predates this batch. All 3 corrected to link to a live post instead.
```

```
$ for f in dist/blog/*/index.html; do grep -o '<title>...' $f; done | sort | uniq -d
→ zero duplicate titles across all 51 live blog pages
```

```
$ for f in dist/blog/*/index.html; do grep -o 'meta name="description"...' $f; done | sort | uniq -d
→ zero duplicate meta descriptions across all 51 live blog pages
```

```
$ node -e "... JSON.parse each <script type=application/ld+json> block ..." for each of the 10 new posts
→ all 10 posts: valid JSON, 6 script blocks each, 0 parse errors
```

```
$ grep "blog/<slug>/" dist/sitemap-0.xml for each of the 10 new slugs
→ all 10 present in the generated sitemap
```

```
$ grep "<slug>" dist/rss.xml for each of the 10 new slugs
→ all 10 present in the RSS feed (src/pages/rss.xml.ts has no item limit — includes every non-draft post, sorted by publishedAt descending)
```

```
$ grep -rliE "6234126|whatsapp" dist/
→ zero matches (built output, full site)
```

```
$ grep -ilE "6234126|whatsapp" <each of the 10 new .mdx source files>
→ zero matches
```

```
$ grep -o '<link rel="canonical"...>' on a sample new page
→ https://shahidiqbal.com/blog/dns-security-spoofing-hijacking-prevention-guide/  (correct, matches live.site.ts absoluteUrl() convention)
```

## 2. relatedPosts / relatedService integrity check

Every `relatedPosts` entry across all 10 new articles and all 18 edited existing articles was programmatically checked against the actual file list: confirmed every referenced slug (a) exists as a real `.mdx` file and (b) is not `draft: true`. Every `relatedService` value was checked against the actual 10 service slugs in `src/content/services/`. Zero broken references after the wordpress-hacked-checklist fix described in §1.

## 3. Draft vs. published

`grep -l "draft: true" src/content/blog/*.mdx` → exactly one file, `wordpress-hacked-checklist.mdx` (a pre-existing seeded placeholder, confirmed by its own body text, not something this batch created or modified). All 10 new posts are `draft: false` and confirmed present in the build output; the one draft is confirmed absent from `dist/blog/`.

## 4. Content-integrity checks (manual, this session)

- No invented CVEs, statistics, or vendor claims — every factual claim traces to a source in `CONTENT_SOURCE_REGISTER.md`.
- Where sources disagreed (insider-threat stat splits, AI-code-vulnerability percentages, a Magecart "103%" figure), the relevant articles present the range and flag the disagreement rather than citing one number as settled fact — spot-checked directly in `insider-threat-detection-prevention-guide.mdx` and confirmed present.
- `anatomy-of-a-website-compromise-case-study.mdx` explicitly labels itself illustrative/hypothetical in the frontmatter FAQ, the opening paragraph, and the closing line — spot-checked directly, confirmed present in all three places.
- No phone number or WhatsApp reference in any of the 10 new posts or the 18 edited files (grep-verified, §1).
- All CTAs use `info@shahidiqbal.com` (implicitly, via `/book/` and the existing contact flow) — no new contact channel was introduced.

## 5. Word counts (honest accounting)

| Slug | Body word count |
|---|---|
| dns-security-spoofing-hijacking-prevention-guide | 1,019 |
| container-kubernetes-security-fundamentals | 952 |
| secrets-management-api-keys-credentials-guide | 914 |
| attack-surface-management-guide | 1,025 |
| ecommerce-security-skimming-fraud-guide | 1,017 |
| ai-coding-assistants-security-review-guide | 1,204 |
| ai-acceptable-use-policy-business-guide | 986 |
| insider-threat-detection-prevention-guide | 1,043 |
| anatomy-of-a-website-compromise-case-study | 1,111 |
| business-continuity-disaster-recovery-planning-guide | 1,179 |

**All 10 ran under the brief's 1,200–2,000-word editorial target** (9 of 10 below 1,200; one at 1,204). This was a deliberate trade-off, not an oversight: each article was read in full during this validation pass and judged to cover its topic completely — checklist, FAQs, key takeaways, and a working example or framework — without padding. The brief itself states word count is "an editorial target, not a ranking requirement" and explicitly prohibits "filler simply to increase length." Given that explicit instruction, shorter-but-complete was chosen over padded-to-spec. This is disclosed here rather than the word counts being silently rounded up or hidden.

## 6. What could NOT be validated this session (honest gaps)

| Check requested in the brief | Status |
|---|---|
| Live-site crawl of the deployed shahidiqbal.com | **Not possible** — no outbound network access to the production domain from this sandboxed session (confirmed via repeated connection failures earlier in this session). Everything above validates the *build output*, which is what will be deployed, not the currently-live site. |
| Core Web Vitals / PageSpeed / Lighthouse | **Not run** — no such tooling in this session. Manual action: run PageSpeed Insights against the new URLs after deployment. |
| Search Console baseline | **Not available** — no account access in this session. Manual action: export Performance data before and ~4-6 weeks after these posts go live. |
| Google Rich Results Test against live JSON-LD | **Not run against the live site** — this report validates JSON *syntax* in the build output (§1), not Google's acceptance of it. Manual action: test a live URL after deployment. |
| Broken internal/external link check across the whole pre-existing site | **Not run as a full site-wide crawl** — this batch's own new links and edited files were checked (§2); a crawl of unrelated pre-existing content was out of scope. |
| Phone-number privacy scan on generated output | **Run** — see §1; zero matches, and no raw number appears in this report either (not applicable here since no phone content exists anywhere in this batch to redact). |

## 7. Conclusion

Every check this session had the tooling to run came back clean: schema-valid content, zero phone/WhatsApp references, zero duplicate titles/descriptions, valid JSON-LD, correct sitemap and RSS coverage, no slug collisions, no broken internal references, no fabricated facts. One real bug was found and fixed (3 dead links to a draft placeholder post, one of which pre-dated this batch). The live-performance-data gaps above require account or network access this session does not have and are listed as owner follow-up items, not claimed as done.
