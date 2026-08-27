# Color Context

[Color Context](https://color-context.sociobot.in) is a private, local-first workbench for people who need to understand charts, status indicators, and marked-up documents when color alone carries meaning.

Open an image or PDF, sample a cue, give it a personal label such as “warning” or “Q3 series,” and attach one of six high-contrast textures. The original source is preserved. You can export a labeled PNG for sharing or a JSON workspace that restores the source and every annotation.

Color Context is not a color-vision diagnostic, a universal color correction tool, or a way to infer meaning missing from a source.

## What it includes

- Local image and multi-page PDF viewing (PNG, JPEG, WebP, GIF, and PDF; up to 50 MB)
- Five-pixel-area color sampling with readable hex values
- Six monochrome texture overlays, numbered callouts, labels, selection, editing, movement, and undo
- Adjustable overlay strength, visibility, zoom, and PDF page navigation
- Annotated PNG export and portable JSON export/import
- IndexedDB persistence with an on-device recent-file ledger
- Installable PWA shell with explicit offline and update states
- Light, dark, mobile, pointer, and complete keyboard paths
- No accounts, analytics, remote fonts, third-party scripts, or document uploads

## Keyboard

- `O`: open a file
- `M`: enter or leave marking mode
- Arrow keys: move the marking crosshair, or nudge a selected annotation
- `Shift` + Arrow: move by ten image pixels
- `Enter` or `Space`: sample at the keyboard crosshair
- `Escape`: leave marking mode
- `Delete` or `Backspace`: remove a selected annotation after confirmation

## Develop

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

The development server prints its local URL. All runtime dependencies are bundled; no CDN or external API is used.

## Test and build

Install Playwright’s Chromium once in a new environment, then run the complete unit, browser, accessibility, persistence, PDF, and offline suite:

```sh
npx playwright install chromium
npm test
npm run build
```

The exact production build command is `npm run build`. It writes the static deploy artifact to `./dist`, with `dist/index.html` at its root. Preview it with `npm run preview`.

## Data and privacy

Opened files and annotations are stored only in browser IndexedDB. Theme preference uses local storage. Data leaves the browser only when the user explicitly downloads and shares an export. See `/privacy/` and `/terms/` in the built site.

## Project notes

- Product research: [`.factory/brief.json`](.factory/brief.json)
- Visual system and asset provenance: [`.factory/design.md`](.factory/design.md)
- Build verification and known gaps: [`.factory/handoff.md`](.factory/handoff.md)

## License

MIT — see [LICENSE](LICENSE).
