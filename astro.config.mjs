import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = 'https://nnxyz.thingelstad.xyz';
// Sections of Other & related that were briefly published as their own pages.
const redirects = {
  '/collections/nnxyz-other/': '/collections/other-related/#nnxyz-other',
  '/collections/scrimshaw/': '/collections/other-related/#scrimshaw',
};

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  redirects,
  integrations: [
    sitemap({
      filter: (page) =>
        !Object.keys(redirects).some((path) => page === site + path),
    }),
  ],
});
