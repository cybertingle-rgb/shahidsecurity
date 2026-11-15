# Monthly SEO Report Template

Refreshes `12_MONTHLY_REPORT_TEMPLATE.md` (2026-10-28) — same structure and the same non-negotiable rule: every field is either a real figure with its source, or explicitly marked unavailable, never an estimate presented as fact. Changes from the October version are the country table (adds Pakistan, now a primary market with its own `/locations/pakistan/` page) and the Conversions section (replaced the old "thank-you page reach" proxy with the 5 real conversion events and their actual code paths, confirmed in `SEO_TEST_REPORT.md`).

---

## Report: [Month Year]

**Reporting date:** [date]
**Comparison period:** [previous month, or previous year same month if seasonality — e.g., Ramadan timing, or Bahrain's June/December CBB testing windows — makes that the fairer comparison; state which and why]
**Data sources used this month:** [GSC / GA4 / server logs (leads/consultations DB tables) / none available — list exactly]

### Headline numbers

| Metric | This period | Comparison period | Change | Source |
|---|---|---|---|---|
| Organic clicks | [real number or "Unavailable — no GSC access"] | | | |
| Impressions | | | | |
| CTR | | | | |
| Average position | | | | |

### Target-country performance (Saudi Arabia / UAE / Qatar / Pakistan primary; Oman/Bahrain/Kuwait secondary)

| Country | Impressions | Clicks | CTR | Avg. position | Notes |
|---|---|---|---|---|---|
| Saudi Arabia | | | | | Location pages gated — see `SEO_IMPLEMENTATION_PLAN.md` S1; confirm NCA Haseen status before this row has a page to attribute to |
| UAE | | | | | |
| Qatar | | | | | |
| Pakistan | | | | | |
| Oman | | | | | combined `/locations/gcc/` page |
| Bahrain | | | | | combined `/locations/gcc/` page; expect seasonality around June/December CBB test windows |
| Kuwait | | | | | combined `/locations/gcc/` page, lightly covered |

### Priority query clusters (cross-reference `KEYWORD_TO_URL_MAPPING.csv` and `GCC_KEYWORD_STRATEGY.md`)

[Which clusters gained/lost impressions or position this month, with real numbers. Use this to replace "Unknown" volume/difficulty/rank estimates in the keyword workbook with real data as it arrives.]

### Priority landing pages

[Which pages gained/lost performance, with real numbers — the new `/locations/*` and refreshed `/services/*` pages are the ones to watch first for early signal]

### Conversions

Real server-side data exists today independent of GSC/GA4 (see `SEO_TEST_REPORT.md` Part B) — these can be reported from the database even before analytics is ever installed.

| Event | This period | Comparison period | Source |
|---|---|---|---|
| `contact_form_submit` | | | `leads` table, via the contact API route |
| `consultation_request` | | | `consultations` table, via the booking API route |
| `course_enquiry` | | | Learn checkout/enrollment actions |
| `training_enquiry` | | | Personal-training request action |
| Qualified inquiries (if the business can classify these) | | | Manual review |

### Work completed this month

[List of actual changes shipped — pages created/improved, content published, technical fixes — each with a link to the commit or PR]

### Known limitations this period

[State plainly what couldn't be measured or verified this month and why]

### Changes in measurement/tracking vs. changes in actual performance

[Explicitly separate: did a metric move because of real performance change, or because tracking/measurement configuration changed? Never conflate the two.]

### Next month's proposed batch

[Proposed, not yet executed — pending review]
