import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_REPORTS, verifyReportToken } from '@/app/api/report-download.php/route';

/**
 * Replaces public/api/report-file.php — see report-download.php/route.ts
 * for the token design (self-contained signed token, no storage) and
 * src/app/api/contact.php/route.ts for why these .php-suffixed paths are
 * real Next.js routes now. Same filesystem-serving pattern as
 * src/app/[[...slug]]/route.ts uses for astro-dist/, but deliberately a
 * separate, non-public directory (protected-reports/, never reachable
 * through that catch-all) so a PDF here is only ever readable through
 * this exact token check — never by filename alone, never listed.
 */
const PROTECTED_REPORTS_ROOT = path.resolve(process.cwd(), 'protected-reports');

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get('slug') ?? '';
  const token = searchParams.get('token') ?? '';

  const report = ALLOWED_REPORTS[slug];
  if (!report) {
    return new NextResponse('Not found.', { status: 404 });
  }

  if (!verifyReportToken(token, slug)) {
    return new NextResponse('Invalid or expired link. Please request the report again.', { status: 403 });
  }

  const filePath = path.join(PROTECTED_REPORTS_ROOT, report.file);
  // report.file always comes from the fixed ALLOWED_REPORTS map, never
  // from the request, so there's no path-traversal surface here — this
  // check only guards against ALLOWED_REPORTS itself ever being
  // misconfigured with a value that escapes the directory.
  const resolved = path.resolve(filePath);
  if (resolved !== PROTECTED_REPORTS_ROOT && !resolved.startsWith(PROTECTED_REPORTS_ROOT + path.sep)) {
    return new NextResponse('Not found.', { status: 404 });
  }

  try {
    const info = await stat(/* turbopackIgnore: true */ resolved);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    console.error(`[report-file.php] Report file missing on disk: ${resolved}`);
    return new NextResponse('This report is temporarily unavailable. Please email info@shahidiqbal.com and we will send it directly.', { status: 503 });
  }

  const body = await readFile(/* turbopackIgnore: true */ resolved);
  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.title.replace(/[^\w\s.-]/g, '')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
