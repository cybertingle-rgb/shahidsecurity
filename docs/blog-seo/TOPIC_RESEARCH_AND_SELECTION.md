# Topic Research and Selection — 10 New Articles

**Research date:** 2026-10-27. Research tool: `WebSearch` only (standard web/network access to arbitrary sites is restricted in this sandboxed session; this is disclosed, not hidden — see `CONTENT_SOURCE_REGISTER.md` for exactly which claims are primary-sourced vs. secondary-sourced). No search-volume, keyword-difficulty, CPC, or ranking-position tool was available; where a competitive/demand judgment appears below it is labeled an informed qualitative assessment, not a measured metric.

## Category coverage check

- **Timely, research-backed:** #1 (DNS — grounded in NIST SP 800-81r3, published March 2026) and #2 (Kubernetes — grounded in official, currently-listed Kubernetes-project CVEs). A specific new flagship CVE comparable to PHP2Shell was *not* found this cycle with enough independent, primary-source confirmation to justify a dedicated article (see "Rejected timely candidate" below) — per the brief's own instruction, a different timely topic was chosen rather than manufacturing urgency.
- **Practical how-to/checklist:** #3, #4, #5 (also #1, #2, #6 double as how-to guides).
- **AI-related:** #6, #7.
- **Clear service connection:** #4 → vulnerability-assessment, #5 → secure-website-development, #8 → monitoring-training, #9 → incident-response.
- **Deep technical / case-study (illustrative, not a real client):** #9.

## Rejected timely candidate

A VulDB-aggregated listing surfaced `CVE-2026-106174` (Fortinet FortiOS HTTPS management race condition). It could not be confirmed against Fortinet's own PSIRT advisory index (fortiguard.com/psirt) in this session's searches — only third-party aggregator pages referenced it. Per the brief's rule ("never invent a CVE... verify the original vendor advisory"), this was **not** used as a topic. If the owner can independently confirm this CVE via Fortinet's PSIRT page, it could be a future article.

---

## 1. DNS Security in 2026: Preventing Spoofing, Cache Poisoning, and Domain Hijacking

- **Slug:** `dns-security-spoofing-hijacking-prevention-guide`
- **Primary theme:** DNS security best practices for businesses
- **Query variations:** "DNS spoofing prevention", "DNS cache poisoning", "domain hijacking protection", "DNSSEC for small business"
- **Intent:** Informational → commercial (readers realize they need a security review)
- **Audience:** IT admins, business owners managing their own domain/DNS
- **Overlap check:** No existing post covers DNS specifically. `email-authentication-spf-dkim-dmarc-guide` touches DNS records but for email auth only, not resolver/hijacking security generally.
- **Why its own page:** DNS underpins email, web, and every other service; it's a distinct enough attack surface (registrar takeover, cache poisoning, stale records) to deserve dedicated coverage.
- **Unique value:** Practical registrar/registry-lock and resolver-hardening checklist grounded in NIST's actual 2026 guidance update.
- **Service:** `network-cloud-security`
- **Sources:** NIST SP 800-81r3 (via Infoblox/Red Sift secondary coverage — primary NIST text not directly fetchable this session), PowerDMARC DNS hardening checklist.
- **Freshness:** Stable guidance; worth revisiting if NIST publishes a further DNS revision.
- **Internal links:** `email-authentication-spf-dkim-dmarc-guide`, `business-email-compromise-2026`; service `network-cloud-security`.

## 2. Container and Kubernetes Security Fundamentals for Growing Teams

- **Slug:** `container-kubernetes-security-fundamentals`
- **Primary theme:** Kubernetes/container security basics
- **Query variations:** "Kubernetes security best practices", "container security checklist", "Kubernetes RBAC hardening"
- **Intent:** Informational/practical, for teams adopting containers
- **Audience:** Developers, DevOps engineers, technical founders
- **Overlap check:** `cloud-misconfiguration-data-breaches` is about cloud config generally (IAM, storage buckets); no existing post is container/Kubernetes-specific.
- **Why its own page:** Container adoption is now mainstream even for SMB software teams; the attack surface (RBAC, secrets, network policy, image provenance) is distinct from general cloud misconfiguration.
- **Unique value:** Grounded in real, currently-listed official Kubernetes-project CVEs (ingress-nginx config injection, NFS CSI driver path traversal) rather than generic advice.
- **Service:** `network-cloud-security` (secondary: `custom-software-development`)
- **Sources:** Kubernetes official CVE feed (kubernetes.io/docs/reference/issues-security/official-cve-feed), Checkmarx container security practices.
- **Freshness:** Re-check the official CVE feed periodically; container tooling evolves quickly.
- **Internal links:** `cloud-misconfiguration-data-breaches`, `software-supply-chain-security`; service `network-cloud-security`.

