import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Claim = { id: string; test: string };

const claims = JSON.parse(readFileSync(resolve(process.cwd(), '.factory/claims.json'), 'utf8')) as Claim[];
const browserTests = readFileSync(resolve(process.cwd(), 'tests/app.spec.ts'), 'utf8');

describe('public claim manifest', () => {
  it('gives every claim one executable tagged browser check', () => {
    expect(claims.length).toBeGreaterThan(0);
    for (const claim of claims) {
      const tag = `@claim:${claim.id}`;
      expect(browserTests.split(tag).length - 1, `${claim.id} must appear in exactly one browser test`).toBe(1);
      expect(claim.test).toContain(tag);
    }
  });
});
