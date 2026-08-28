# Color Context — independent QA handoff

## PASS

Candidate `d7a4d25c570f507e23405609de9d7481204ed0ae` **PASSed** independent QA on 2026-08-28 UTC. The exact deployed artifact at <https://color-context.sociobot.in/> matches the fresh production build; no defects were found.

## How verified

From a clean checkout:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

All commands passed. The test suite contains 6 Vitest assertions and 6 Playwright flows, including image/PDF annotation, export, persistence, keyboard control, axe checks, and offline reload.

Independent live Chromium verification also covered valid and invalid local inputs, 50 MiB + 1 byte rejection and recovery, a 120-character label, deletion/undo, JSON/PNG export, 390px mobile, keyboard focus, reduced motion, response headers, local-only network behavior, PWA service worker/offline reload, and deployment-to-build hashes.

Lighthouse mobile on live production: Performance 96, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.2 s, CLS 0, TBT 230 ms. Initial entry JS is 33.48 kB raw / 10.93 kB gzip and CSS is 20.41 kB raw / 5.18 kB gzip.

The live URL has immutable hashed assets, revalidated HTML/manifest/service worker, manifest MIME, restrictive CSP, Permissions-Policy, HSTS, nosniff, frame protection, and strict referrer policy. Runtime request capture found no third-party requests, upload, tracking, remote fonts, or CDN runtime code.

## Product limits and next step

The documented limitation remains intentional: annotations add user-supplied context and texture but cannot infer meaning absent from a source. Users should export JSON before clearing site data. The next product-validation step is the proposed 15-person task study.

See [verification-2.md](verification-2.md) for exact evidence and hashes.
