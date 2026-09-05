# Verification 3 — label color-only cues in local files

## Verdict

**FAIL — 2 findings, including 1 untested public claim.**

Color Context completes the main local annotation job and the deployed candidate matches the reviewed implementation. It cannot receive PASS because both persistent demo actions are below the required phone touch-target size, and the public **Reset demo** outcome does not have a complete regression test.

- Live URL: <https://color-context.sociobot.in>
- Verification date: 5 September 2026 UTC
- Implementation candidate: `926350dbd109a400fe78229a6428a731090b762b`
- Documentation reviewed: `77d0f8136670b9a09f08ff24e7c9edd05868842c`
- Finding count: 2
- Untested claim count: 1

Commit `77d0f81` changes only `.factory/handoff.md` after implementation commit `926350d`. Fresh-build and live SHA-256 values match for `index.html`, the entry JavaScript, the entry CSS, `sw.js`, and `manifest.webmanifest`.

## Job, audience, and first action before scrolling

- Job: label color-only cues in local files.
- Audience: people with color-vision deficiency who need to read charts, status indicators, or marked-up documents.
- First action: **Try it with sample data**. The adjacent text says it opens a populated status image with saved labels.

Fresh 1440 × 900 desktop and 390 × 844 phone contexts showed the job, audience, first action, and the three privacy, offline, and price facts before scrolling. Each page had one job-naming `h1`.

## Findings

### F1 — P2 — The two demo actions are too short for phone touch use

At 390 px on the live `/demo` page, the persistent demo controls measured:

| Control | Width | Height |
| --- | ---: | ---: |
| Reset demo | 102.06 px | 38 px |
| Start for real | 110.14 px | 38 px |

The attached accessibility and design contracts require touch targets to be at least 44 × 44 CSS px. Both controls are wide enough but 6 px too short. They are primary recovery and exit actions in the sample sandbox, so this is an accessibility defect rather than a visual preference.

Evidence: `/work/.evidence/verify3-live-audit.json` under `checks.phoneTargets`, and `/work/.evidence/verify3-live-phone-demo.png`.

### F2 — P2 — The Reset demo public claim has an incomplete declared test

The README tells visitors that **Reset demo** restores the original board. The `demo-isolation` browser test opens the untouched sample, clicks **Reset demo**, and checks only the success message. It does not change the sample before resetting or assert that the original three labels and source state are restored afterward. A success toast does not prove the promised result.

Independent live QA did change the sample, reset it, and confirm that the added label disappeared while the original three labels returned. The feature works live, but manual evidence does not replace the required outcome-based claim test. This leaves one public claim untested under the claims contract.

Evidence: `.factory/claims.json`, `tests/app.spec.ts:36`, `/work/.evidence/verify3-claims-summary.txt`, and `/work/.evidence/verify3-live-audit.json` under `checks.reset restores sample`.

## Demo and main workflow

The one-click sample flow passed on live desktop and phone:

- `/demo` opened `release-status-sample.webp` with three realistic saved labels.
- **Demo — sample data, nothing is saved** remained visible after edits and reload.
- Adding a label worked. Reset removed it and restored the original sample.
- **Start for real** returned to the real namespace.
- A real `sample.png` workspace remained intact across a demo visit and reset.
- IndexedDB exposed separate `color-context` and `demo:color-context` databases.
- Workspace JSON export, document removal, and import restored the sample under the live `connect-src 'self'` policy.
- Unsupported text and malformed JSON showed clear errors. A valid WebP opened after the file error.

The clean claim test also covered PNG, JPEG, WebP, GIF, PDF, exactly 50 MiB, 50 MiB plus one byte, six textures, sampling, editing, movement, deletion, undo, PNG export, persistence, mobile keyboard labeling, and recovery.

## Declared claim commands

Every command declared in `.factory/claims.json` ran separately from the clean checkout. All 17 commands exited successfully.

| Claim ID | Result |
| --- | --- |
| `demo-isolation` | Pass, with the Reset demo coverage gap in F2 |
| `local-file-types-and-limit` | Pass |
| `five-pixel-sampling` | Pass |
| `six-textures-and-callouts` | Pass |
| `edit-move-delete-undo` | Pass |
| `preserves-original-source` | Pass |
| `annotated-png-export` | Pass |
| `workspace-export-import` | Pass |
| `local-persistence` | Pass |
| `pwa-shell` | Pass |
| `offline-reload` | Pass |
| `update-notice` | Pass |
| `themes-mobile-and-keyboard` | Pass |
| `no-account-or-tracking` | Pass |
| `self-hosted-runtime` | Pass |
| `local-data-does-not-upload` | Pass |
| `free-no-payment` | Pass |

