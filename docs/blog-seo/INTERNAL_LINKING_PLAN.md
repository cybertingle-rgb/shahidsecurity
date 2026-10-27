# Internal Linking Plan

**Date:** 2026-10-27. Lists the actual links added or already present — not aspirational, all verified against the files on disk after the build.

## 1. Outbound links from each new article

Every new article links to its `relatedService` page (`/services/<slug>/`) at least once in body text (the "Shahid Security's [Service Name](...)" sentence near the end), plus a `/book/` CTA, plus 2-3 `relatedPosts` entries that render as a related-reading block on the page.

| New article | Service link | relatedPosts (existing + new) |
|---|---|---|
| `dns-security-spoofing-hijacking-prevention-guide` | `/services/network-cloud-security/` | `email-authentication-spf-dkim-dmarc-guide`, `business-email-compromise-2026` |
| `container-kubernetes-security-fundamentals` | `/services/network-cloud-security/` | `cloud-misconfiguration-data-breaches`, `software-supply-chain-security` |
| `secrets-management-api-keys-credentials-guide` | `/services/custom-software-development/` | `non-human-identity-security`, `secure-code-review-sast-dast-manual-testing`, `container-kubernetes-security-fundamentals` |
| `attack-surface-management-guide` | `/services/vulnerability-assessment/` | `vulnerability-prioritization-real-world-risk`, `web-application-security-testing-checklist-2026` |
| `ecommerce-security-skimming-fraud-guide` | `/services/secure-website-development/` | `web-application-security-testing-checklist-2026`, `third-party-vendor-risk-management-smb` |
| `ai-coding-assistants-security-review-guide` | `/services/custom-software-development/` | `secure-code-review-sast-dast-manual-testing`, `ai-generated-malware-threat` |
| `ai-acceptable-use-policy-business-guide` | `/services/compliance-risk-assessment/` | `shadow-ai-security-risks`, `ai-security-risks-for-business` |
| `insider-threat-detection-prevention-guide` | `/services/monitoring-training/` | `non-human-identity-security`, `cyber-insurance-requirements-2026` |
| `anatomy-of-a-website-compromise-case-study` | `/services/incident-response/` | `vulnerability-exploitation-leading-breach-cause-2026`, `patch-management-cisa-kev-guide`, `attack-surface-management-guide` |
| `business-continuity-disaster-recovery-planning-guide` | `/services/incident-response/` | `ransomware-readiness-backup-recovery-guide`, `cyber-resilience-vs-cybersecurity` |

Several articles also link to each other in-body where contextually natural (confirmed in the written files, not just planned): `anatomy-of-a-website-compromise-case-study` links inline to `attack-surface-management-guide`, `patch-management-cisa-kev-guide` (existing), and `ecommerce-security-skimming-fraud-guide` at the relevant stage of the walkthrough.

## 2. Inbound links added to existing posts (reciprocal — prevents orphan pages)

18 existing posts were edited to add a reciprocal `relatedPosts` entry pointing at the relevant new article(s), so every one of the 10 new posts has at least one inbound contextual link in addition to the blog index/tag pages:

| Existing post edited | New slug(s) added |
|---|---|
| `email-authentication-spf-dkim-dmarc-guide` | `dns-security-spoofing-hijacking-prevention-guide` |
| `business-email-compromise-2026` | `dns-security-spoofing-hijacking-prevention-guide` |
| `cloud-misconfiguration-data-breaches` | `container-kubernetes-security-fundamentals` |
| `software-supply-chain-security` | `container-kubernetes-security-fundamentals` |
| `non-human-identity-security` | `secrets-management-api-keys-credentials-guide`, `insider-threat-detection-prevention-guide` |
| `passkeys-vs-passwords-2026` | `secrets-management-api-keys-credentials-guide` |
| `vulnerability-prioritization-real-world-risk` | `attack-surface-management-guide` |
| `web-application-security-testing-checklist-2026` | `attack-surface-management-guide`, `ecommerce-security-skimming-fraud-guide` |
| `third-party-vendor-risk-management-smb` | `ecommerce-security-skimming-fraud-guide` |
| `secure-code-review-sast-dast-manual-testing` | `ai-coding-assistants-security-review-guide` |
| `ai-generated-malware-threat` | `ai-coding-assistants-security-review-guide` |
| `shadow-ai-security-risks` | `ai-acceptable-use-policy-business-guide` |
| `ai-security-risks-for-business` | `ai-acceptable-use-policy-business-guide` |
| `cyber-insurance-requirements-2026` | `insider-threat-detection-prevention-guide` |
| `patch-management-cisa-kev-guide` | `anatomy-of-a-website-compromise-case-study` |
| `ransomware-readiness-backup-recovery-guide` | `business-continuity-disaster-recovery-planning-guide` |
| `cyber-resilience-vs-cybersecurity` | `business-continuity-disaster-recovery-planning-guide` |
| `vulnerability-exploitation-leading-breach-cause-2026` | `anatomy-of-a-website-compromise-case-study` |

## 3. A bug found and fixed along the way

Two of the new articles (`anatomy-of-a-website-compromise-case-study`, `ecommerce-security-skimming-fraud-guide`) were initially drafted (by a parallel sub-agent, before this correction was made) with `wordpress-hacked-checklist` as a `relatedPosts` target. That post turned out to be a seeded `draft: true` placeholder, not a live page (see `EXISTING_CONTENT_AUDIT.md` §5) — linking to it would have produced a dead link in the related-reading block on the live site. Both were corrected to link to `vulnerability-exploitation-leading-breach-cause-2026` and `web-application-security-testing-checklist-2026` respectively instead. One pre-existing instance of the same dead link was also found and fixed: `web-application-security-testing-checklist-2026`'s own `relatedPosts` array already referenced `wordpress-hacked-checklist` before this batch of work began — that was a pre-existing bug, not introduced here, and was fixed in the same edit that added its new reciprocal link.

## 4. Discoverability (no orphans)

Verified post-build: all 10 new slugs appear in `dist/sitemap-0.xml`, all 10 render as real pages under `dist/blog/<slug>/index.html`, and all 10 have at least one inbound `relatedPosts` link from an existing, live post (table in §2) in addition to being listed on `/blog/` and their tag pages automatically via the content collection.
