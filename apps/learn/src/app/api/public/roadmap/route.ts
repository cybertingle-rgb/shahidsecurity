import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { roadmapStages, roadmapStageResources, courses } from '@/db/schema';

/**
 * Public, unauthenticated, read-only — feeds the marketing site's
 * build-time fetch for /learn/roadmap (docs/lms-roadmap.md: "rendered as
 * a static, SEO-indexable page... with its data authored in the LMS admin
 * and synced the same way course marketing data is"). A stage only ever
 * carries a course link once a *published* course actually exists for it
 * — never a placeholder "coming soon" card, per that same doc.
 */
export async function GET() {
  const stages = await db.select().from(roadmapStages).orderBy(asc(roadmapStages.sortOrder));

  const stageRows = await Promise.all(
    stages.map(async (stage) => {
      const linkRows = await db
        .select({ courseSlug: courses.slug, courseTitle: courses.title, courseStatus: courses.status, externalLinks: roadmapStageResources.externalLinks })
        .from(roadmapStageResources)
        .leftJoin(courses, eq(roadmapStageResources.courseId, courses.id))
        .where(eq(roadmapStageResources.roadmapStageId, stage.id));

      const course = linkRows.find((r) => r.courseSlug && r.courseStatus === 'published');
      const externalLinks = linkRows.flatMap((r) => r.externalLinks ?? []);

      return {
        levelNumber: stage.levelNumber,
        title: stage.title,
        description: stage.description,
        prerequisitesText: stage.prerequisitesText,
        isRequired: stage.isRequired,
        course: course ? { slug: course.courseSlug, title: course.courseTitle } : null,
        externalLinks,
      };
    }),
  );

  return NextResponse.json({ stages: stageRows }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
