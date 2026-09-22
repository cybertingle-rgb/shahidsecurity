import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '@/lib/site';

export const GET: APIRoute = async (context) => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  return rss({
    title: `${site.name} Blog`,
    description: 'Practical, plain-English writing on cybersecurity for business owners.',
    site: context.site ?? site.url,
    items: posts
      .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.publishedAt,
        link: `/blog/${post.id}/`,
      })),
    customData: `<language>en</language>`,
  });
};
