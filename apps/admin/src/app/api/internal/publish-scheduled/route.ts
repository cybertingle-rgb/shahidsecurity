import { NextRequest, NextResponse } from 'next/server';
import { publishDuePosts } from '@/lib/blog';
import { logAudit } from '@/lib/audit';

/**
 * Secret-gated sweep for scheduled blog posts — this app has no
 * long-running cron process of its own (it's a request-driven Next.js
 * server), so a scheduled post only actually goes live when something
 * external calls this endpoint after its scheduledFor time. Wire up
 * Hostinger hPanel's Cron Jobs feature to curl this URL with the header
 * below on a regular interval (every 15 minutes is reasonable) — see
 * docs/BLOG_CMS.md. Until that's configured, scheduling a post sets its
 * status/date correctly but it won't flip to published on its own.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PUBLISH_SCHEDULED_SECRET;
  const provided = request.headers.get('x-publish-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const publishedIds = await publishDuePosts();
  for (const id of publishedIds) {
    await logAudit({ actorUserId: null, action: 'blog_post.auto_published', targetType: 'blog_post', targetId: id, metadata: { trigger: 'scheduled_sweep' } });
  }

  return NextResponse.json({ success: true, publishedCount: publishedIds.length, publishedIds });
}
