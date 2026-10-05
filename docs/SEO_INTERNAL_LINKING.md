# Internal Linking Strategy

Documents what's actually wired up, verified by reading the real frontmatter/components rather than assumed.

## Within shahidiqbal.com

- **Blog → Service**: every blog post's frontmatter carries `relatedService` (e.g. `owasp-top-10-2025-explained.mdx` → `relatedService: penetration-testing`), rendered as a link from the article to the relevant service page.
- **Blog → Blog**: `relatedPosts` frontmatter (e.g. the same article links to `api-security-best-practices` and `software-supply-chain-attacks-2026`) — a short, curated list per article, not an auto-generated "similar posts" grab-bag.
- **Service → Blog**: service pages render a "related articles" block pulling in posts whose `relatedService` points back at them (added in an earlier session phase — "Add related-articles links to service pages").
- **Case Study → Service**: the IoT Smart Campus case study links to the relevant service pages (network security, IoT-adjacent offerings).
- **Homepage → Service, Homepage → Learn**: the homepage links to the services index and to the Learn with Shahid section/pages.
- **`/learn` (guide page) → Learn with Shahid app**: as of this audit, this page's "Course catalog" button now points directly at `https://learn.shahidiqbal.com/courses` (the real, live, dynamic catalog) rather than the removed static snapshot page — one hop saved, no redirect in the path.

## Within learn.shahidiqbal.com

- **Homepage → Course catalog, Course catalog → Course detail**: standard discovery path, all server-rendered with real published-course data (`listCatalogCourses()`), never hardcoded.
- **Course detail → "All courses"**: back-link on every course page.
- **Course detail → Related courses**: not yet implemented — flagged as a gap below.
- **Dashboard nav → Browse Courses**: logged-in students can reach the public catalog from inside the authenticated dashboard nav (added earlier this session specifically so browsing isn't dashboard-only).

## Between the two properties

| From | To | Anchor/context |
|---|---|---|
| `shahidiqbal.com` homepage | `learn.shahidiqbal.com` | Learn with Shahid section |
| `shahidiqbal.com/learn` (guide page) | `learn.shahidiqbal.com/courses` | "Course catalog" button |
| `shahidiqbal.com/learn/roadmap`, `/learn/pricing` | `learn.shahidiqbal.com` | enrollment/register CTAs |
| `learn.shahidiqbal.com` homepage footer | `shahidiqbal.com` | "Learn with Shahid is the education arm of Shahid Security" |
| `learn.shahidiqbal.com` homepage nav | `shahidiqbal.com/learn/roadmap`, `/about`, `/contact` | "Learning Roadmap", "About", "Contact" links |
| Course detail pages (JSON-LD) | `shahidiqbal.com` | `provider` field in `Course` structured data |

This cross-linking is intentional and kept minimal — enough for a crawler (and a visitor) to understand the two properties are related and for link equity to flow both directions, without either site existing solely to funnel the other (which would read as a manipulative link scheme rather than genuine site architecture).

## Anchor text policy

Checked across the pages read during this audit: anchor text is descriptive ("Course catalog", "Learning Roadmap", a blog post's actual title) rather than generic "click here" / "read more" patterns. No changes needed here.

## Gaps identified

- **Course detail → Related courses**: `getPublicCourseBySlug` doesn't currently surface related courses (by category or instructor), and the detail page has no "related courses" section. Low priority while the catalog is small (a handful of real courses), but worth building once there are enough courses in a category for "related" to mean something — forcing it now with too few courses would just show the same 1-2 courses on every page, which isn't genuinely useful.
- **Industry → Service, Service → Industry**: can't be built yet since individual industry pages don't exist (see `SEO_KEYWORD_MAP.md`'s gap list) — only the `/industries/` index exists today.
- **Article → Course** (Learn with Shahid → its own blog-equivalent content): Learn with Shahid doesn't yet have its own article/blog surface distinct from the roadmap and course pages, so this link type from `SEO_CONTENT_STRATEGY.md`'s Learn article ideas doesn't have a home yet — would need scoping once (if) that content gets built.
