import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { setPostTags, setPostFaqs, getTagNamesForPost, getFaqsForPost, formatFaqsAsText, slugify } from '@/lib/blog';

afterAll(closeTestDb);

async function makePost() {
  const id = crypto.randomUUID();
  await testDb.insert(schema.blogPosts).values({ id, slug: `post-${id}`, title: 'Test Post', status: 'draft' });
  return id;
}

describe('blog tag parsing', () => {
  beforeEach(truncateAll);

  it('creates new tags from a comma-separated list and links them to the post', async () => {
    const postId = await makePost();
    await setPostTags(postId, 'AI Security, Incident Response');

    const names = await getTagNamesForPost(postId);
    expect(new Set(names)).toEqual(new Set(['AI Security', 'Incident Response']));
  });

  it('reuses an existing tag matched by slug rather than creating a duplicate', async () => {
    const postA = await makePost();
    const postB = await makePost();
    await setPostTags(postA, 'Cloud Security');
    await setPostTags(postB, 'cloud security'); // different case, same slug

    const allTags = await testDb.select().from(schema.blogTags);
    expect(allTags).toHaveLength(1);
  });

  it('replaces a post\'s full tag set rather than appending', async () => {
    const postId = await makePost();
    await setPostTags(postId, 'Tag One, Tag Two');
    await setPostTags(postId, 'Tag Three');

    const names = await getTagNamesForPost(postId);
    expect(names).toEqual(['Tag Three']);
  });
});

describe('blog FAQ parsing', () => {
  beforeEach(truncateAll);

  it('parses Q:/A: blocks into separate FAQ rows in order', async () => {
    const postId = await makePost();
    await setPostFaqs(postId, 'Q: First question?\nA: First answer.\n\nQ: Second question?\nA: Second answer.');

    const faqs = await getFaqsForPost(postId);
    expect(faqs.map((f) => f.question)).toEqual(['First question?', 'Second question?']);
    expect(faqs.map((f) => f.answer)).toEqual(['First answer.', 'Second answer.']);
  });

  it('ignores a malformed block missing either Q: or A:', async () => {
    const postId = await makePost();
    await setPostFaqs(postId, 'Q: Only a question, no answer.\n\nQ: Real question?\nA: Real answer.');

    const faqs = await getFaqsForPost(postId);
    expect(faqs).toHaveLength(1);
    expect(faqs[0]?.question).toBe('Real question?');
  });

  it('round-trips through formatFaqsAsText for re-editing', async () => {
    const postId = await makePost();
    const original = 'Q: A question?\nA: An answer.';
    await setPostFaqs(postId, original);

    const faqs = await getFaqsForPost(postId);
    expect(formatFaqsAsText(faqs)).toBe(original);
  });
});

describe('slugify', () => {
  it('lowercases, replaces non-alphanumeric runs with a single hyphen, and trims edge hyphens', () => {
    expect(slugify('Shadow AI: Security Risks!')).toBe('shadow-ai-security-risks');
  });
});
