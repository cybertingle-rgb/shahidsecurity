import { NextRequest, NextResponse } from 'next/server';
import { importLegacyBlogPosts } from '@/lib/importLegacyBlogPosts';

/**
 * One-time HTTP-triggered import of the blog posts that already existed
 * as .mdx files before this admin's Blog CMS did — same bootstrap
 * category and secret as /api/internal/seed-super-admin (this host has
 * no shell access to run a one-off script directly). Idempotent, so
 * safe to call more than once. See src/lib/importLegacyBlogPosts.ts.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  const provided = request.headers.get('x-seed-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await importLegacyBlogPosts();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
