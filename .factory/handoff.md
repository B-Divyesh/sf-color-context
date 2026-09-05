# Color Context — repair 3 handoff

## Release

- Live URL: <https://color-context.sociobot.in>
- Implementation candidate: `926350dbd109a400fe78229a6428a731090b762b`
- Documentation handoff: the follow-up Git commit containing this file (separate from the implementation candidate above)
- Deployment: static product configuration, deployed successfully on 2026-09-05

The job is to label color-only cues in local files. It is for people with color-vision deficiency who need to read charts, status indicators, or marked-up documents. The first action is **Try it with sample data**.

## What changed

- Added the one-click `/demo` sandbox, including a realistic release-status image, three saved labels, the persistent “Demo — sample data, nothing is saved” label, **Reset demo**, and **Start for real**.
- Kept demo records in the separate IndexedDB database `demo:color-context`; real records remain in `color-context`. Leaving demo clears only demo data.
- Replaced the `fetch(data:)` workspace decoder with local base64 decoding. JSON export/import now works under the deployed restrictive `connect-src 'self'` CSP.
- Fixed the remove/import IndexedDB race and a toast rerender that could discard text being entered in a label field.
- Added `.factory/claims.json` with 17 public claims. Each claim has exactly one `@claim:<id>` outcome-based Playwright sandbox test. The tests cover normal, invalid, exact 50 MiB, over-limit recovery, keyboard, mobile, persistence, PWA update, offline reload, privacy requests, exports, and CSP-constrained import.
- Reworked the landing first screen, footer, navigation, legal pages, offline page, and 404 page. Added route titles, canonical and social metadata, sitemap entries, and a Static Web Apps 404 response override.
- Added a hand-authored sample image and a derived social image. Provenance is in `.factory/design.md` and the sample asset sidecar.
- Added demo, copy-audit, catalog-description, and updated README documentation. The catalog description is copied to `/work/.evidence/catalog-description.txt`.

## Review finding disposition

| Finding | Disposition |
| --- | --- |
| F1: no sample sandbox | Fixed: direct `/demo` is populated in one load, isolated, persistent-labeled, resettable, and discardable. |
| F2: CSP blocked JSON import | Fixed: no `data:` network fetch is used; live export/remove/import succeeded with `connect-src 'self'`. |
| F3: no claims manifest/tests | Fixed: 17 claims in `.factory/claims.json`; all declared commands passed. |
| F4: first-screen plain words/headline | Fixed: the h1, audience sentence, primary sample action, and three facts appear before scrolling. |
| F5: route, metadata, and site structure gaps | Fixed: `/demo`, Privacy, Terms, offline, and designed 404 routes have titles and standard navigation/footer structure. |
| F6: touch target and keyboard-focus gaps | Fixed: links/controls are 44 px where needed; file controls are removed from tab order; keyboard labeling is covered by a claim test. |
| F7: privacy contact did not work | Fixed: Privacy links to the project issue tracker as the contact route. |
| F8: missing required documentation | Fixed: README, MIT license (existing), claims, demo, copy audit, catalog description, and this handoff are present. |

Earlier verification findings remain covered: cache and MIME configuration, manifest icon/start route, restrictive headers, local persistence, local deletion, legal routes, and error/recovery behavior. The deliberate unknown-route HTTP 404 is a designed page and not a defect.

## Verification

From the documented clean setup, the following passed:

```sh
npm ci
npx playwright install chromium
npm test
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
```

- `npm test`: 8 tests passed in 32.9 seconds, including the manifest-tag assertion and Playwright Axe scans of the mobile landing and populated desktop demo. No serious or critical Axe findings.
- Every command declared in `.factory/claims.json` was run individually after the final repair: all 17 passed. The complete command log is `/work/.evidence/claims-repair-3-summary.txt`.
- `npm run build` wrote `dist/index.html`. Initial application JS is 11.95 kB gzip and CSS is 5.38 kB gzip. The PDF renderer is lazy-loaded rather than part of the initial application chunk.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `/opt/fleet/lib/verify-url.sh https://color-context.sociobot.in /work/.evidence/verify-url-repair-3` passed: HTTP 200, title, `lang`, one h1, main landmark, image alts, and no load-time console errors.
- Fresh live desktop and 390 px phone contexts verified the job, audience, primary action, no horizontal overflow, populated demo labels, demo reset, Start for real, JSON export/remove/import, Privacy, Terms, and the designed HTTP 404. No unexpected live console errors. Evidence: `/work/.evidence/live-repair-3.json`, `repair-live-desktop-demo.png`, and `repair-live-phone-demo.png`.
- Live CSP contains `connect-src 'self'`; imported workspaces restored successfully. The entry JS, CSS, service worker, and manifest matched the candidate byte for byte: `/work/.evidence/live-candidate-hashes.json`.
- Mobile Lighthouse on the HTTPS landing completed cleanly with Performance 100, Accessibility 100, Best Practices 100, and SEO 100. Report: `/work/.evidence/lighthouse-repair-3.json`.

## Product limits and next steps

Color Context records a person’s interpretation of a cue. It does not diagnose color vision, recover semantic meaning missing from the source, apply a correction to third-party live interfaces, or sync files between devices. Opened files and labels stay in the current browser unless the person explicitly exports a workspace or annotated PNG.

No external integration is required or configured. There are no accounts, payment flows, analytics, or remote APIs. Future work, if wanted, would be user-requested improvements to annotation workflows rather than a prerequisite for this release.
