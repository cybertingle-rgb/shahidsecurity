# Protected reports

Gated lead-magnet PDFs served by `src/app/api/report-file.php/route.ts`,
never served directly or listed — only readable through that token-gated
route, which maps a `slug` to an exact filename via `ALLOWED_REPORTS` (see
that file). Never add a route that lets a filename come from user input.

Drop a report's PDF here with the exact filename `ALLOWED_REPORTS` expects,
then add the slug/filename/title to `ALLOWED_REPORTS` in both
`report-download.php/route.ts` and `report-file.php/route.ts`.

Current reports:
- `iot-smart-campus-thesis.pdf` — "Threats and Attacks on IOT Based Smart
  Campus System" (slug: `iot-smart-campus`), the Qarshi University BS CS
  final year project by Shahid Iqbal and Kinza Sajjad. Present as of
  2026-11-11.