## 3. Secrets Management: Keeping API Keys and Credentials Out of Your Codebase

- **Slug:** `secrets-management-api-keys-credentials-guide`
- **Primary theme:** Secrets/credential management for dev teams
- **Query variations:** "how to store API keys securely", "secrets management best practices", "hardcoded credentials vulnerability"
- **Intent:** Practical/how-to
- **Audience:** Developers, engineering leads
- **Overlap check:** `non-human-identity-security` covers machine identity at a strategic/inventory level; `passkeys-vs-passwords-2026` is human authentication. Neither covers the concrete day-to-day practice of keeping secrets out of source control, vaults, and CI/CD scanning.
- **Why its own page:** Hardcoded credentials remain a top, concrete, fixable root cause (CWE-259) distinct from the identity-inventory framing of the existing non-human-identity post.
- **Unique value:** Concrete, actionable: what a secrets manager does, CI/CD scanning, rotation after exposure, dynamic secrets.
- **Service:** `custom-software-development` (secondary: `secure-website-development`)
- **Sources:** OWASP-aligned secrets management guidance (secondary coverage), CWE-259.
- **Freshness:** Stable practice guidance.
- **Internal links:** `non-human-identity-security`, `secure-code-review-sast-dast-manual-testing`; service `custom-software-development`.

## 4. Attack Surface Management: Knowing What's Exposed Before Attackers Do

- **Slug:** `attack-surface-management-guide`
- **Primary theme:** External attack surface management (EASM)
- **Query variations:** "attack surface management", "what is EASM", "external attack surface discovery"
- **Intent:** Informational → commercial (direct lead-in to vulnerability assessment)
- **Audience:** Business owners, IT managers
- **Overlap check:** `vulnerability-prioritization-real-world-risk` is about ranking vulnerabilities you already know about; this is about *discovering* what you don't know you're exposing (shadow IT, forgotten subdomains, stale cloud assets) — a distinct, earlier stage of the same lifecycle.
- **Why its own page:** Asset discovery is a prerequisite most SMBs skip; worth its own practical guide.
- **Unique value:** Frames ASM as a continuous discipline (not a one-off scan), ties directly into the vulnerability-assessment service offering.
- **Service:** `vulnerability-assessment`
- **Sources:** Vectra/Wiz ASM explainers (vendor-authored but consistent across multiple independent vendors; Unit 42/Ponemon figures cited are flagged as vendor-reported, not independently re-verified).
- **Freshness:** Stable; re-check annually for new tooling categories.
- **Internal links:** `vulnerability-prioritization-real-world-risk`, `web-application-security-testing-checklist-2026`; service `vulnerability-assessment`.

## 5. E-Commerce Security: Protecting Online Stores From Skimming, Fraud, and Data Theft

- **Slug:** `ecommerce-security-skimming-fraud-guide`
- **Primary theme:** E-commerce/online store security (Magecart-style skimming, payment security)
- **Query variations:** "e-commerce website security", "Magecart attack", "protect online store from card skimming", "WooCommerce security"
- **Intent:** Practical/commercial — store owners actively worried about fraud
- **Audience:** Online store owners, especially WooCommerce/Shopify-style SMB merchants
- **Overlap check:** `wordpress-hacked-checklist` is a post-compromise incident-response checklist for any WordPress site; this is a *proactive*, e-commerce/payment-specific guide (skimming, PCI scope, checkout integrity) — different intent and different stage.
- **Why its own page:** Payment-handling sites carry materially different risk (card-data theft, chargebacks, PCI DSS scope) than a general WordPress blog.
- **Unique value:** Explains the actual current Magecart technique (hiding the legitimate payment form, injecting a fake iframe, admin-detection evasion) from 2026 reporting, with concrete store-owner defenses.
- **Service:** `secure-website-development` (secondary: `penetration-testing`)
- **Sources:** Recorded Future/Insikt Group 2026 Magecart reporting (via IT Brief Australia), Silent Push skimming-network research (via Cybersecurity News/Visualping — flagged as secondary coverage).
- **Freshness:** Fast-moving — skimming techniques evolve; worth revisiting every 6–12 months.
- **Internal links:** `web-application-security-testing-checklist-2026`, `third-party-vendor-risk-management-smb`; service `secure-website-development`. (Correction: `wordpress-hacked-checklist` was initially considered but is a seeded `draft: true` placeholder post, not live — confirmed via `grep -l "draft: true" *.mdx` — so it is excluded from all new relatedPosts links to avoid a dead/404 link on the published site.)

