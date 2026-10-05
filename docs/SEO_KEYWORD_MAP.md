# SEO Keyword Map

Maps every real, existing indexable page to its target keyword(s) and intent. Built from the actual page inventory (`src/content/services/`, `src/content/blog/`, `src/content/caseStudies/`, `apps/learn`'s published courses), not invented. The point of this document is to make keyword cannibalization between the two properties visible and preventable — before adding any new page, check here first for whether the target keyword already belongs to the other property.

## shahidiqbal.com — "Need cybersecurity protection?" (B2B consulting intent)

| URL | Primary keyword | Intent | Secondary keywords | Cluster | Status |
|---|---|---|---|---|---|
| `/` | cybersecurity consultant | commercial | cybersecurity services, cybersecurity consulting | — | Live |
| `/services/penetration-testing/` | penetration testing | commercial | pen testing services, ethical hacking services, web app pentest | Penetration Testing | Live |
| `/services/vulnerability-assessment/` | vulnerability assessment | commercial | website security assessment, vulnerability scanning | Vulnerability Management | Live |
| `/services/network-cloud-security/` | network and cloud security | commercial | cloud security assessment, network security consulting | Cloud Security | Live |
| `/services/compliance-risk-assessment/` | cybersecurity risk assessment | commercial | compliance assessment, security risk management | — | Live |
| `/services/incident-response/` | incident response | commercial | cyber incident response services, breach response | Incident Response | Live |
| `/services/cyber-threat-intelligence/` | cyber threat intelligence | commercial | threat intel services, threat intelligence consulting | — | Live |
| `/services/monitoring-training/` | security monitoring and awareness training | commercial | security awareness training, SOC monitoring services | — | Live |
| `/services/secure-website-development/` | secure website development | commercial | secure web development, secure coding services | — | Live |
| `/services/custom-software-development/` | secure software development | commercial | custom software development, secure SDLC | — | Live |
| `/services/ai-automation/` | AI automation security | commercial | AI security consulting | — | Live |
| `/industries/` | cybersecurity by industry | commercial | industry-specific security services | — | Live (index only — no per-industry pages yet, see gap below) |
| `/case-studies/` | cybersecurity case studies | trust/proof | security research, penetration testing case study | — | Live |
| `/case-studies/iot-smart-campus-threat-analysis/` | IoT security research | trust/proof | IoT threat modeling, smart campus security | IoT Security | Live |
| `/blog/owasp-top-10-2025-explained/` | OWASP Top 10 2025 | informational | OWASP Top 10 explained, web app vulnerabilities | Penetration Testing | Live |
| `/blog/api-security-best-practices/` | API security best practices | informational | REST API security, API vulnerabilities | API Security | Live |
| `/blog/business-email-compromise-2026/` | business email compromise | informational | BEC attacks, email compromise protection | Incident Response | Live |
| `/blog/cloud-misconfiguration-data-breaches/` | cloud misconfiguration | informational | cloud security breaches, cloud data breach causes | Cloud Security | Live |
| `/blog/gcc-cybersecurity-compliance-sama-nesa/` | GCC cybersecurity compliance | informational | SAMA compliance, NESA compliance | — | Live |
| `/blog/iot-security-nist-guidance-2026/` | IoT security NIST guidance | informational | NIST IoT security, IoT compliance | IoT Security | Live |
| `/blog/patch-management-cisa-kev-guide/` | patch management | informational | CISA KEV, vulnerability patching | Vulnerability Management | Live |
| `/blog/ransomware-2026-trends/` | ransomware trends 2026 | informational | ransomware protection, ransomware response | Incident Response | Live |
| `/blog/software-supply-chain-attacks-2026/` | software supply chain attacks | informational | supply chain security, dependency security | — | Live |
| `/blog/wordpress-hacked-checklist/` | WordPress hacked checklist | informational/urgent | WordPress security, hacked website recovery | Incident Response | Live (draft — not yet published) |

**Geographic modifiers** ("cybersecurity consultant Pakistan/UAE/Saudi Arabia/Qatar") are not yet their own pages — currently served only by the homepage's general positioning and the `site.ts` address/region data feeding local structured data. See Phase 15 (Location SEO) in `SEO_CONTENT_STRATEGY.md` for the recommendation on this.

## learn.shahidiqbal.com — "Want to learn cybersecurity?" (education intent)

| URL | Primary keyword | Intent | Secondary keywords | Status |
|---|---|---|---|---|
| `/` | learn cybersecurity online | commercial/informational | cybersecurity courses, Learn with Shahid | Live |
| `/courses` | cybersecurity courses | commercial | cybersecurity course catalog | Live |
| `/courses/[slug]` (per published course) | course-specific (e.g. "introduction to cyber security course") | commercial | varies per course title | Live — dynamic, title/description generated per course |
| `/learn/roadmap` *(shahidiqbal.com)* | cybersecurity roadmap | informational | cybersecurity learning path, how to learn cybersecurity | Live |
| `/learn/pricing` *(shahidiqbal.com)* | cybersecurity course pricing | commercial | Learn with Shahid pricing | Live |

Note the roadmap and pricing pages are intentionally still on `shahidiqbal.com` (`/learn/*`), not the LMS app — they're informational/marketing content, not transactional, so they stay where the rest of the site's content-cluster linking already reaches them.

## Known cannibalization risks (checked, none currently live)

- "cybersecurity course" / "learn cybersecurity" keywords belong exclusively to `learn.shahidiqbal.com` — `shahidiqbal.com`'s services never target these.
- "penetration testing" is split correctly: `shahidiqbal.com/services/penetration-testing/` targets the *service* (commercial intent, "hire a pentester"), while a future Learn course on penetration testing would need a distinct angle ("learn penetration testing" / "penetration testing course") rather than competing for the same SERP.

## Gaps identified (not yet built — see `SEO_CONTENT_STRATEGY.md`)

- No individual industry pages exist yet (`/industries/saas/`, `/industries/healthcare/`, etc.) — only the index page. Building these as genuine, non-thin pages is scoped as a future content project, not attempted in this audit cycle (see the Final Report for why).
- No dedicated country/location pages beyond the homepage's general positioning.
- No API Security, Web Application Security, or IoT Security *service* pages yet (the IoT case study exists, but not a standalone IoT Security service offering page) — flagged in `SEO_CONTENT_STRATEGY.md` as genuinely justified additions per the business's real IoT research work.
