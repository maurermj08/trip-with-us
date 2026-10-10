import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works at any URL path,
  // e.g. GitHub Pages project sites (https://<user>.github.io/<repo>/).
  base: './',
  server: { host: true },
  preview: { host: true },
});
