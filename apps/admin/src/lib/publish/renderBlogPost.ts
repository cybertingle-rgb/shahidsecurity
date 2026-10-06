import yaml from 'js-yaml';
import { assertSafeMarkdown, assertSafePlainText } from './sanitize';

/**
 * Flattened input the renderer needs — deliberately decoupled from the
 * `blog_posts` DB row shape so this function stays pure and unit-testable;
 * the publish action is responsible for joining author/tags/faqs/related
 * posts and passing the result in here.
 */
export type BlogPostForRender = {
  slug: string;
  title: string;
  description: string;
  bodyMarkdown: string;
  publishedAt: Date;
  updatedAt?: Date | null;
  authorName: string;
  tags: string[];
  relatedServiceSlug?: string | null;
  relatedPostSlugs: string[];
  faqs: { question: string; answer: string }[];
  draft: boolean;
  /** When set, the publish action also commits the image binary at this filename alongside the .mdx file. */
  cover?: { fileName: string } | null;
};

export type RenderedBlogPost = {
  /** Full file content, frontmatter + body, matching src/content.config.ts's blog schema exactly. */
  fileContent: string;
  /** Path relative to the repo root this must be committed to. */
  filePath: string;
};

// Must match the `[slug].astro` route's content-collection id format: a plain
// lowercase-kebab segment, since the slug becomes both the filename and the
// public URL path (/blog/[slug]/) — see docs/ADMIN_PUBLIC_SITE_INTEGRATION.md
// on not changing existing indexed URL structure.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class InvalidBlogPostError extends Error {}

/**
 * Validates and renders one blog post into the exact .mdx frontmatter+body
 * shape `src/content.config.ts`'s blog collection schema requires. Every
 * field is validated/sanitized here, before any content is turned into a
 * file — nothing downstream re-checks this, so this is the one place a
 * publish can be rejected for unsafe or incomplete content.
 */
export function renderBlogPostMdx(post: BlogPostForRender): RenderedBlogPost {
  if (!SLUG_PATTERN.test(post.slug)) {
    throw new InvalidBlogPostError(`Slug "${post.slug}" must be lowercase letters, numbers, and single hyphens only.`);
  }
  if (!post.title.trim()) throw new InvalidBlogPostError('Title is required to publish.');
  if (!post.description.trim()) throw new InvalidBlogPostError('Description is required to publish.');
  if (!post.bodyMarkdown.trim()) throw new InvalidBlogPostError('Body content is required to publish.');
  if (!post.authorName.trim()) throw new InvalidBlogPostError('Author is required to publish.');

  assertSafePlainText(post.title, 'Title');
  assertSafePlainText(post.description, 'Description');
  assertSafePlainText(post.authorName, 'Author');
  for (const tag of post.tags) assertSafePlainText(tag, 'Tag');
  if (post.relatedServiceSlug) assertSafePlainText(post.relatedServiceSlug, 'Related service');
  for (const slug of post.relatedPostSlugs) assertSafePlainText(slug, 'Related post slug');
  for (const faq of post.faqs) {
    assertSafePlainText(faq.question, 'FAQ question');
    assertSafePlainText(faq.answer, 'FAQ answer');
  }
  assertSafeMarkdown(post.bodyMarkdown, 'Body');

  const frontmatter: Record<string, unknown> = {
    title: post.title,
    description: post.description,
    publishedAt: formatDate(post.publishedAt),
    tags: post.tags,
    author: post.authorName,
    draft: post.draft,
    relatedPosts: post.relatedPostSlugs,
    faqs: post.faqs.map((f) => ({ q: f.question, a: f.answer })),
  };
  if (post.updatedAt) frontmatter.updatedAt = formatDate(post.updatedAt);
  if (post.relatedServiceSlug) frontmatter.relatedService = post.relatedServiceSlug;
  if (post.cover) frontmatter.cover = `./${post.cover.fileName}`;

  const frontmatterYaml = yaml.dump(frontmatter, { lineWidth: -1 }).trim();
  const fileContent = `---\n${frontmatterYaml}\n---\n\n${post.bodyMarkdown.trim()}\n`;

  return { fileContent, filePath: `src/content/blog/${post.slug}.mdx` };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
