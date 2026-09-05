import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type StaticWebAppConfig = {
  globalHeaders: Record<string, string>;
  mimeTypes: Record<string, string>;
  routes: Array<{ route: string; headers?: Record<string, string>; rewrite?: string }>;
  responseOverrides: Record<string, { rewrite: string; statusCode: number }>;
};

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/staticwebapp.config.json'), 'utf8'),
) as StaticWebAppConfig;

function headersFor(route: string): Record<string, string> {
  const matchingRoute = config.routes.find((entry) => entry.route === route || (entry.route.endsWith('/*') && route.startsWith(entry.route.slice(0, -1))));
  return { ...config.globalHeaders, ...matchingRoute?.headers };
}

describe('Azure Static Web Apps release policy', () => {
  it('serves immutable, long-lived cache headers for deploy-versioned assets', () => {
    expect(headersFor('/assets/index-a1b2c3.js')['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(headersFor('/assets/index-a1b2c3.css')['Cache-Control']).toBe('public, max-age=31536000, immutable');
  });

  it('keeps HTML, the manifest, and the service worker revalidating', () => {
    const revalidating = 'no-cache, max-age=0, must-revalidate';
    expect(headersFor('/')['Cache-Control']).toBe(revalidating);
    expect(headersFor('/manifest.webmanifest')['Cache-Control']).toBe(revalidating);
    expect(headersFor('/sw.js')['Cache-Control']).toBe(revalidating);
  });

  it('sets the web-manifest MIME type and restrictive browser policies', () => {
    const headers = headersFor('/assets/index-a1b2c3.js');
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json');
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('uses the designed page with an HTTP 404 status for unknown paths', () => {
    expect(config.responseOverrides['404']).toEqual({ rewrite: '/404.html', statusCode: 404 });
  });

  it('serves the direct demo URL from its dedicated document', () => {
    expect(config.routes.find((route) => route.route === '/demo')?.rewrite).toBe('/demo/index.html');
  });
});
