import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './content/research' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    sample: z.boolean().default(false),
    lang: z.enum(['en', 'vi']).default('en'),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

export const collections = { research };