## 6. Securing AI Coding Assistants: Why Copilot-Generated Code Still Needs a Human Security Review

- **Slug:** `ai-coding-assistants-security-review-guide`
- **Primary theme:** Security risk of AI pair-programming/code-generation tools
- **Query variations:** "is AI generated code secure", "GitHub Copilot security risks", "AI pair programming vulnerabilities"
- **Intent:** Informational, aimed at dev teams adopting AI coding tools
- **Audience:** Developers, engineering managers, CTOs
- **Overlap check:** The site's 10 existing AI posts cover agents, prompt injection, model supply chain, red-teaming, AI-generated *malware*, agentic browsers/SOC, and a general AI app-security checklist — none addresses AI *coding assistants* generating insecure application code specifically.
- **Why its own page:** Distinct risk surface (insecure code *suggestions*, not an autonomous agent or an attacker's tool) relevant to nearly every modern dev team.
- **Unique value:** Cites a 2026 peer-reviewed evaluation finding Copilot's own code-review feature frequently misses SQLi/XSS/insecure deserialization, plus the well-known "Asleep at the Keyboard" baseline — directly actionable: don't trust AI self-review, keep human/SAST review in the loop.
- **Service:** `custom-software-development`
- **Sources:** Amro & Alalfi, 39th Canadian Conference on AI (2026), peer-reviewed; Perry et al. "Asleep at the Keyboard?" (Stanford).
- **Freshness:** Re-check as Copilot-class tools' review features mature.
- **Internal links:** `secure-code-review-sast-dast-manual-testing`, `ai-generated-malware-threat`; service `custom-software-development`.

## 7. How to Write an AI Acceptable Use Policy for Your Business

- **Slug:** `ai-acceptable-use-policy-business-guide`
- **Primary theme:** Practical AI governance/policy guide
- **Query variations:** "AI acceptable use policy template", "AI usage policy for employees", "company ChatGPT policy"
- **Intent:** Practical/implementation — business owner wants a concrete policy, not another "AI risks" explainer
- **Audience:** Business owners, HR/compliance leads, IT managers
- **Overlap check:** `shadow-ai-security-risks` explains the *risk* of unapproved AI tool use; `ai-security-risks-for-business` is a general risk overview. Neither hands the reader an actual implementable policy structure — this is the first *how-to-write-the-document* piece.
- **Why its own page:** Distinct deliverable-oriented angle (a governance document, not a risk explainer) with a different search intent (people searching "policy" want a document, not an explainer).
- **Unique value:** Concrete policy section checklist (approved tools, data classification rules, what never to paste into a public AI tool, review cadence).
- **Service:** `compliance-risk-assessment`
- **Sources:** General AI-governance guidance cross-referenced against the site's existing shadow-AI and AI-risk posts for consistency (no new vulnerability claims made here — this is a practical/process article, not a technical-claim-heavy one).
- **Freshness:** Review annually as AI tools and regulation evolve.
- **Internal links:** `shadow-ai-security-risks`, `ai-security-risks-for-business`; service `compliance-risk-assessment`.

## 8. Insider Threats: Detecting and Preventing Risks From Within Your Organization

- **Slug:** `insider-threat-detection-prevention-guide`
- **Primary theme:** Insider threat (negligent and malicious)
- **Query variations:** "insider threat detection", "prevent insider threats small business", "departing employee data theft"
- **Intent:** Informational/practical
- **Audience:** Business owners, IT/HR managers
- **Overlap check:** No existing post addresses insider risk; `non-human-identity-security` is about machine identities, not people.
- **Why its own page:** A genuinely distinct threat category (trusted-access misuse) not covered anywhere else on the site.
- **Unique value:** Distinguishes negligent vs. malicious insiders with different controls for each; practical offboarding/least-privilege checklist.
- **Service:** `monitoring-training`
- **Sources:** Multiple secondary vendor compilations of insider-threat cost/cause statistics were cross-checked and found **inconsistent** across sources (e.g., negligent-vs-malicious split reported as both 53/27/20 and 55/25/20 by different vendors; containment time reported as both 67 and 81 days). Per the no-fabrication rule, the article presents these as a *directional range from industry reporting*, explicitly flagged as unverified against the primary Ponemon/DTEX or Verizon DBIR report text, rather than citing a single precise figure as fact.
- **Freshness:** Revisit when a primary-source DBIR/Ponemon report becomes directly accessible.
- **Internal links:** `non-human-identity-security`, `cyber-insurance-requirements-2026`; service `monitoring-training`.

## 9. Anatomy of a Website Compromise: A Step-by-Step Walkthrough (Illustrative Scenario)

- **Slug:** `anatomy-of-a-website-compromise-case-study`
- **Primary theme:** Educational walkthrough of a typical website-compromise attack chain
- **Query variations:** "how websites get hacked step by step", "anatomy of a cyber attack", "website compromise walkthrough"
- **Intent:** Informational, deeper/educational
- **Audience:** Business owners wanting to understand *how* an attack actually unfolds, not just a checklist
- **Overlap check:** `wordpress-hacked-checklist` is a reactive "what to do now" checklist; this is a narrative, stage-by-stage educational piece (recon → initial access → persistence → lateral movement/exfiltration → detection) explicitly labeled hypothetical/illustrative, not a real incident.
- **Why its own page:** Satisfies the brief's "deep technical/case-study-style" requirement without inventing a real client story — clearly labeled as an illustrative composite scenario built from well-documented, generic attack patterns.
- **Unique value:** Ties every stage of the walkthrough back to a specific, concrete defensive/detection control, making it actionable rather than just narrative.
- **Service:** `incident-response` (secondary: `penetration-testing`)
- **Sources:** General, well-established attack-lifecycle patterns (MITRE ATT&CK-style stages, described generically — no invented CVE or client detail).
- **Freshness:** Stable — illustrative/conceptual rather than tied to a specific current event.
- **Internal links:** `vulnerability-exploitation-leading-breach-cause-2026`, `patch-management-cisa-kev-guide`; service `incident-response`. (Correction: `wordpress-hacked-checklist` was initially considered but is a seeded `draft: true` placeholder post, not live — see note in topic #5 above — so it is excluded.)

## 10. Business Continuity and Disaster Recovery Planning Beyond Ransomware

- **Slug:** `business-continuity-disaster-recovery-planning-guide`
- **Primary theme:** General BC/DR planning (RTO/RPO, business impact analysis)
- **Query variations:** "business continuity plan small business", "disaster recovery plan RTO RPO", "business impact analysis"
- **Intent:** Practical/implementation
- **Audience:** Business owners, operations leads
- **Overlap check:** `ransomware-readiness-backup-recovery-guide` is specifically about ransomware backup/recovery testing; this is the broader discipline (any outage — hardware failure, extended cloud/vendor outage, natural disaster) using the NIST SP 800-34 BIA/RTO/RPO framework, explicitly scoped as going beyond the ransomware-specific case.
- **Why its own page:** Distinct, broader framework (BIA → RTO/RPO → three-phase plan) that the ransomware post doesn't cover.
- **Unique value:** Introduces RTO/RPO and the business-impact-analysis method in concrete, SMB-usable terms, explicitly noting NIST SP 800-34 is a federal framework whose *logic* (not mandate) applies to any business.
- **Service:** `incident-response` (secondary: `network-cloud-security`)
- **Sources:** NIST SP 800-34 Rev. 1 structure (via secondary coverage — primary NIST text not directly fetchable this session, disclosed).
- **Freshness:** Stable framework.
- **Internal links:** `ransomware-readiness-backup-recovery-guide`, `cyber-resilience-vs-cybersecurity`; service `incident-response`.
