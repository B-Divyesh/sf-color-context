# Color Context — visual thesis

## Direction: the cartographer's color garden

Color Context is a surreal editorial workbench, not a clinical filter. Its world is a midnight paper landscape where oversized swatches become quiet geological forms, a monochrome eye-shaped portal reveals texture, and tiny numbered flags turn uncertain color into named territory. The scenery explains the product's central act: map a visual cue, give it a texture, and leave a durable note.

The product itself remains the foreground. The generated scene appears only in the empty state and install/about moments; when a document is open, the canvas and its annotations take over.

## Palette

The palette is derived from drafting ink, warm archival paper, and fluorescent registration marks. Color is never the only state signal.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--paper` | `#F5F0E5` | `#15161C` | App background / night paper |
| `--surface` | `#FFFDF7` | `#202129` | Raised working surfaces |
| `--ink` | `#171820` | `#FAF7EE` | Primary copy |
| `--muted` | `#5F625F` | `#B9BAB5` | Secondary copy (AA on its background) |
| `--line` | `#77766F` | `#858780` | Boundaries and rules |
| `--acid` | `#C7F23A` | `#D2FA4C` | Primary action / sampled beacon |
| `--acid-ink` | `#161A09` | `#161A09` | Text on acid |
| `--violet` | `#6348D9` | `#A997FF` | Focus and editorial accent |
| `--success` | `#176B49` | `#7BE1B7` | Success, paired with check icon/text |
| `--warning` | `#7B4D00` | `#FFD27A` | Warning, paired with symbol/text |
| `--danger` | `#A12836` | `#FF9AA7` | Error, paired with symbol/text |

Dark mode follows the system, with an explicit manual toggle persisted locally. Canvas annotations use black/ivory geometry plus one acid registration dot so they remain legible without relying on hue.

## Typography

- Display and labels: **Arial Black / Arial Narrow / system sans**, set with compact tracking. It feels like an editorial pull-quote and ships with zero font bytes.
- Body and controls: **Inter-like system UI stack** (`ui-sans-serif`, `system-ui`, `Segoe UI`, sans-serif) at 16px minimum and 1.5 leading.
- Color values and coordinates: **ui-monospace** with tabular figures.
- Scale: 16, 18, 22, 30, and clamp(40–72) px. There is exactly one h1.

## Spacing and shape

An 8px rhythm governs the workbench: 4px micro-gap; 8, 16, 24, 32, 48, and 64px spaces. Controls are at least 44px. Corners are clipped or modest (8–18px), while the empty-state landscape uses organic silhouettes. Heavy 2px ink rules and offset shadows evoke layered paper without turning every group into a card.

Desktop is a three-part workbench: narrow tool rail, document stage, annotation ledger. At ≤900px the ledger moves below the stage; at 390px the tool rail becomes a horizontally scrollable strip and nonessential explanatory copy disappears. The primary “Open a file” action remains first in every layout.

## Interaction grammar

- **Open** replaces the empty scene with a document stage.
- **Mark** changes the cursor to a precise crosshair; activating a point samples its rendered pixel and opens a compact label composer anchored in the ledger.
- **Name** requires a human meaning, then binds that text to a numbered marker, RGB/hex readout, and a distinct monochrome texture.
- **Inspect** lets a marker be selected from canvas or ledger; its texture expands around the sampled region.
- **Own** exposes PNG and JSON export. JSON import restores a local workspace. Delete is confirmed; undo is offered immediately.

Keyboard: O opens a file, M enters marking mode, Escape cancels, arrow keys nudge a selected annotation by one image pixel (Shift = ten), and Delete requests confirmation. Shortcuts never fire while typing.

## Texture language

Six hand-authored SVG/canvas patterns—diagonal hatch, crosshatch, dots, horizontal bars, checker, and rings—are assigned cyclically. Every mark also carries a number and text label. Texture opacity is adjustable globally, and the original image is always one click away with “Hide overlays.” This ensures the overlay helps distinguish marked regions while preserving the source.

## Motion policy

UI transitions run 160–240ms and animate only opacity and transform: the annotation composer rises from its ledger slot, a saved flag settles by 4px, and update/offline notices slide from the bottom edge. Nothing loops. With `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and changes become immediate opacity/state swaps.

## Asset plan and provenance

### Empty-state hero: `color-garden`

- Use case: stylized-concept
- Subject/world: a surreal paper-cut landscape built from giant unlabeled chart wedges and status lights; a central eye-shaped viewing portal reveals black-and-ivory hatching; small blank numbered-style flags (without actual text) map the terrain.
- Materials: torn archival paper, matte ink, subtle halftone, crisp collage edges.
- Light/lens: soft raking studio light, editorial still life, shallow dimensionality rather than photoreal depth.
- Palette words: midnight ink, warm ivory, acid chartreuse, muted violet, restrained terracotta.
- Composition: landscape 3:2, subject weighted to the right with calm negative space on the left; no UI mockup.
- Negative list: no words, letters, numbers, logos, watermark, people, medical imagery, rainbow gradient, glossy 3D, screenshots, illegible pseudo-text.
- Full generation prompt: “Surreal editorial paper-cut landscape for an accessibility utility, oversized unlabeled chart wedges and circular status lights become hills and moons, a central eye-shaped viewing portal reveals bold black-and-ivory hatch textures underneath the colored paper, several tiny blank mapping flags punctuate the scene, torn archival paper, matte ink, restrained halftone grain, crisp collage edges, soft raking studio light, midnight ink and warm ivory with acid chartreuse, muted violet and a touch of terracotta, landscape composition weighted right with calm negative space left, sophisticated independent magazine art direction, no people, no interface, no words, no letters, no numbers, no logos, no watermark, no rainbow gradient.”
- Generator: factory Azure image deployment via `/opt/fleet/lib/gen-image.sh`; generated 2026-08-27. Original commissioned for Color Context. Source PNG and prompt sidecar live in `assets/src/`; shipped WebP is optimized to ≤300 KB.

All interface icons and textures are hand-authored in repository HTML/CSS/canvas code. No stock assets, external fonts, or third-party runtime artwork are used.

## Why this fits

People arrive with an ambiguous artifact, not with a desire to be “corrected.” A cartographer's garden frames annotation as authorship: the original terrain stays intact while texture, number, and language create an additional map. The editorial restraint keeps that metaphor human without obscuring the utility.
