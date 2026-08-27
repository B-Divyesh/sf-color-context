import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const TEST_IMAGE = 'public/assets/icon-192.png';

test('opens, annotates, persists, and exports a local image', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');

  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('img', { name: /surreal paper landscape/i })).toBeVisible();

  await page.locator('#file-open').setInputFiles(TEST_IMAGE);
  await expect(page.getByRole('heading', { name: 'icon-192.png' })).toBeVisible();
  const canvas = page.locator('#document-canvas');
  await expect(canvas).toBeVisible();

  await page.getByRole('button', { name: /mark a cue/i }).first().click();
  await canvas.click();
  await page.getByLabel('What does this cue mean?').fill('System warning');
  await page.getByTitle('Dots').click();
  await page.getByRole('button', { name: 'Save label' }).click();
  await expect(page.getByText('System warning')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export workspace/i }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('.colorcontext.json');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'On this device' })).toBeVisible();
  await page.getByRole('button', { name: /icon-192.png/i }).click();
  await expect(page.getByText('System warning')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('has no serious axe findings at desktop and 390px', async ({ page }) => {
  await page.goto('/');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    if (width === 390) {
      await page.getByRole('button', { name: 'Change color theme' }).click();
      await page.getByRole('button', { name: 'Change color theme' }).click();
    }
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    expect(serious, serious.map((item) => `${item.id}: ${item.description}`).join('\n')).toEqual([]);
  }
});

test('renders and annotates a local PDF without an upload', async ({ page }) => {
  await page.goto('/');
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await page.locator('#file-open').setInputFiles({ name: 'local-report.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByRole('heading', { name: 'local-report.pdf' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Page 1 of/)).toBeVisible();
  const canvas = page.locator('#document-canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: /mark a cue/i }).first().click();
  await canvas.click();
  await page.getByLabel('What does this cue mean?').fill('PDF status cue');
  await page.getByRole('button', { name: 'Save label' }).click();
  await expect(page.getByText('PDF status cue')).toBeVisible();
});

test('reloads the app shell and saved workspace offline', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('#file-open').setInputFiles(TEST_IMAGE);
  await expect(page.locator('#document-canvas')).toBeVisible();
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'On this device' })).toBeVisible();
  await page.getByRole('button', { name: /icon-192.png/i }).click();
  await expect(page.locator('#document-canvas')).toBeVisible();
});
