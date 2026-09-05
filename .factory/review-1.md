# Review 1 — label color-only cues in images and PDFs

## Verdict

**FAIL — 8 findings, including 3 P1 findings, and 16 untested public claims.**

This is not a strict PASS. The live app handles its basic local annotation flow, but it has no required sample-data sandbox and its advertised workspace restore fails under the live Content Security Policy.

- Live URL: <https://color-context.sociobot.in/>
- Review date: 2026-09-05 UTC
- Implementation candidate: `6f0db57b7817a1dfba09bc2a6736821bc2d16ee3`
- Documentation base reviewed: `41c60f1c1782eabdc8bfa1672688568e8bec1ceb`
- Finding count: 8
- Untested claim count: 16

The implementation candidate is the last commit that changed runtime code. Commits `d7a4d25` and `41c60f1` changed reports only. Fresh-build and live SHA-256 values match for `index.html`, entry JavaScript, entry CSS, `sw.js`, and `manifest.webmanifest`.

## Job, audience, and first action before scrolling

- Job: add a name and texture to a color-only cue in an image or PDF.
- Audience: people with color-vision deficiency who need to understand charts, status indicators, or marked-up documents.
- First live action: **Open a file** or **Open an image or PDF**.

On desktop and at 390 px, the job appears as an `h2`, not the page `h1`. The only `h1` is the product name. The first screen does not name the audience. It does not offer **Try it with sample data** or show the required three facts about privacy, offline use, and price.

## Findings

### F1 — P1 — The required one-click sample sandbox does not exist

Neither `/demo` nor `/?demo=1` enters a demo. Both show the normal empty app. The landing page has no **Try it with sample data** action. There is no realistic populated sample, persistent **Demo — sample data, nothing is saved** label, **Reset demo**, **Start for real**, or separate `demo:` storage namespace. `/demo` returns the ordinary page with HTTP 200 and the ordinary title.

This blocks the required sample workflow and prevents proof that sample actions do not touch real data. The independent real workflow was therefore run only in a fresh disposable browser context, which began with zero IndexedDB documents and was destroyed after the check.

### F2 — P1 — Exported workspaces cannot be restored on the live site

The live app exported `color-garden-720.colorcontext.json` with the source and one saved label. Importing that export in a second fresh browser context failed with:

> That workspace could not be imported. Failed to fetch

The browser console shows that `connect-src 'self'` blocks the app's `fetch(data:image/webp;base64,...)` call. The implementation uses `fetch()` to convert the exported data URL back into a blob, while the deployed CSP does not allow `data:` in `connect-src`.

This makes the README and UI claim of a “restorable” or “portable” workspace false in production. The repository browser tests run behind Vite without production response headers and do not test import, so they miss this failure.

### F3 — P1 — Public claims are not declared or tested under the claims contract

`.factory/claims.json` is absent. No test contains an `@claim:<id>` tag. There are therefore no declared claim commands to run, while 16 distinct claims appear on the live site or in the README. Every claim lacks the required clean-sandbox test; one claim, JSON restore, is also false live.

The full claim inventory is below. This finding alone prevents PASS.

### F4 — P2 — The first screen and copy do not meet the plain-words contract

- The `h1` is **Color Context**, not a title naming the job.
- The audience is not named.
- The primary action is a real file picker, not the required sample action.
- Only one short fact is shown; offline use and price are absent.
- Visible copy uses prohibited metaphor: “Color is the terrain. Meaning is the map.”
- Section labels such as “Three moves” and “Keep the original. Add context.” are less direct than headings that name the section's purpose.

### F5 — P2 — Required routes, metadata, and shared site structure are incomplete

- An unknown URL returns HTTP 200 and the home page. There is no designed 404 response or route.
- `/demo` is not a demo and has the home title rather than `Demo — Color Context`.
- The root and other routes have no canonical URL, Open Graph metadata, Twitter card metadata, or product-specific 1200×630 social image.
- Privacy and Terms lack the standard navigation and skip link. The offline page has no header, navigation, or footer.
- The home header has no Demo or Privacy navigation. Its wordmark links to `#main-content`, not `/`.
- The footer omits “Built by Param Factory” and a version or build ID.
- The sitemap lists only `/`, `/privacy/`, and `/terms/`; it cannot list a real demo or 404 route because neither exists.

The legal route titles themselves are correct, and all actual links crawled returned HTTP 200.

### F6 — P2 — Keyboard focus and touch targets have accessibility gaps

At 390 px, the home wordmark measures 42 px high and the Privacy and Terms links measure 20 px high. The same footer links are 20 px high on desktop. These fail the attached 44×44 px touch-target rule. The visually hidden file inputs are not counted as touch targets because visible buttons provide the intended controls.

Those two visually hidden file inputs remain in the keyboard tab order. After the visible theme button, Tab focuses `#file-open` and then `#workspace-import`, each in a clipped 1×1 px box. Their computed outline exists but is not visibly usable, so keyboard users encounter two invisible focus stops.

Automated axe scans found no violations on empty and populated pages in system, light, and dark themes. Keyboard marking, reduced motion, and 390 px layout passed. These results do not remove the manual target-size failure.

### F7 — P3 — The privacy contact instruction has no usable destination

