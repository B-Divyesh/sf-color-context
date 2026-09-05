import { defineConfig } from 'vite';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function offlineAssetManifest() {
  return {
    name: 'offline-asset-manifest',
    apply: 'build' as const,
    async closeBundle() {
      const assets = await readdir('dist/assets');
      const paths = assets.filter((file) => /\.(?:js|mjs|css)$/.test(file)).map((file) => `/assets/${file}`);
      const serviceWorkerPath = join('dist', 'sw.js');
      const source = await readFile(serviceWorkerPath, 'utf8');
      await writeFile(serviceWorkerPath, source.replace('/*__BUILD_ASSETS__*/[]', JSON.stringify(paths)));

      const indexPath = join('dist', 'index.html');
      const index = await readFile(indexPath, 'utf8');
      const demo = index
        .replace('href="https://color-context.sociobot.in/"', 'href="https://color-context.sociobot.in/demo"')
        .replace('content="https://color-context.sociobot.in/"', 'content="https://color-context.sociobot.in/demo"')
        .replaceAll('Color Context — label color-only cues', 'Demo — Color Context');
      await mkdir(join('dist', 'demo'), { recursive: true });
      await writeFile(join('dist', 'demo', 'index.html'), demo);
    },
  };
}

export default defineConfig({
  plugins: [offlineAssetManifest()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
