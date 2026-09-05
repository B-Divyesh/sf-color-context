# Color Context

Label color-only cues in local files.

Color Context is for people with color-vision deficiency who need to read charts, status indicators, and marked-up documents. Open a local image or PDF, sample a cue, add a personal label, and use a texture that does not depend on color alone.

Try the populated, isolated sample at [color-context.sociobot.in/demo](https://color-context.sociobot.in/demo). It opens a release-status board with three saved labels. The demo banner says **“Demo — sample data, nothing is saved.”** Use **Reset demo** to restore that board or **Start for real** to discard the sample and return to your own browser storage.

Color Context is not a color-vision diagnostic. It cannot infer a meaning that the source does not provide.

## What it does

- Opens local PNG, JPEG, WebP, GIF, and PDF files up to 50 MB.
- Samples a five-pixel area and shows a hex value.
- Saves labels with six monochrome textures and numbered callouts.
- Lets you select, edit, move, delete, and undo labels.
- Keeps the original source unchanged.
- Downloads an annotated PNG and exports or restores a JSON workspace.
- Keeps saved work in browser IndexedDB after a reload.
- Provides an installable PWA shell, offline reload after the first visit, and an update action.
- Supports system, light, and dark themes, mobile layouts, pointer input, and keyboard labeling.
- Uses no accounts, analytics, tracking, remote fonts, third-party scripts, CDN, external API, or document uploads.
- Is free. It needs no account or payment.

Every public claim above has an outcome-based browser check in [.factory/claims.json](.factory/claims.json). The checks run from the demo entry point with shipped sample data.

## Keyboard

- O: open a file
- M: enter or leave marking mode
- Arrow keys: move the marking crosshair, or nudge a selected annotation
- Shift + Arrow: move by ten image pixels
- Enter or Space: sample at the keyboard crosshair
- Escape: leave marking mode
- Delete or Backspace: remove a selected annotation after confirmation

## Run locally

Requires Node.js 20 or newer.

    npm ci
    npx playwright install chromium
    npm run dev

Open the local URL printed by Vite. Visit /demo for the isolated sample workspace.

## Test and build

Run the declared unit, browser, accessibility, privacy, PWA, demo, import, and offline checks:

    npm ci
    npx playwright install chromium
    npm test
    npm run typecheck
    npm run lint
    npm run build

Each command in .factory/claims.json can also be run on its own from this clean setup. The production build is npm run build; it writes the static deployment artifact to ./dist, with dist/index.html at its root.

## Deploy

This is an Azure Static Web Apps static deployment. Deploy dist/ through the factory static deployment work order. public/staticwebapp.config.json is copied to the artifact root and sets the restrictive Content Security Policy, frame protection, manifest MIME type, immutable caching for hashed assets, revalidation for the shell and service worker, and the designed 404 response.

## Data and privacy

Real files and labels use the color-context IndexedDB database. Demo files and labels use the separate demo:color-context database. The theme preference uses local storage. Data leaves the browser only when you explicitly download an export and choose to share it.

Read the [Privacy page](https://color-context.sociobot.in/privacy/) and [Terms page](https://color-context.sociobot.in/terms/).

## Project notes

- Product research: [.factory/brief.json](.factory/brief.json)
- Visual system and asset provenance: [.factory/design.md](.factory/design.md)
- Demo contract: [.factory/demo.md](.factory/demo.md)
- Copy audit: [.factory/copy-audit.md](.factory/copy-audit.md)
- Claim manifest: [.factory/claims.json](.factory/claims.json)
- Current handoff: [.factory/handoff.md](.factory/handoff.md)

## License

MIT — see [LICENSE](LICENSE).