The Privacy page says questions can be sent through a project repository “linked by the Param Factory,” but it provides no repository or contact link. A visitor cannot complete that privacy-contact action. Local file deletion itself passed: after confirming **Remove file**, a reload showed no recent-file ledger.

### F8 — P3 — Required demo and copy documentation is missing

`.factory/demo.md` and `.factory/copy-audit.md` are absent. The README has no demo URL or sandbox explanation. This is separate from the missing `.factory/claims.json` in F3.

## Claim inventory

All 16 rows are untested under the attached claims contract because there is no claims manifest and no tagged claim test. Manual evidence does not replace that requirement.

| # | Public claim | Manual review result | Required claim test |
| --- | --- | --- | --- |
| 1 | Opens PNG, JPEG, WebP, GIF, and multi-page PDF up to 50 MB | Partial pass; WebP at exactly 50 MiB opened, 50 MiB + 1 byte was rejected, and repository PDF flow passed | Missing |
| 2 | Samples a five-pixel area and shows a readable hex value | Partial pass | Missing |
| 3 | Provides six textures, numbered callouts, and labels | Partial pass | Missing |
| 4 | Supports selection, editing, movement, deletion, and undo | Partial pass; delete and undo passed live | Missing |
| 5 | Preserves the original source | Not independently proved pixel-for-pixel | Missing |
| 6 | Exports an annotated PNG | Passed live | Missing |
| 7 | Exports and imports a restorable JSON workspace | **Failed live on import** | Missing |
| 8 | Persists work in IndexedDB and shows a recent-file ledger | Passed live across reload | Missing |
| 9 | Is installable as a PWA | Manifest and icons present; installation UI not exercised | Missing |
| 10 | Works offline after the first visit | Passed live with a saved document | Missing |
| 11 | Shows an app update state | Handler exists in source; a real update was not induced | Missing |
| 12 | Supports system/light/dark, mobile, pointer, and complete keyboard paths | Partial pass; themes, mobile, pointer, and core keyboard path passed | Missing |
| 13 | Uses no accounts, analytics, or tracking | Manual source and request capture passed | Missing |
| 14 | Uses no remote fonts, third-party runtime scripts, CDN, or external API | Manual bundle and request capture passed | Missing |
| 15 | Does not upload files; data stays local unless exported | Manual request capture passed | Missing |
| 16 | The utility is free | Stated in Terms; no claim test exists | Missing |

## Checks that passed

- Clean checkout: `npm ci`, `npx playwright install chromium`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit --omit=dev` passed.
- Tests: 6 Vitest assertions and 6 Playwright flows passed.
- Build: `dist/index.html` exists. Initial JavaScript is 33.48 kB raw / 10.93 kB gzip; CSS is 20.41 kB raw / 5.18 kB gzip.
- Live basic verifier: HTTP 200, title, `lang=en`, one `h1`, `main`, image alt text, labeled buttons, and no load-time console errors passed.
- Live workflow: invalid type, damaged image, malformed JSON, 50 MiB + 1 byte, and recovery behaved clearly. A valid exact-50-MiB WebP opened. Keyboard marking, label save, PNG/JSON export, delete/undo, reload persistence, and offline reopen passed.
- Privacy request capture during the main flow used only `https://color-context.sociobot.in`; no third-party request or upload occurred.
- Mobile: no horizontal overflow at 390 px. Reduced-motion durations computed to `0.00001s`.
- Axe: no violations on empty desktop/mobile, populated workbench, legal pages, offline page, or system/light/dark themes.
- PWA: manifest, icons, active service worker, offline banner, cached shell, saved ledger, and offline document reopen passed.
- Response policy: hashed JS/CSS use one-year immutable caching; HTML, manifest, and service worker revalidate; manifest MIME and the earlier security headers are present.
- Lighthouse 13.0.1 produced Performance 100, Accessibility 100, Best Practices 100, and SEO 100; FCP 1.0 s, LCP 1.2 s, TBT 0 ms, CLS 0. The CLI reported a browser-tab crash after writing the complete JSON artifact, so the nonzero tool exit is recorded rather than hidden.

## Earlier finding disposition

| Earlier item | Current disposition |
| --- | --- |
| Hashed assets lacked immutable caching | Resolved; live JS/CSS use `public, max-age=31536000, immutable` |
| CSP, Permissions-Policy, and frame protection were absent | Original finding resolved; all headers are present. The CSP causes the new F2 import regression |
| Manifest used a generic binary MIME type | Resolved; live type is `application/manifest+json` |
| IndexedDB save could lose a record on immediate reload | Resolved; live reload persistence passed and matches `6f0db57` |
| Prior verification said live JSON restore passed | Not supported now; a clean live import fails under the unchanged deployed CSP |
| GIFs use one frame, sources are reduced to a 2600 px edge, and there is no sync | Still disclosed product limits; no new defect against the brief |
| Users should export JSON before clearing site data | Still disclosed, but the exported backup cannot currently be restored live (F2) |

## Evidence

- `/work/.evidence/live-audit.json`
- `/work/.evidence/live-desktop.png`
- `/work/.evidence/live-mobile.png`
- `/work/.evidence/live-demo.png`
- `/work/.evidence/live-404.png`
- `/work/.evidence/live-mobile-200-percent.png`
- `/work/.evidence/verify-url/verify.json`
- `/work/.evidence/lighthouse.json`

No product code, deployment, infrastructure, user account, or persistent user data was changed during this review.
