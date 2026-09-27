# Learn with Shahid — Student Guide (planned)

**Status: not yet implemented.** Describes the intended student experience for Phases 4–9.

## Getting started

Register (full name, email, password, country, optional phone/username — nothing more than that, per the brief's "don't collect unnecessary personal information" rule) → verify email → browse `/learn/courses` and `/learn/roadmap` freely, no account required for browsing → enroll (PKR 800 membership and/or a specific paid course) → gain dashboard access.

## Dashboard

- **Welcome message.**
- **My Learning**: active courses, progress bars, a single "Continue Learning" card showing the current course, percentage complete, last lesson, and next lesson — backed by the denormalized `course_progress` table so this loads instantly even with many enrollments.
- **Membership**: status, start date, expiry if applicable.
- **Community**: only the communities the student is actually eligible for are shown, with their real access state (waiting to be invited vs. already joined) — never a link to a community they haven't unlocked.
- **Payments**: orders and receipts, current status of anything pending.
- **Certificates**: earned certificates with their public verification links.
- **Announcements**, **Profile**, **Settings**, **Billing**.

## Taking a course

Course player at `/course/[slug]` and `/lesson/[id]`: video/text/PDF/quiz/assignment content per lesson, respecting free-preview and members-only flags server-side (a student who isn't enrolled sees the preview lessons and a clear enroll prompt for the rest — not broken or 403 pages). Progress (lesson started/completed, watch position where applicable, quiz score, assignment status) saves automatically as the student moves through the material.

## Quizzes

Multiple choice, multiple answer, true/false, short answer, per the settings an instructor configured (passing percentage, attempt limit, randomization, time limit, whether answers show after submission). Results feed both the student's own progress view and the instructor's course analytics.

## Certificates

Issued automatically when a course's completion criteria are met, if the instructor/admin has enabled certificates for that course. Labelled "Certificate of Course Completion" (not "certification," per the brief's accuracy rule) with a public verification page at `/verify/[certificate-id]` that confirms authenticity without exposing anything else about the student.

## Community

Once eligible (see `lms-business-model.md`'s community access model), the dashboard shows the configured invite link/instructions for each active community the student's membership unlocks — Discord, Facebook, Telegram, or whatever admin has configured — never a raw link shown to someone who isn't yet eligible.

## Support

A support ticket system tied to the student's account, optionally scoped to a specific course, plus a general FAQ and contact page — mirroring the existing site's contact-form pattern but tied to an authenticated account so an admin can see relevant context (which course, which order) without the student re-explaining it.

## Privacy, in practice

A student can see and manage exactly the data described above about themselves; nothing here is designed to expose one student's data to another (see `lms-security.md`'s IDOR-prevention design), and marketing-email preferences are separate from and never bundled with the transactional emails (verification, receipts, reminders) the platform needs to send regardless of marketing consent.
