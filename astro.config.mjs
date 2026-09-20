import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { codeWindow } from './src/plugins/code-window';
import { contentPaths } from './src/plugins/content-paths';

const base = process.env.SITE_BASE || '/bui-viet-hoang/';
const destination = (path) => `${base.replace(/\/$/, '')}/${path}`;

export default defineConfig({
  site: process.env.SITE_URL || 'https://h3n1s3.github.io',
  base,
  trailingSlash: 'always',
  integrations: [sitemap(), mdx()],
  vite: { plugins: [tailwindcss()] },
  redirects: {
    '/blog': destination('research/'),
    '/blog/access-control': destination('research/access-control/'),
    '/blog/disclosure': destination('research/disclosure/'),
    '/blog/lab-notes': destination('research/lab-notes/'),
    '/cv': destination('#about'),
    '/about': destination('#about'),
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, [contentPaths, { base }]],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: {
      theme: 'github-dark',
      wrap: false,
      transformers: [codeWindow()],
    },
  },
});
