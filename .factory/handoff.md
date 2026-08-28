# Color Context v1 repair handoff

## Release-blocking QA repair (2026-08-28 UTC)

This repair starts from the independently verified candidate `38a5464045026c8838f17920b6436f91a809945a` and fixes every finding in [`.factory/verification.md`](verification.md) without changing the annotation product behavior that passed QA.

- Added `public/staticwebapp.config.json`, the Azure Static Web Apps deployment configuration. It is copied to `dist/` and replaces the deploy helper's insecure fallback configuration.
- `/assets/*` now receives `Cache-Control: public, max-age=31536000, immutable`, including Vite's content-hashed JavaScript and CSS.
- `/`, HTML pages, `/manifest.webmanifest`, and `/sw.js` receive `Cache-Control: no-cache, max-age=0, must-revalidate` so application updates remain discoverable.
- The web manifest declares `application/manifest+json` through Azure's `mimeTypes` mapping.
- Every response receives a self-only CSP, a minimal deny-by-default Permissions-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and the existing strict referrer policy. The CSP permits only the local bundle, local worker, and the app's required local `blob:`/`data:` image sources; its narrowly scoped `style-src 'unsafe-inline'` is required by the workbench's dynamic canvas and sampled-colour style attributes.
- Added exact regression coverage in `src/staticwebapp-config.test.ts`: immutable hashed JS/CSS caching, revalidating shell/manifest/service-worker caching, manifest MIME type, CSP, Permissions-Policy, frame protection, and nosniff.

## Repair verification before deployment

- Clean install: `npm ci` completed with 0 vulnerabilities. The pinned Playwright `1.62.1` needed its matching browser in this clean environment, so `npx playwright install chromium` was run as prescribed.
- Type/lint: `npm run typecheck` and `npm run lint` passed (both run strict `tsc --noEmit`).
- Tests: `npm test` passed — 6 Vitest tests (including 3 response-policy regressions) and 4 Playwright flows. The browser coverage includes desktop, 390 px mobile axe scans with no serious/critical findings, local image and PDF annotation, export/persistence, and an explicit offline reload using `context.setOffline(true)`.
- Production build: `npm run build` passed and generated `dist/index.html` plus `dist/staticwebapp.config.json`. Initial JavaScript is 33.19 kB raw / 10.87 kB gzip and CSS is 20.41 kB raw / 5.18 kB gzip; the lazy PDF chunk remains 433.00 kB raw / 128.94 kB gzip.
- Azure Static Web Apps emulator: confirmed the asset response's immutable cache header, shell/service-worker revalidation, manifest `Content-Type: application/manifest+json`, CSP, Permissions-Policy, and `X-Frame-Options`. The workbench and a local PDF render under that CSP with no console errors.
- Keyboard smoke: `M` → arrow key → `Enter` opened the label composer; submitting the focused label input saved the annotation, and the next focused control had a visible outline.
- `verify-url.sh` against the Azure emulator passed: HTTP 200, title, `lang=en`, one h1, main landmark, image alt coverage, no unlabeled buttons, and no console errors at desktop or 390 px.
- Lighthouse 13.4.1 mobile against the Azure emulator: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.2 s, LCP 1.9 s, TBT 0 ms, CLS 0.
- `npm audit --omit=dev`: 0 vulnerabilities. This is a private static application, so no package-consumer test applies.

## Deployment and live verification

