# Independent verification — FAIL

**Verifier:** factory QA  
**Date:** 2026-08-28 UTC  
**Candidate:** `38a5464045026c8838f17920b6436f91a809945a`  
**Live URL:** <https://color-context.sociobot.in/>  
**Disposition:** **FAIL** — the application works for the brief's core local-first annotation job, but the deployed response policy does not meet the required immutable caching policy for hashed static assets and lacks baseline browser security policies.

## Environment and reproducibility

Started from a clean, unmodified checkout at the candidate SHA with Node `v22.23.2` and npm `10.9.8`.

```sh
npm ci
npx playwright install chromium
npm test
npm run build
```

`npm ci` completed with 0 vulnerabilities. The first `npm test` attempt correctly exposed that the clean environment did not include the browser required by the repository's pinned Playwright `1.62.1`; following the work-order instruction, `npx playwright install chromium` installed its matching Chromium. The complete retry passed: 3 Vitest tests and all 4 Playwright tests. `npm run build` passed (`tsc --noEmit && vite build`) and produced `dist/`. There are no separate lint or typecheck scripts; the build runs the available TypeScript check. `npm audit --omit=dev` reported 0 vulnerabilities.

## Product and browser evidence

All of the following were exercised against the live URL in Chromium. The production `index.html`, service worker, manifest, entry JS, entry CSS, lazy PDF chunk, and PDF worker each had byte-identical SHA-256 hashes to the fresh candidate build.

- Opened a local PNG, used keyboard-only `M`, arrow, and Enter to sample a cue, named it, saved it, and exported the annotated PNG.
- Exported a workspace JSON, imported it into a new browser context, restored the original and its label, then deleted and undid the deletion.
- Opened/annotated a local PDF in the repository browser suite; no upload request was made.
- Confirmed the 50 MiB boundary: a valid 50 MiB PNG opens; 50 MiB + 1 byte shows the explicit size error. Unsupported text input, a damaged PNG, and malformed workspace JSON each gave actionable errors, and a subsequent valid image recovered normally.
- Desktop and 390 px mobile: no horizontal document overflow at 390 px; primary open action remained visible. Keyboard focus reached a visible solid outline. Reduced-motion CSS reduced control transition duration to `0.01ms`.
- Axe 4.13 desktop/mobile scan: no serious or critical violations. Semantics: `lang=en`, one `h1`, `main`, image alt text, title, skip link, and visible focus. No page errors or console errors.
- Captured runtime requests used only `https://color-context.sociobot.in`; no analytics, uploads, remote fonts, CDN code, or third-party runtime requests appeared. Storage was limited to the declared local theme preference and IndexedDB.
- PWA: `navigator.serviceWorker.controller` was `/sw.js`; after it controlled the page, offline reload displayed the saved-device ledger and reopened the persisted image successfully. The installed app manifest is present with icons, standalone display, and start URL. The update handler is present in source; no distinct production service-worker revision exists to induce an update during this candidate check.
- Bundle budget: initial JS `33.19 kB` raw / `10.87 kB` gzip and CSS `20.41 kB` raw / `5.18 kB` gzip; both meet the static initial budgets. PDF.js (`433.00 kB` raw / `128.94 kB` gzip) and its worker are lazy-loaded only for PDFs. Hero AVIF is 20.2 kB at 720 px and 65.4 kB at 1200 px.

Lighthouse 12.8.2 mobile against live production produced Performance 97, Accessibility 100, Best Practices 100, and SEO 100 before its final full-page-screenshot artifact crashed in this container's Chrome 151/Lighthouse combination. Recorded metrics before that tooling crash were FCP 1.8 s, LCP 2.4 s, TBT 0 ms, and CLS 0. The functional Playwright checks above did not crash.

## Deployment and response evidence

`curl -I` for `/`, `/privacy/`, `/manifest.webmanifest`, `/sw.js`, and the hashed entry JS all returned HTTP/2 200, HSTS, `nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

They also returned the same unsuitable cache policy, including the hashed entry file:

```
Cache-Control: public, must-revalidate, max-age=30
```

The manifest was served as `Content-Type: application/octet-stream`, not a web-manifest/JSON content type. No `Content-Security-Policy`, `Permissions-Policy`, or frame-ancestor/X-Frame-Options policy was returned. Live artifact hashes matched the candidate, so these are verified deployment defects rather than a stale deployment.

## Defects

### P2 — Hashed static assets are not immutable or long-lived

The live hashed JS/CSS and all other checked static assets use `max-age=30, must-revalidate`, not long-lived immutable caching. This violates the PWA performance/caching acceptance requirement and forces revalidation on routine online loads. Configure the static host so content-hashed assets use a long-lived `Cache-Control: public, max-age=31536000, immutable`; retain short/no-cache revalidation only for HTML, manifest, and service worker.

### P2 — Deployment lacks a restrictive browser security policy

The live origin has no CSP, Permissions-Policy, or clickjacking protection. This local-first app renders user-controlled labels into an `innerHTML`-based UI, so escaping is helpful but should not be the only containment. Add a restrictive CSP appropriate for the self-hosted bundle (for example `default-src 'self'; script-src 'self'; worker-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`) plus a minimal Permissions-Policy and `frame-ancestors`/X-Frame-Options protection.

### P3 — Manifest is served as generic binary

`/manifest.webmanifest` returns `application/octet-stream`. Serve `application/manifest+json` (or `application/json`) to avoid browser/install compatibility risk.

## Required next step

Repair the deployment headers/cache configuration, deploy a new immutable artifact, and rerun this verification. Product code was not changed by QA.
