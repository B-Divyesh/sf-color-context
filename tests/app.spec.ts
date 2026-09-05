import { mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Download, type Page } from '@playwright/test';

const FIXTURES = resolve(process.cwd(), 'tests/fixtures');
const MAX_FILE_BYTES = 50 * 1024 * 1024;

async function openDemo(page: Page): Promise<void> {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'release-status-sample.webp' })).toBeVisible();
  await expect(page.locator('#document-canvas')).toBeVisible();
}

async function addLabel(page: Page, label: string, pattern = 'Dots'): Promise<void> {
  const canvas = page.locator('#document-canvas');
  const mark = page.getByRole('button', { name: /mark a cue/i }).first();
  if (await mark.getAttribute('aria-pressed') !== 'true') await mark.click();
  await canvas.click({ position: { x: 120, y: 120 } });
  await page.getByLabel('What does this cue mean?').fill(label);
  await page.getByTitle(pattern).click();
  await page.getByRole('button', { name: 'Save label' }).click();
  await expect(page.getByText(label, { exact: true })).toBeVisible();
}

async function downloadBytes(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Download stream was unavailable.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('@claim:demo-isolation starts with a populated sample and never replaces real data', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('Needs review before release')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Demo reset to the original sample.')).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.waitForURL('/');
  await page.locator('#file-open').setInputFiles(resolve(FIXTURES, 'sample.png'));
  await expect(page.getByRole('heading', { name: 'sample.png' })).toBeVisible();
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'release-status-sample.webp' })).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.waitForURL('/');
  await expect(page.getByRole('button', { name: /sample\.png/i })).toBeVisible();
});

test('@claim:local-file-types-and-limit @claim:five-pixel-sampling @claim:six-textures-and-callouts @claim:edit-move-delete-undo', async ({ page }) => {
  test.setTimeout(70_000);
  await openDemo(page);
  for (const name of ['sample.png', 'sample.jpg', 'sample.webp', 'sample.gif']) {
    await page.locator('#file-open').setInputFiles(resolve(FIXTURES, name));
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await page.locator('#file-open').setInputFiles({ name: 'release-report.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByRole('heading', { name: 'release-report.pdf' })).toBeVisible({ timeout: 15_000 });
  const tempDirectory = mkdtempSync(resolve(tmpdir(), 'color-context-limit-'));
  try {
    const exactLimit = resolve(tempDirectory, 'exact-limit.webp');
    writeFileSync(exactLimit, readFileSync(resolve(FIXTURES, 'sample.webp')));
    truncateSync(exactLimit, MAX_FILE_BYTES);
    await page.locator('#file-open').setInputFiles(exactLimit);
    await expect(page.getByRole('heading', { name: 'exact-limit.webp' })).toBeVisible({ timeout: 30_000 });
    const overLimit = resolve(tempDirectory, 'too-large.webp');
    writeFileSync(overLimit, readFileSync(resolve(FIXTURES, 'sample.webp')));
    truncateSync(overLimit, MAX_FILE_BYTES + 1);
    await page.locator('#file-open').setInputFiles(overLimit);
    await expect(page.getByRole('alert')).toContainText('larger than 50 MB');
    await page.getByRole('button', { name: 'Dismiss' }).click();
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }

  await page.goto('/demo');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Demo reset to the original sample.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'release-status-sample.webp' })).toBeVisible();
  const canvas = page.locator('#document-canvas');
  await page.getByRole('button', { name: /mark a cue/i }).first().click();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Sample canvas did not have a bounding box.');
  await canvas.click({ position: { x: bounds.width * 850 / 1200, y: bounds.height * 303 / 800 } });
  await expect(page.locator('.sample-heading code')).toHaveText(/^#[0-9A-F]{6}$/);
  await page.getByRole('button', { name: 'Cancel' }).click();
  for (const [index, pattern] of ['Diagonal', 'Crosshatch', 'Dots', 'Bars', 'Checker', 'Rings'].entries()) {
    await addLabel(page, 'Texture label ' + (index + 1), pattern);
  }
  await expect(page.locator('.annotation-number')).toHaveCount(9);
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await page.getByLabel('What does this cue mean?').fill('Payments need review');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: /Payments need review/i }).click();
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).first().click();
  await expect(page.getByText('Payments need review', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Payments need review', { exact: true })).toBeVisible();
});