- Deployed the static `dist/` artifact through `/opt/fleet/lib/deploy-static.sh color-context dist` to <https://color-context.sociobot.in/>.
- Live SHA-256 values matched the locally rebuilt artifact for `index.html` (`745333c2b4f9b58440821cc35be4cd9b0c192cbda13eb77e4df4e5bb79f19c09`), `manifest.webmanifest` (`f168826e2949cee9020fc9f1bff24b6ae8b0c6d4a91a7db96570a952df5dbfe4`), `sw.js` (`0ece56cf78413018d3e5a2c70b3dd7a0a486186fc06a99a03ed5b99ed3cf3845`), and the entry script `assets/index-D8Ha1k46.js` (`36f2141fba353e57373a37b5d20447175d1aaa8bc0deb903fd2a8ff2f9230e4b`).
- Live `/assets/index-D8Ha1k46.js` returns `Cache-Control: public, max-age=31536000, immutable`; `/`, `/privacy/`, `/terms/`, `/manifest.webmanifest`, and `/sw.js` return `no-cache, max-age=0, must-revalidate`. The manifest now returns `Content-Type: application/manifest+json`.
- Live root, assets, manifest, service worker, privacy, and terms all return the CSP, Permissions-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and strict referrer policy specified in the checked-in configuration.
- Factory `verify-url.sh` against live passed: HTTP 200; expected title, language, h1, and main landmark; zero images without alt text; zero unlabeled buttons; and zero console/page errors. It also captured desktop and 390 px screenshots.
- Live 390 px smoke passed with no horizontal overflow. Keyboard marking (`M`, arrow, `Enter`) saved a label, the persisted local file reopened after an offline reload, and all runtime requests stayed on `https://color-context.sociobot.in` with no console errors.
- Lighthouse 13.4.1 mobile against live: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.2 s, TBT 0 ms, CLS 0.

## Shipped

- A responsive local image/PDF workbench for the brief’s real job: users sample a rendered cue, name its meaning, and bind it to one of six distinct monochrome textures.
- Image support for PNG, JPEG, WebP, and GIF; lazy-loaded PDF.js support for multi-page PDFs. Inputs are capped at 50 MB and invalid/unsupported files receive actionable errors.
- Numbered canvas callouts, visible hex samples, edit, selection, arrow-key nudging, adjustable texture strength, overlay visibility, zoom, delete confirmation, and single-step undo.
- Local persistence in IndexedDB, a recent-workspace ledger, annotated PNG export, and complete JSON workspace export/import including the original file.
- Installable PWA manifest, custom 192/512/maskable icons, versioned service-worker caches, build-time precaching of hashed assets (including lazy PDF assets), network/offline notices, fallback page, and update notification.
- System/light/dark themes; responsive 390 px layout; privacy and terms pages; no analytics, remote fonts, runtime CDNs, accounts, or uploads.
- Original surreal editorial hero artwork in AVIF/WebP/JPEG, with source, generator metadata, review notes, and full prompt provenance under `assets/src/` and `.factory/design.md`.

## Run and verify

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Production output is exactly `dist/`, with `dist/index.html` at its root.

## Verification performed (2026-08-27 UTC)

- `npm test`: pass — 3 Vitest unit checks and 4 Playwright browser flows.
- Browser coverage: image open → sample → texture → label → persistence → JSON download; PDF render and annotation; offline reload with a persisted file; desktop and 390 px axe scans.
- Axe 4.13: no serious or critical findings at 1280 px light treatment or 390 px dark treatment.
- Factory `verify-url.sh`: pass — title present, `lang="en"`, exactly one h1, main landmark, all images have alt text, no unlabeled buttons, and no console/page errors.
- Lighthouse 12.8.2 mobile: Performance 96, Accessibility 100, Best Practices 100, SEO 100. Metrics: FCP 1.0 s, LCP 1.6 s, TBT 230 ms, CLS 0.
- Production assets: initial JS 33.19 KB raw / 10.87 KB gzip; CSS 20.41 KB raw / 5.18 KB gzip. PDF.js (433 KB raw) and its worker load only for PDFs. Hero is 20 KB AVIF at 720 px and 64 KB AVIF at 1200 px; WebP/JPEG fallbacks are all below 108 KB.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Known gaps and honest limits

- Texture overlays can distinguish regions a user has marked, but cannot infer absent legend semantics or make a safety-critical decision. This limitation is prominent in the product and terms.
- Animated GIFs are treated as a still frame so annotations remain spatially stable.
- Very large sources are downsampled to a maximum 2600 px canvas edge to bound memory and export cost.
- Workspaces are browser-local and intentionally do not sync. Users should export JSON backups before clearing site data.
- PWA installation is implemented for browsers that support web manifests; no native Capacitor wrapper was needed for this static v1.

## Suggested next steps

- Run the brief’s 15-person task study and compare correct color-only legend/status identification against each participant’s baseline.
- Use feedback to tune default texture radius and offer reusable label vocabularies without introducing diagnostic claims.
