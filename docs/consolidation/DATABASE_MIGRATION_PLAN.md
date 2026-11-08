# Database Migration Plan — Full Consolidation Project

**Status:** this phase of the consolidation requires no database
migration at all. This document exists (per the brief's §17 required-docs
list) to state that plainly and explain why, rather than leaving the
question unanswered.

## 1. Why there is nothing to migrate, for this phase

The chosen architecture (`UNIFIED_ARCHITECTURE.md`) consolidates the
**URLs**, not the data. `apps/admin` and `apps/learn` keep their own,
completely separate MySQL databases, exactly as they are today
(`PLATFORM_AUDIT.md` §3):

- No schema change in either database.
- No data moved between them.
- No new shared database introduced.
- The existing `learnDb.ts` bridge (admin's own second connection into
  Learn's database) is untouched — it already does the one piece of
  cross-database reading this project needs, and has done so before this
  project started.

Every one of the brief's 15 "required safeguards" (§6) — preserving
accounts, enrollments, membership history, payment history, invoices,
progress, audit logs, timestamps, relationships — holds trivially, because
nothing touches a database row at all in this phase. There is no ID
mapping, no account-matching problem, no risk of orphaned records, because
there is no migration step for any of those risks to apply to.

## 2. When this document would actually need writing

A real migration plan becomes necessary only if a future, separate phase
decides to:

- Physically merge the two databases (not recommended by this project —
  `PLATFORM_AUDIT.md` §4 explains why admin's site-services pricing and
  learn's commerce system are different systems serving different
  purposes, not duplicates to collapse).
- Wire a real payment gateway where none currently exists
  (`PLATFORM_AUDIT.md` §10.4, still unconfirmed either way) — this could
  introduce new tables/columns, which would need exactly the kind of
  reviewed-migration/rollback-tested process `docs/lms-deployment.md`
  already describes for this codebase in general.
- Retire `apps/learn`'s own `/admin/*` route group's *code*, not just its
  public reachability (already done, `UNIFIED_ARCHITECTURE.md` §4.1) —
  this is a code deletion, not a data migration, so still wouldn't need
  this document even then.

None of these is in scope for the current phase. This document will be
rewritten with a real plan if and when one of them is.
