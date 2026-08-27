# Color Context v1 handoff

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
