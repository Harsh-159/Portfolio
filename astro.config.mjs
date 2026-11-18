// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

export const SITE = 'https://harsh-yadav-portfolio-ai.vercel.app';

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    preact(),
    sitemap({ filter: (page) => !page.includes('/dev/') && !page.includes('/404') }),
  ],
  redirects: {
    '/lab/tokenizer': '/#lab',
    '/lab/attention': '/#lab',
    '/lab/levenshtein': '/lab/matcher',
  },
  devToolbar: { enabled: false },
});
