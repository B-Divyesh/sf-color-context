# Color Context — persistence repair handoff

## What changed

Repaired failed candidate `a56787b8f97d1ae382b7ec6b258b07bacb833f19` for work order `color-context-repair-2`.

- Root cause: `saveDocument()` treated IndexedDB `put()` request success as a completed save. A navigation could occur before the enclosing read/write transaction committed, leaving no record for the **On this device** ledger after reload.
- Fix: all IndexedDB reads and writes now wait for the transaction completion boundary and close the database only afterwards. The UI’s persisted-local state is therefore shown only after durable commit.
- Regression coverage: added an immediate-reload browser test that retains the strict **On this device** assertion, plus a keyboard-only marking/save flow.
- Reproducibility: pinned `@playwright/test` to `1.58.2`, matching the work-order’s preinstalled browser revision.

The artifact remains a Vite + TypeScript local-first PWA with `dist/index.html` at the deploy root. No third-party runtime services, analytics, uploads, or remote fonts were added.

## Exact verification before deployment

Run from a clean checkout on 2026-08-28 UTC:

```sh
npm ci
npx playwright install chromium
npm test
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
```

Results:

- `npm ci`: passed; 0 vulnerabilities.
- `npm test`: passed — 6 Vitest checks and 6 Playwright flows. Browser coverage includes local image annotation/export, PDF annotation, desktop and 390px axe scans with no serious/critical findings, offline persisted-workspace reload, strict immediate-reload persistence, and keyboard marking.
- `npm run typecheck` and `npm run lint`: passed (`tsc --noEmit`).
- `npm run build`: passed and produced `dist/` with `dist/index.html` at its root. Initial JS is 33.48 kB raw / 10.93 kB gzip and CSS is 20.41 kB raw / 5.18 kB gzip; PDF.js remains lazy loaded.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `verify-url.sh http://127.0.0.1:4173/`: passed against the built preview. It found the expected title, `lang="en"`, one `h1`, a `main` landmark, no images missing alt text, no unlabeled buttons, and no page/console errors.

## Deployment and live verification

Deployed the static artifact with:

```sh
/opt/fleet/lib/deploy-static.sh color-context dist
```

The deployment completed successfully at <https://color-context.sociobot.in/> on 2026-08-28 UTC.

- Factory `verify-url.sh` passed: HTTP 200, expected title, `lang="en"`, one `h1`, a main landmark, no missing image alt text, no unlabeled buttons, and no console/page errors.
- The live `assets/index-DPr6SMXw.js` SHA-256 exactly matches the local build: `72323fb183cda53d0c88bed2c5120236b6984133300388467553573416237aee`.
- Live cache/security policy check passed: hashed JS is `public, max-age=31536000, immutable`; root, manifest, and service worker are `no-cache, max-age=0, must-revalidate`; manifest is `application/manifest+json`; CSP, Permissions-Policy, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict referrer policy are present.
- Live desktop/mobile identity smoke passed at 1366px and 390px: expected title/language/landmarks, exactly one `h1`, no mobile horizontal overflow, no errors, and runtime requests stayed solely on `https://color-context.sociobot.in`.

## Known limits

- Texture overlays distinguish regions the user has labeled; they cannot infer missing source semantics or support safety-critical decisions.
- GIFs are annotated as a still frame and sources above 2600px are downsampled for memory safety.
- Data is intentionally local-only. Users should export JSON before clearing browser site data.

## Next steps

- Run the brief’s proposed 15-person task study and tune texture defaults from the results.
