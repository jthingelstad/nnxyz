import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import deployment from './infra/deployment.json' with { type: 'json' };
import { mediaPrefixes } from './tools/delivery-plan.mjs';

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
  // Published media is never copied into the site; the dev server reads it
  // from CloudFront, as the built site does.
  vite: {
    server: {
      proxy: Object.fromEntries(
        mediaPrefixes.map((prefix) => [
          `/${prefix}`,
          { target: deployment.deliveryUrl, changeOrigin: true },
        ]),
      ),
    },
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !Object.keys(redirects).some((path) => page === site + path),
    }),
  ],
});
