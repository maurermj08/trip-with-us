import { defineConfig, type Connect, type Plugin } from 'vite';

/** /dev → /dev/ (like GitHub Pages does), so the sandbox path works with or without the slash. */
function devSlash(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? '';
    if (url === '/dev' || url.startsWith('/dev?') || url.startsWith('/dev#')) {
      res.statusCode = 301;
      res.setHeader('Location', url.replace(/^\/dev/, '/dev/'));
      res.end();
      return;
    }
    next();
  };
  return {
    name: 'dev-slash',
    configureServer: (server) => void server.middlewares.use(redirect),
    configurePreviewServer: (server) => void server.middlewares.use(redirect),
  };
}

export default defineConfig({
  // Relative asset paths so the build works at any URL path,
  // e.g. GitHub Pages project sites (https://<user>.github.io/<repo>/).
  base: './',
  plugins: [devSlash()],
  build: {
    // The game, plus the /dev sandbox (a practical viewer/editor for every item).
    rollupOptions: { input: { main: 'index.html', dev: 'dev/index.html' } },
  },
  server: { host: true },
  preview: { host: true },
});