test('@claim:preserves-original-source @claim:annotated-png-export @claim:workspace-export-import @claim:local-persistence', async ({ page }) => {
  await page.route(/\/demo\/?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': "default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'",
      },
    });
  });
  await openDemo(page);
  const sourceDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /export workspace/i }).click();
  const sourcePayload = JSON.parse((await downloadBytes(await sourceDownload)).toString('utf8')) as { document: { dataUrl: string } };
  const exportedSource = Buffer.from(sourcePayload.document.dataUrl.split(',', 2)[1], 'base64');
  expect(exportedSource.equals(readFileSync(resolve(process.cwd(), 'public/assets/sample-release-board.webp')))).toBe(true);
  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /export png/i }).click();
  expect((await downloadBytes(await pngDownload)).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  await addLabel(page, 'Restored under CSP');
  const workspaceDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /export workspace/i }).click();
  const workspace = await downloadBytes(await workspaceDownload);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /remove file/i }).click();
  await page.locator('#workspace-import').setInputFiles({ name: 'restorable.colorcontext.json', mimeType: 'application/json', buffer: workspace });
  await expect(page.getByText('Restored under CSP', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Restored under CSP', { exact: true })).toBeVisible();
});

test('@claim:pwa-shell @claim:offline-reload @claim:update-notice', async ({ page, browser }) => {
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const installed = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest');
    const manifest = await response.json() as { display: string; icons: unknown[] };
    return { controlled: Boolean(navigator.serviceWorker.controller), display: manifest.display, icons: manifest.icons.length };
  });
  expect(installed).toEqual({ controlled: true, display: 'standalone', icons: 3 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('color-context-update')));
  await expect(page.getByRole('button', { name: 'Update now' })).toBeVisible();

  const offlineContext = await browser.newContext();
  const offlinePage = await offlineContext.newPage();
  try {
    await openDemo(offlinePage);
    await offlinePage.evaluate(() => navigator.serviceWorker.ready);
    await offlinePage.reload();
    await offlinePage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await offlineContext.setOffline(true);
    await offlinePage.reload();
    await expect(offlinePage.getByText('Offline — saved files and labels remain available.')).toBeVisible();
    await expect(offlinePage.getByText('Needs review before release', { exact: true })).toBeVisible();
  } finally {
    await offlineContext.close();
  }
});

test('@claim:themes-mobile-and-keyboard @claim:no-account-or-tracking @claim:self-hosted-runtime @claim:local-data-does-not-upload', async ({ page }) => {
  const requests: { method: string; url: string }[] = [];
  page.on('request', (request) => requests.push({ method: request.method(), url: request.url() }));
  await openDemo(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Change color theme' }).click();
  await expect(page.getByText('Theme set to light.')).toBeVisible();
  await page.getByRole('button', { name: /mark a cue/i }).first().click();
  const canvas = page.locator('#document-canvas');
  await expect(canvas).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const labelInput = page.getByLabel('What does this cue mean?');
  await labelInput.fill('Keyboard sample label');
  await expect(page.getByText('Theme set to light.')).not.toBeVisible({ timeout: 6_000 });
  await expect(labelInput).toHaveValue('Keyboard sample label');
  await page.getByRole('button', { name: 'Save label' }).click();
  await expect(page.getByText('Keyboard sample label', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await page.locator('#file-open').setInputFiles(resolve(FIXTURES, 'sample.png'));
  await expect(page.getByRole('heading', { name: 'sample.png' })).toBeVisible();
  await expect(page.locator('#document-canvas')).toHaveAttribute('aria-label', /^sample\.png/);
  await addLabel(page, 'Local-only label');
  expect(requests.every((request) => request.method === 'GET' && new URL(request.url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:free-no-payment states that the utility is free with no account or payment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Free: no account or payment.')).toBeVisible();
  await page.goto('/terms/');
  await expect(page.getByText('Color Context is a free utility provided under the MIT License.')).toBeVisible();
});

test('has no serious axe findings on the mobile landing and populated desktop demo', async ({ page }) => {
  for (const [route, width] of [['/', 390], ['/demo', 1280]] as const) {
    await page.goto(route);
    await page.setViewportSize({ width, height: 844 });
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    expect(serious, serious.map((item) => item.id + ': ' + item.description).join('\n')).toEqual([]);
  }
});

test('keeps hidden file controls out of keyboard focus order and has a usable 404 page', async ({ page }) => {
  await page.goto('/');
  const focusedIds: string[] = [];
  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press('Tab');
    focusedIds.push(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? ''));
  }
  expect(focusedIds).not.toContain('file-open');
  expect(focusedIds).not.toContain('workspace-import');
  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — Color Context');
  await expect(page.getByRole('heading', { name: 'This page is not here' })).toBeVisible();
});
