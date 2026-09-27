import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { courses, instructors } from '@/db/schema';

/**
 * Public, unauthenticated, read-only — feeds the marketing site's
 * build-time fetch for /learn/courses (docs/lms-architecture.md §4).
 * Returns only published courses and only fields that are meant to be
 * public; never price (that's resolved separately, country-aware) and
 * never anything from the admin/instructor-only surface.
 */
export async function GET() {
  const rows = await db
    .select({
      slug: courses.slug,
      title: courses.title,
      shortDescription: courses.shortDescription,
      thumbnailUrl: courses.thumbnailUrl,
      level: courses.level,
      durationMinutes: courses.durationMinutes,
      instructorName: instructors.displayName,
    })
    .from(courses)
    .leftJoin(instructors, eq(courses.instructorId, instructors.id))
    .where(eq(courses.status, 'published'));

  return NextResponse.json({ courses: rows }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
