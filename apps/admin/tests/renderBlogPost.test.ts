import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { renderBlogPostMdx, InvalidBlogPostError, type BlogPostForRender } from '@/lib/publish/renderBlogPost';

function basePost(overrides: Partial<BlogPostForRender> = {}): BlogPostForRender {
  return {
    slug: 'example-post',
    title: 'Example Post Title',
    description: 'An example description for the post.',
    bodyMarkdown: '## Heading\n\nSome body text.',
    publishedAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: null,
    authorName: 'Shahid Iqbal',
    tags: ['ransomware', 'incident-response'],
    relatedServiceSlug: 'incident-response',
    relatedPostSlugs: ['other-post'],
    faqs: [{ question: 'What is this?', answer: 'An example.' }],
    draft: false,
    cover: null,
    ...overrides,
  };
}

function parseFrontmatter(fileContent: string): Record<string, unknown> {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error('No frontmatter block found');
  return yaml.load(match[1]) as Record<string, unknown>;
}

describe('renderBlogPostMdx', () => {
  it('produces a file path matching the real content collection convention', () => {
    const { filePath } = renderBlogPostMdx(basePost());
    expect(filePath).toBe('src/content/blog/example-post.mdx');
  });

  it('produces frontmatter matching src/content.config.ts\'s blog schema fields', () => {
    const { fileContent } = renderBlogPostMdx(basePost());
    const fm = parseFrontmatter(fileContent);
    expect(fm.title).toBe('Example Post Title');
    expect(fm.description).toBe('An example description for the post.');
    expect(fm.publishedAt).toBe('2026-01-15');
    expect(fm.tags).toEqual(['ransomware', 'incident-response']);
    expect(fm.author).toBe('Shahid Iqbal');
    expect(fm.draft).toBe(false);
    expect(fm.relatedService).toBe('incident-response');
    expect(fm.relatedPosts).toEqual(['other-post']);
    expect(fm.faqs).toEqual([{ q: 'What is this?', a: 'An example.' }]);
  });

  it('includes updatedAt only when provided', () => {
    const withUpdate = parseFrontmatter(renderBlogPostMdx(basePost({ updatedAt: new Date('2026-02-01') })).fileContent);
    expect(withUpdate.updatedAt).toBe('2026-02-01');

    const withoutUpdate = parseFrontmatter(renderBlogPostMdx(basePost({ updatedAt: null })).fileContent);
    expect(withoutUpdate.updatedAt).toBeUndefined();
  });

  it('includes a relative cover path only when a cover is attached', () => {
    const withCover = parseFrontmatter(
      renderBlogPostMdx(basePost({ cover: { fileName: 'example-post-cover.jpg' } })).fileContent,
    );
    expect(withCover.cover).toBe('./example-post-cover.jpg');

    const withoutCover = parseFrontmatter(renderBlogPostMdx(basePost({ cover: null })).fileContent);
    expect(withoutCover.cover).toBeUndefined();
  });

  it('places the body content after the closing frontmatter fence', () => {
    const { fileContent } = renderBlogPostMdx(basePost({ bodyMarkdown: '## My Heading\n\nBody text here.' }));
    expect(fileContent.trim().endsWith('## My Heading\n\nBody text here.')).toBe(true);
  });

  it('rejects an uppercase or non-kebab-case slug', () => {
    expect(() => renderBlogPostMdx(basePost({ slug: 'Example_Post' }))).toThrow(InvalidBlogPostError);
  });

  it('rejects a missing title, description, body, or author', () => {
    expect(() => renderBlogPostMdx(basePost({ title: '' }))).toThrow(InvalidBlogPostError);
    expect(() => renderBlogPostMdx(basePost({ description: '' }))).toThrow(InvalidBlogPostError);
    expect(() => renderBlogPostMdx(basePost({ bodyMarkdown: '   ' }))).toThrow(InvalidBlogPostError);
    expect(() => renderBlogPostMdx(basePost({ authorName: '' }))).toThrow(InvalidBlogPostError);
  });

  it('rejects unsafe HTML/script content in the body', () => {
    expect(() => renderBlogPostMdx(basePost({ bodyMarkdown: 'Text <script>alert(1)</script>' }))).toThrow();
  });

  it('rejects HTML in a plain-text field like the title', () => {
    expect(() => renderBlogPostMdx(basePost({ title: 'Title <b>bold</b>' }))).toThrow();
  });
});
