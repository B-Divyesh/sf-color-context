# Demo sandbox

## Open the demo

Use https://color-context.sociobot.in/demo or the **Try it with sample data** button on the landing page. The direct URL immediately opens a populated release-status board.

## Sample data

The shipped `release-status-sample.webp` board shows a quality trend and three color-only team checks:

- Payments — Needs review before release
- Search — Search quality series
- Docs — Ready to ship

Each sample check already has a numbered label and a different monochrome texture. This lets a visitor inspect a realistic populated output before opening a file.

## Isolation and reset

Real work uses the IndexedDB database named `color-context`. Demo work uses the separate `demo:color-context` database. While the demo banner is shown, the application only reads and writes the demo database.

**Reset demo** clears `demo:color-context` and restores the shipped release-status board. **Start for real** clears the demo database, returns to `/`, and leaves real work unchanged. The demo contains no user data and never copies demo changes into real storage.

## Verification

Every claim test starts at `/demo`. The `demo-isolation` browser test creates real work only after leaving demo mode, returns to the demo, then proves the real workspace remains after leaving again.
