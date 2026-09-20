import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getResearch } from '../lib/research';
import { profile, withBase } from '../lib/site';
export async function GET(context: APIContext) {
  const posts = await getResearch();
  return rss({
    title: `${profile.name} — Research`, description: profile.description, site: context.site!,
    items: posts.map(post => ({ title: post.data.title, description: post.data.description, pubDate: post.data.date, link: withBase(`research/${post.id}/`), categories: post.data.tags })),
  });
}
