import { defineConfig } from 'vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';
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
