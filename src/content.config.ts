import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const services = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    group: z.enum(['security', 'build']),
    shortDescription: z.string(),
    icon: z.string(),
    order: z.number(),
    whoItsFor: z.array(z.string()),
    included: z.array(z.string()),
    deliverables: z.array(z.string()),
    process: z.array(
      z.object({
        title: z.string(),
        text: z.string(),
      }),
    ),
    faqs: z.array(
      z.object({
        q: z.string(),
        a: z.string(),
      }),
    ),
    seoTitle: z.string(),
    seoDescription: z.string(),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/caseStudies' }),
  schema: z.object({
    title: z.string(),
    client: z.string(),
    industry: z.string(),
    services: z.array(z.string()),
    challenge: z.string(),
    approach: z.array(z.string()),
    results: z.array(z.string()),
    quote: z
      .object({
        text: z.string(),
        author: z.string(),
        role: z.string(),
        permissionConfirmed: z.boolean(),
      })
      .optional(),
    publishedAt: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      author: z.string().default('Shahid Iqbal'),
      cover: image().optional(),
      draft: z.boolean().default(false),
    }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    updatedAt: z.coerce.date(),
  }),
});

export const collections = { services, caseStudies, blog, legal };
