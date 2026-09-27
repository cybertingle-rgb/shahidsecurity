# Learn with Shahid — Cybersecurity Roadmap Content Spec

**Status:** proposal — content structure and data model, not yet built. Backed by `roadmap_stages` / `roadmap_stage_resources` in `lms-database.md`, rendered as a static, SEO-indexable page at `/learn/roadmap` on the existing site (per `lms-architecture.md` §3), with its data authored in the LMS admin and synced the same way course marketing data is.

## Framing (this matters as much as the content)

The roadmap is a **map, not a mandate**. Every version of this page must say so explicitly, near the top, in plain language — something like: *"This shows one common path through cybersecurity, not the only one. Depending on your background, you may already have several of these skills, want to specialise earlier, or take a different order entirely. Prerequisites are noted where they genuinely matter; everything else is a suggestion."* This isn't just an ethical nicety — a roadmap that implies a rigid 18-step gate before someone can touch penetration testing will actively discourage exactly the "career changers" and "IT professionals" the brief names as target audiences, many of whom already have networking or Linux experience and shouldn't be told to start at Level 1.

## The 18 stages, as data (not hardcoded markup)

Each stage is a `roadmap_stages` row: `level_number`, `title`, `description`, `prerequisites_text` (free text — "helpful but not required," or "genuinely needed before this one," stated per-stage rather than assumed uniformly), `is_required` (whether skipping it is realistic for someone with equivalent prior experience), `sort_order`.

1. IT & Computer Fundamentals
2. Networking Fundamentals
3. Linux
4. Windows & Active Directory
5. Cybersecurity Fundamentals
6. Security Operations / SOC
7. SIEM & Log Analysis
8. Threat Detection
9. Incident Response
10. Vulnerability Assessment
11. Web Application Security
12. Penetration Testing
13. Cloud Security
14. Threat Intelligence
15. Digital Forensics
16. Red Team / Advanced Security
17. Security Research
18. Career Preparation

Stored as data specifically so admin can reorder, rename, split, merge, or add stages from `/admin/settings` (roadmap section) without a code deploy — the brief is explicit that "admin must be able to edit roadmap stages from the admin panel," and hardcoding this list in a component would violate that directly.

## What each stage links to

Every stage can carry a list of `roadmap_stage_resources` — a mix of:
- **Free resources** (articles, tool lists, external guides) — `resources` table rows.
- **Blog articles** on the existing site — stored as a `{type: 'blog', url, label}` entry (see `lms-database.md`'s note on why this is `jsonb` rather than a foreign key: blog posts live in the marketing site's own content collection, a different codebase).
- **Courses** — a real foreign key to `courses`, once a course covering that stage exists. **A stage with no course yet simply shows free resources and no course card** — never a placeholder "coming soon" course, which would misrepresent the catalog.
- **Labs, videos, tools** — same `resources` mechanism, typed accordingly.

This is exactly the linking chain requested in the brief (roadmap → SOC Analyst course, networking roadmap → Network Security course, web security stage → Web Application Security course, pentest stage → Penetration Testing course/article) and it composes naturally with the internal-linking work already done this session — e.g. Stage 11 (Web Application Security) can point to the existing [`/blog/api-security-best-practices/`](/blog/api-security-best-practices/) and [`/blog/owasp-top-10-2025-explained/`](/blog/owasp-top-10-2025-explained/) articles today, before a single course exists, so the page has genuine value from day one rather than waiting on the course catalog.

## `/learn/resources` — the SEO content hub

A second, related surface: an index of the same free-resource content (career guides, tool lists, interview prep, path-specific roadmaps like "SOC Analyst roadmap" or "Penetration Testing roadmap" as their own focused pages) that both stands alone for search traffic and feeds into the main roadmap's per-stage links. This is where genuinely new long-form content lives — the roadmap page itself stays a structured, scannable map; `/learn/resources` is where a "Cybersecurity Career Guide"-length article belongs.

## Visual design note

Brief asks for "beautiful interactive" — concretely, this should reuse the existing site's visual language (glass cards, corner-bracket motif, terminal green accents, the `// 01 SECTION` eyebrow style already used throughout `shahidiqbal.com`) rather than introduce a new, unrelated visual system — the same design-continuity principle from `lms-architecture.md` §5 applies here specifically because the roadmap is one of the pages living *on* the existing static site, not the separate app.