Full command summary: `/work/.evidence/verify3-claims-summary.txt`. Individual logs are `/work/.evidence/verify3-claim-<id>.log`.

## Accessibility, routes, privacy, and PWA

- Axe reported no violations on `/`, `/demo`, `/privacy/`, `/terms/`, `/offline.html`, `/404.html`, or the populated dark demo.
- Keyboard focus skipped both hidden file inputs and used a visible outline. The local claim created a label using the keyboard at 390 px.
- Reduced-motion transition and animation durations were `0.01ms`.
- The job, action, facts, and all content remained present in the 200% phone check.
- Light, dark, and system theme paths worked. The dark choice survived reload.
- All checked route titles, one-`h1` outlines, `lang`, `main`, image alt text, canonical metadata, navigation, footer, and legal pages were present.
- Every internal link, the privacy contact link, robots, sitemap, social image, favicon, and manifest icon returned HTTP 200.
- An unknown route returned deliberate HTTP 404 with the designed **This page is not here** page. Chromium logged the expected failed-document 404; there were no unexpected console or page errors.
- The main live workflow made 43 requests. Every request was a same-origin GET. No upload, analytics, tracking, external script, remote font, CDN, or API request appeared.
- The service worker controlled `/demo`, populated its versioned shell and runtime caches, reloaded the sample offline, and showed the offline notice. The update event exposed **Update now**.
- The manifest used standalone display, a versioned start URL, and 192, 512, and maskable icons.
- No backend, tenant, payment, account, or rate-limit surface exists, so backend isolation, persistence, health, and 429 checks do not apply.
- No missed AI-assisted step was found. The job depends on a person naming source meaning; model inference would conflict with the product's disclosed limitation and local-first privacy.

## Clean-checkout and performance results

Verification used a fresh detached checkout at documentation SHA `77d0f81`, Node `v22.23.2`, npm `10.9.8`, and the documented Playwright Chromium prerequisite.

| Check | Result |
| --- | --- |
| `npm ci` | Pass; 0 vulnerabilities |
| `npx playwright install chromium` | Pass |
| `npm test` | Pass; 10 Vitest tests and 8 Playwright tests |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass; `dist/index.html` produced |
| `npm audit --omit=dev` | Pass; 0 vulnerabilities |
| `/opt/fleet/lib/verify-url.sh` | Pass; title, lang, one h1, main, alt text, labels, and console checks |

Initial application JavaScript is 36.92 kB raw / 11.95 kB gzip. CSS is 21.71 kB raw / 5.38 kB gzip. PDF.js and its worker remain lazy chunks.

Fresh live mobile Lighthouse scores were Performance 100, Accessibility 100, Best Practices 100, and SEO 100. FCP was 1.0 s, LCP 1.0 s, TBT 20 ms, and CLS 0. Evidence: `/work/.evidence/verify3-lighthouse.json`.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| No one-click sample sandbox | Fixed. The populated isolated sample, persistent banner, reset, and real-data separation passed live. |
| Live CSP blocked JSON import | Fixed. Live export, remove, and restore passed under the deployed CSP. |
| No claims manifest or tagged tests | Mostly fixed. All 17 declared commands pass, but Reset demo remains incompletely tested in F2. |
| First screen did not state the job, audience, action, and three facts | Fixed on desktop and phone before scrolling. |
| Demo, metadata, navigation, sitemap, legal, and 404 gaps | Fixed. The deliberate unknown-route 404 is expected and is not a defect. |
| Invisible keyboard stops and short wordmark/footer targets | The hidden inputs and earlier targets are fixed. The new demo actions have the separate 38 px failure in F1. |
| Privacy contact had no usable destination | Fixed. The GitHub issues destination returned HTTP 200. |
| Demo and copy documentation missing | Fixed. Required factory files and README content are present. |
| Hashed assets lacked immutable caching | Fixed. Live hashed assets use long-lived immutable caching. |
| CSP, frame protection, permissions policy, and manifest MIME were missing | Fixed. Live response headers and manifest MIME are correct. |
| Immediate IndexedDB reload could lose a record | Fixed. Persistence passed in the declared claim and full suite. |

## Required next steps

1. Give **Reset demo** and **Start for real** a minimum 44 px touch height at phone widths.
2. Change the Reset demo browser test so it first changes the sample, resets it, then asserts the original source and all three original labels are restored.
3. Rerun every claim command and independent verification after the code repair is deployed.

No product code, deployment, infrastructure, account, or persistent user data was changed during this verification.
