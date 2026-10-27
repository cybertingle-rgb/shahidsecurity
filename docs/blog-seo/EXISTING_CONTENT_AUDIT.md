# Existing Content Audit

**Date:** 2026-10-27
**Scope:** Full inventory of `src/content/blog/` (41 posts, all `draft: false`, all live) ahead of adding a new batch of articles, plus the 10 service pages new articles may link to.

## 1. Method

Read every post's frontmatter directly (`title`, `publishedAt`, `tags`, `relatedService`) rather than relying on memory or a prior report, since this is a new session and content has changed since the last batch (10 posts were added 2026-10-24). Grouped by topic cluster below. Checked for **semantic** overlap, not just identical titles — e.g. an "AI agent security" post and a hypothetical "securing autonomous AI agents" post would count as the same topic even with different titles.

## 2. Full inventory (41 posts)

| Slug | Published | Cluster |
|---|---|---|
| wordpress-hacked-checklist | 2026-01-01 | Incident response / CMS |
| patch-management-cisa-kev-guide | 2026-09-26 | Vulnerability mgmt |
| iot-security-nist-guidance-2026 | 2026-09-26 | IoT |
| ai-security-risks-for-business | 2026-09-26 | AI (general risk) |
| api-security-best-practices | 2026-09-26 | AppSec |
| business-email-compromise-2026 | 2026-09-26 | Email / social engineering |
| gcc-cybersecurity-compliance-sama-nesa | 2026-09-26 | Compliance (GCC) |
| owasp-top-10-2025-explained | 2026-09-26 | AppSec |
| ransomware-2026-trends | 2026-09-26 | Ransomware (trends) |
| software-supply-chain-attacks-2026 | 2026-09-26 | Supply chain |
| cloud-misconfiguration-data-breaches | 2026-09-26 | Cloud |
| ai-agent-security | 2026-10-06 | AI (agents) |
| cloud-token-theft | 2026-10-06 | Cloud / identity |
| cyber-resilience-vs-cybersecurity | 2026-10-06 | Strategy |
| ai-application-security-checklist | 2026-10-06 | AI (AppSec checklist) |
| deepfake-attacks-business-defense | 2026-10-06 | AI / social engineering |
| living-off-the-cloud-attacks | 2026-10-06 | Cloud / threat detection |
| prompt-injection-attacks-explained | 2026-10-06 | AI (LLM attack technique) |
| shadow-ai-security-risks | 2026-10-06 | AI (unapproved tool use) |
| software-supply-chain-security | 2026-10-06 | Supply chain |
| vulnerability-exploitation-leading-breach-cause-2026 | 2026-10-06 | Vulnerability mgmt |
| ai-model-supply-chain-security | 2026-10-17 | AI (model provenance) |
| ai-red-teaming-llm-security-testing | 2026-10-17 | AI (testing) |
| ai-generated-malware-threat | 2026-10-17 | AI (offensive use) |
| agentic-ai-browser-security-risks | 2026-10-17 | AI (browsers) |
| agentic-soc-ai-security-operations | 2026-10-17 | AI (SOC/ops) |
| cyber-insurance-requirements-2026 | 2026-10-17 | Business / insurance |
| non-human-identity-security | 2026-10-17 | Identity (machine) |
| passkeys-vs-passwords-2026 | 2026-10-17 | Identity (human auth) |
| post-quantum-cryptography-migration-guide | 2026-10-17 | Cryptography |
| zero-trust-architecture-smb-guide | 2026-10-17 | Architecture |
| vulnerability-prioritization-real-world-risk | 2026-10-24 | Vulnerability mgmt |
| cve-2026-115560-php-session-upload-progress | 2026-10-24 | CVE (PHP) |
| cyber-threat-intelligence-smb-guide | 2026-10-24 | Threat intel |
| email-authentication-spf-dkim-dmarc-guide | 2026-10-24 | Email auth |
| identity-access-management-least-privilege-guide | 2026-10-24 | Identity (IAM) |
| php2shell-critical-php-vulnerabilities-cve-2026-109618-109619 | 2026-10-24 | CVE (PHP) |
| ransomware-readiness-backup-recovery-guide | 2026-10-24 | Ransomware (recovery) |
| secure-code-review-sast-dast-manual-testing | 2026-10-24 | AppSec (code review) |
| third-party-vendor-risk-management-smb | 2026-10-24 | Vendor risk |
| web-application-security-testing-checklist-2026 | 2026-10-24 | AppSec (testing) |

## 3. Topic clusters already well-covered (avoid)

- **AI/LLM security — 10 posts already.** Agents, prompt injection, shadow AI, model supply chain, red teaming, AI-generated malware, agentic browsers, agentic SOC, AI app security checklist, general AI business risk. This is the single most saturated cluster on the site. Any new AI topic must be a clearly distinct angle not covered by these 10.
- **Supply chain security — 2 posts** (general + npm-specific).
- **Cloud security — 3 posts** (misconfiguration, token theft, living-off-the-cloud).
- **Identity — 3 posts** (non-human identity, passkeys, IAM/least privilege).
- **PHP CVEs — 2 posts**, both from the same disclosure window (PHP2Shell + the follow-on session-upload-progress flaw).
- **Vulnerability management — 3 posts** (CISA KEV, exploitation-as-top-breach-cause, CVSS-vs-real-world prioritization).
- **Ransomware — 2 posts** (trends + backup/recovery readiness).

## 4. Gaps identified (candidate space for this batch)

No existing post covers: DNS security, container/Kubernetes security, secrets/credential management for developers, attack surface management, e-commerce-specific security (card skimming/Magecart), AI coding assistants (Copilot-class tools) as a distinct risk from AI agents/apps, a practical AI acceptable-use policy guide, insider threats, a worked incident walkthrough/case-study-style piece, or business continuity/disaster recovery as a general discipline (the existing ransomware-readiness post is ransomware-specific, not general BC/DR with RTO/RPO).

These gaps map well to services with **no dedicated blog post currently linking to them**: `vulnerability-assessment` (has posts touching it tangentially but none centered on attack-surface discovery), `secure-website-development` (no post addresses e-commerce-specific risk), `monitoring-training` (no post on insider threats), `compliance-risk-assessment` (GCC compliance post exists, but no general AI-policy or governance piece).

## 5. Existing drafts

**Correction from an earlier pass of this audit:** running the actual check (`grep -l "draft: true" src/content/blog/*.mdx`) rather than assuming finds **one** draft: `wordpress-hacked-checklist.mdx`. Its body text is explicit that it's a seed/placeholder ("This is a sample draft post seeded to demonstrate the blog collection... will not appear on `/blog/` or in the RSS feed until a real article replaces this content"). So the true live count is **40 published posts**, not 41. This post is excluded from all new-article `relatedPosts` links in this batch, since linking to it from a live page would produce a dead link on the published site (the post route isn't generated while `draft: true`).

## 6. Sitemap / internal-link structure

`@astrojs/sitemap` generates the sitemap from the actual build, so no manual sitemap maintenance is needed for new posts. Each post's discoverability today comes from: the `/blog/` index (auto-lists all non-draft posts), tag pages, and `relatedPosts` cross-links from other posts' frontmatter. New posts need at least one inbound `relatedPosts` link from an existing post to avoid being orphaned (reachable only from the index/tag pages, not from contextual in-article links) — this is the same pattern used in the prior batch.

## 7. Conclusion

10 genuinely new topics selected for this batch (documented in `TOPIC_RESEARCH_AND_SELECTION.md`) all sit in confirmed gaps relative to this audit. No existing valuable article was replaced or deleted.
