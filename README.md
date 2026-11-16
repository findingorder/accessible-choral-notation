# Accessible Choral Notation

Accessible Choral Notation (ACN) is an alternative notation system for singers. The project goal is to turn a conventionally authored choral part—initially from MuseScore—into ACN automatically, replacing the labor-intensive manual graphics workflow previously used in Microsoft PowerPoint.

The initial reference score is the tenor part of Handel's **“But Thanks Be to God.”** It is stored in `reference/` and should be treated as the visual reference implementation while the notation rules are being formalized.

## Project goal

Build a toolchain that can eventually support this workflow:

```text
MuseScore score (.mscz)
        │
        ▼
Native MuseScore importer
        │
        ▼
ACN internal score model
        │
        ▼
ACN layout + SVG renderer
        │
        ├── interactive/browser preview
        └── PDF output
```

The user selects a native MuseScore file and the part or voice to import. ACN reads the native format directly; no MuseScore export step or MusicXML conversion is used. Each selected part or voice becomes a separate ACN score.

The planned editor will let transcribers describe changes to an AI agent in terms of pitches, beats, lyrics, and other musical concepts. Edits will update an editable ACN project model and regenerate the SVG preview. SVG is the visual output; the saved project retains the musical meaning needed for continued editing. See `docs/ARCHITECTURE.md` for the editor direction and remaining design questions.

## Current phase

Editable scores are saved as readable, indented **`.acn.json`** files with an explicit format version. The detailed document schema remains under design.

**Current milestone: batch generation of a blank ACN staff page.**

The user has authorized a small renderer prototype. It runs in Node.js + TypeScript without a web UI or input file. Importers and the `.acn.json` score schema remain future work.

Continue turning the existing visual language into an explicit, testable specification alongside small rendering increments. Do not infer a rule merely because it seems conventional or aesthetically likely. If a rule is not known, record it as an open question and ask the notation's creator.

Known core rules so far:

- Vertical position represents pitch.
- Horizontal position represents musical time.
- Black dots represent sung sound.
- White dots represent rests/silence.
- The notation uses stable pitch rows and visible pitch-reference landmarks rather than traditional clefs.
- Conventional information such as lyrics, measure numbers, rehearsal marks, dynamics, and tempo/expression text can remain recognizable rather than being reinvented.

See `docs/ACN-SPEC.md` for the evolving notation specification.

## Generate the blank page

Requires Node.js 22 or later.

```sh
npm ci
npm start -- --blank
# Explicit layout file:
npm start -- --blank --layout layout.json
# Optional destination:
npm start -- --blank --output output/my-blank-page.svg
npm test
```

All application options have a full-word and single-letter form: `--blank`/`-b`, `--layout`/`-l`, `--output`/`-o`, and `--help`/`-h`. For example: `npm start -- -b -l layout.json`. Positional arguments are not accepted. The `--` after `npm start` forwards options to the application.

The command regenerates and overwrites one SVG per page and a single multipage PDF (`output/blank-tenor.pdf` by default). A custom SVG destination sets the base name for both formats. PDF pages are rendered directly from the SVGs using PDFKit and svg-to-pdfkit, preserving vector lines and text.

The supplied layout generates four US Letter pages with five blank C3–G+4 staffs per page. Pitch indexes appear on the first staff of odd pages. No input file is needed. Each staff has four equal-width blank measures, with the first measure numbered above the staff (1, 5, 9, 13, 17). Where a pitch index appears, the first staff’s measures begin after it; other staffs use the full available width. Measure numbering continues across pages. The page has no notes or time signature because no musical content or meter has been supplied. Open the SVG in a browser or vector editor.

`pages` sets the positive whole-number page count (built-in default: 1; the supplied file uses 4). `pitchIndexPages` accepts `"every"`, `"even"`, or `"odd"` (default), using page numbers starting at 1. Titles appear only on page 1. `firstPageTop` sets the first staff’s position on that page when titles are populated (default 88); `top` sets it on later pages and untitled pages (default 64).

Page 1 keeps the requested output filename (`blank-tenor.svg` by default). Subsequent pages use `blank-tenor-page-2.svg`, `blank-tenor-page-3.svg`, etc. Existing generated pages are overwritten; reducing the page count does not remove older extra-page files.

Presentation settings live in `layout.json`, which is read from the current working directory by default. Select another file with `--layout path/to/layout.json`; both `--layout` and a custom output path can be supplied together. Lengths and font sizes use SVG units (96 units = one inch). Settings omitted from a custom file use built-in defaults. Unknown keys, invalid types, and page layouts that do not fit are rejected before output is written.

The text fields `leftTitle`, `centerTitle`, and `rightTitle` share a header row, aligned to the left margin, page center, and right margin. `centerSubtitle` appears centered below that row. They use the serif font; empty strings omit them. Keep each field to a short single line; automatic wrapping and collision handling are not yet implemented.

Settings include page dimensions/margins, system count and spacing, semitone spacing, index width, measures per system, staff/bar line thicknesses, measure-number size/gap/inset, pitch-label size, and serif/sans-serif font families. Font names use installed fonts with the listed fallbacks; SVGs reference fonts rather than embedding them. PDF export embeds installed font matches resolved through Fontconfig, so this machine uses Liberation Serif/Sans when Times New Roman/Arial are unavailable. On systems without Fontconfig, PDF export falls back to standard Times/Helvetica fonts. The current index lettering and box geometry remain fixed, so large font-size changes may need further tuning. Exact colors remain in `src/pitch.ts`. Page size, system count/spacing, typography, label arrangement, and line thickness are implementation defaults for review, not newly confirmed notation rules.

`src/pitch.ts` defines the pitch mapping, `src/layout.ts` creates positioned shapes, `src/svg.ts` serializes them, and `src/pdf.ts` converts SVG pages to a multipage PDF, and `src/cli.ts` writes the outputs. The SVG renderer and layout code do not depend on Node APIs; only the CLI does.

## First implementation scope

The first renderer should target a **single monophonic choral part** (for example soprano, alto, tenor, or bass), not a full SATB score or instrumental notation.

The desired first-pass feature set is:

- pitches
- note durations
- rests
- measures and measure numbers
- lyrics and syllabification
- ties / melismatic continuation
- dynamics
- rehearsal marks
- tempo and expression text
- system and page layout

Complex notation outside the reference use case should be deferred until the core system works reliably.

## Repository map

```text
.
├── README.md
├── AGENTS.md                  # instructions/context for Codex and other coding agents
├── docs/
│   ├── ACN-SPEC.md            # evolving notation specification
│   ├── ARCHITECTURE.md        # proposed software architecture
│   ├── DECISIONS.md           # decisions already made
│   └── PROJECT-HANDOFF.md     # project history and current handoff state
├── reference/
│   ├── But Thanks Be to God.pdf
│   └── README.md
├── src/                       # pitch mapping, blank-page layout, SVG renderer, CLI
└── tests/                     # pitch and blank-page layout checks
```

## Guiding principle

ACN should reduce the decoding burden for a singer. The software should therefore preserve the directness of the notation rather than drifting back toward traditional engraving conventions merely because they are familiar to notation software.
