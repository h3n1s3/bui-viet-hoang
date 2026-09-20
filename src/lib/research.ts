import { getCollection } from 'astro:content';

export async function getResearch() {
  return (await getCollection('research', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

export function readingTime(body = ''): number {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/u).length / 220));
}
