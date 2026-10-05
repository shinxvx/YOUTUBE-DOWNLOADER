import { defineConfig } from 'vite';

// The packaged app loads dist/index.html from disk (file://). Module scripts
// are blocked on file:// in Chromium, so the game is bundled as one classic
// script (IIFE) and the module/crossorigin attributes are removed.
const classicScript = {
  name: 'classic-script',
  enforce: 'post',
  transformIndexHtml(html) {
    return html
      .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '')
      .replace('</body>', (m) => `${m}`)
      .replace(/<link rel="stylesheet" crossorigin /g, '<link rel="stylesheet" ')
      .replace('<!--SCRIPT-->', '');
  },
  generateBundle(_opts, bundle) {
    const html = bundle['index.html'];
    const js = Object.keys(bundle).find((k) => k.endsWith('.js'));
    if (html && js) {
      html.source = String(html.source)
        .replace(/\s*<script type="module" crossorigin src="[^"]+"><\/script>/, '')
        .replace('</body>', `  <script defer src="./${js}"></script>\n  </body>`);
    }
  },
};

export default defineConfig({
  base: './',
  plugins: [classicScript],
  esbuild: { keepNames: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});
