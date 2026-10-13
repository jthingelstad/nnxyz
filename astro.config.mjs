import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nnxyz.thingelstad.xyz',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
