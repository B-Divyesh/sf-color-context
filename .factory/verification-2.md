# Independent verification 2 — PASS

**Verifier:** Factory QA  
**Date:** 2026-08-28 UTC  
**Candidate:** `d7a4d25c570f507e23405609de9d7481204ed0ae`  
**Live URL:** <https://color-context.sociobot.in/>  
**Disposition:** **PASS** — the deployed PWA matches this candidate and fulfils the researched local-first annotation job. No release-blocking or non-blocking product defects were found.

## Reproducibility and repository gates

Verification began from a clean checkout at the candidate SHA (`main` and `origin/main` both resolved to `d7a4d25c570f507e23405609de9d7481204ed0ae`) using Node 22.23.2 and npm 10.9.8.

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

- `npm ci`: passed; npm reported 0 vulnerabilities.
- `npm test`: passed — 6 Vitest assertions and all 6 Playwright flows passed in 24.8 s. Coverage includes image annotation/export, desktop and 390px axe scans, PDF annotation, offline reload, immediate IndexedDB persistence, and keyboard annotation.
- `npm run typecheck` and `npm run lint`: passed (`tsc --noEmit`).
- `npm run build`: passed and produced `dist/`.

## End-to-end product evidence

Fresh Chromium checks used both `http://127.0.0.1:4173` from the exact production build and the live URL.

- Opened a local PNG, sampled the top-left boundary pixel (`#15161C`), saved a 120-character label with a Checker texture, toggled overlays, exported annotated PNG and restorable JSON, deleted the label with confirmation, undid it, and reloaded the persisted workspace.
- Exercised keyboard marking with `M`, arrow movement, and Enter; the repository suite separately exercised a local PDF and saved a PDF cue. The visible focus treatment was present (solid 3px skip-link outline; marking canvas adds a 5px acid focus/state ring).
- Invalid/recovery cases behaved clearly: unsupported text input, malformed workspace JSON, blank required label, and a real 50 MiB + 1 byte image each gave an actionable error. Dismissal followed by a valid local image recovered normally.
- At 390px, `scrollWidth === clientWidth === 390`; the open action and horizontally scrollable tool rail remained operable. Desktop and mobile screenshots matched the documented cartographer-workbench layout.
- Axe found no serious or critical findings on empty and populated desktop/mobile states. The page has `lang="en"`, a title, one `h1`, `main`, a skip link, semantic controls, descriptive image alt text, and no browser console or page errors.
- With `prefers-reduced-motion: reduce`, UI transition/animation durations computed to `0.01s`.

## Privacy, PWA, response, and deployment evidence

- Browser request capture during opening, annotation, export, reload, and PDF/image flows recorded no outbound origins: no uploads, analytics, CDN runtime code, remote font, or tracking request occurred. Documents/labels remained in IndexedDB and theme preference in localStorage.
- On the live origin `navigator.serviceWorker.controller` controlled `/sw.js`; its versioned shell cache was populated. After setting the browser offline, a reload showed the offline banner, **On this device** ledger, saved label, and reopened document. The service worker source implements `skipWaiting`, `clients.claim`, cache cleanup, and the in-app update event path.
- The manifest has standalone display, `start_url` with an install version query, theme/background colors, and 192/512/maskable icons. `manifest.webmanifest` is served as `application/manifest+json`.
- Live and fresh candidate SHA-256 values matched for HTML, entry JS, entry CSS, service worker, and manifest. Entry JS: `72323fb183cda53d0c88bed2c5120236b6984133300388467553573416237aee`; entry CSS: `6916465d7063237052c2d87e3cd2a132b992a672491919057c8cb1e146dd1a56`; `sw.js`: `70e92ad103a4690cb759f115ce10d857fb10bcba723784dfe099dd9b6ebd239d`.
- Live root, legal pages, manifest, and service worker use `no-cache, max-age=0, must-revalidate`; hashed JS/CSS use `public, max-age=31536000, immutable`. Live responses include the configured restrictive CSP, Permissions-Policy, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict referrer policy.

## Performance

- Initial entry JS: 33.48 kB raw / 10.93 kB gzip; CSS: 20.41 kB raw / 5.18 kB gzip — both under the required static budgets. PDF.js (433.00 kB) and its 1.26 MB worker are dynamic imports used only after a local PDF is selected. The 720px hero AVIF is 20.17 kB.
- Lighthouse 13.4.1 mobile, live production: **Performance 96**, **Accessibility 100**, **Best Practices 100**, **SEO 100**. Lab metrics: FCP 1.0 s, LCP 1.2 s, CLS 0, TBT 230 ms. INP is not a synthetic Lighthouse lab metric.

## Defects by severity

None found.

The earlier verification's deployment caching, MIME, and browser-policy failures are resolved in this candidate's live deployment.
