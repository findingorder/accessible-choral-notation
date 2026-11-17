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

**Current milestone: native MuseScore 3 import and musical SVG/PDF rendering for one tenor part.**

The Node.js + TypeScript batch tool imports a selected monophonic part into versioned `.acn.json`, then renders that saved score to SVG pages and a vector PDF. It also generates blank staffs. There is no web UI yet.

Continue turning the existing visual language into an explicit, testable specification alongside small rendering increments. Do not infer a rule merely because it seems conventional or aesthetically likely. If a rule is not known, record it as an open question and ask the notation's creator.

Known core rules so far:

- Vertical position represents pitch.
- Horizontal position represents musical time.
- Sung dots are black by default, or pitch-colored when that note color mode is selected.
- White dots represent rests/silence.
- The notation uses stable pitch rows and visible pitch-reference landmarks rather than traditional clefs.
- Conventional information such as lyrics, measure numbers, rehearsal marks, dynamics, and tempo/expression text can remain recognizable rather than being reinvented.

See `docs/ACN-SPEC.md` for the evolving notation specification.

## Import a MuseScore part

```sh
# Inspect the available parts and voices without writing output:
npm start -- -i "docs/examples/If Ye Love Me - Tallis - Original.mscz" -s

# Import the tenor line directly from the native file:
npm start -- -i "docs/examples/If Ye Love Me - Tallis - Original.mscz" \
  -p Tenor --beat 1/4 -o output/if-ye-love-me-tenor.acn.json
```

Use `--beat`/`-u` to set the source duration of one ACN beat as a whole-note fraction. The user chose `1/4` for Tallis: four ACN beats per 4/4 measure. This is a piece-specific choice, not a default for all imports.

Import options are `--input`/`-i`, `--part`/`-p`, `--voice`/`-v`, and `--inspect`/`-s`. Select a part by its name or listed ID. Voice numbers start at 1; an explicit voice is required when a part has multiple voices. Each output contains one part/voice. `--blank`, `--input`, and `--render` are mutually exclusive. Import creates the required companion `.acn-layout.json` with header text from the source, preserving an existing companion on reimport; `--output` must end in `.acn.json` for import. Without an output path it writes `output/<source-name>-part-<id>.acn.json`.

The first reference import is **If Ye Love Me**, tenor: 27 written measures, 76 notes, 4 rests, 69 lyric syllables, 4 ties, and 2 slurs. Its pitch range is F3–G4. Rehearsal letters A/B/C/D at measures 5/9/14/20 and the repeat from measure 14 with endings at 26/27 are preserved from the top staff. Source rehearsal onsets are retained even when partway through a measure. The importer preserves repeats; it does not automatically expand them.

Current support is deliberately limited to the tested MuseScore 3 native subset (`.mscz` archives or `.mscx` XML): single-staff, monophonic voices with full explicit measure timelines; ordinary and dotted durations; lyrics; ties/slurs; rehearsal marks; and the repeat/ending constructs in this source. Tuplets, grace notes, polyphonic chords, timing-location changes, missing voice timelines, and unsupported semantic elements fail with an explicit error. MuseScore 4 and MIDI are not supported yet. The importer also reads the top staff’s first voice for shared markings, which must fit this subset. Source engraving, playback settings, and nested extracted parts are intentionally excluded.

`.acn.json` format `0.1` is preliminary. It stores exact whole-note fractions, source-native sounding MIDI pitches with ACN names, source provenance/hash, lyrics and syllabification, event IDs, tie/slur endpoints, measure/repeat information, and metadata. The ACN beat unit is `null` until the transcriber chooses it; the tenor display range defaults to C3–G+4. Import produces the music JSON and its companion layout JSON; render that saved document with `--render`/`-r`. See `src/score.ts` for the initial data model.

## Render a saved score

```sh
npm start -- --render output/if-ye-love-me-tenor.acn.json
# Optional layout overrides and destination:
npm start -- -r output/if-ye-love-me-tenor.acn.json \
  -l my-settings.acn-layout.json -o output/tallis.svg
```

The first command writes `output/if-ye-love-me-tenor-page-1.svg`, `output/if-ye-love-me-tenor-page-2.svg`, and `output/if-ye-love-me-tenor.pdf`. SVGs are the page images; no PNGs are generated. The PDF contains both pages as vectors. The original MuseScore file is not needed to render a saved score.

The working Tallis `.acn.json` has been edited to write out its repeat: source measures 1–26, then 14–25, then 27 (the second ending). Its 39 measures fill nine systems on two pages, with no repeat signs or ending brackets. The unfolded score is numbered consecutively 1–39, with the second pass starting at measure 27. Rehearsal letters C/D recur as C'/D' on the second pass. Reimporting the source resets the repeat expansion. Lyric placement and pair spacing come from common rendering rules; the working score has no per-lyric layout overrides.

Music pagination is automatic: **`pages` applies only to blank scores and is ignored for music.** `systems` is the maximum number of staffs per page. `musicMeasuresPerSystem` defaults to `"auto"`, packing as many measures as fit at the current dot and lyric spacing; set a positive whole number to impose a maximum. `measuresPerSystem` controls blank scores only. Measures expand for lyrics, and dense music may fit fewer measures on a staff. The last page contains only the staffs needed for the music. With the supplied settings Tallis occupies two pages, despite the blank-page count of four.

The initial renderer supports the C3–G+4 tenor range, whole/half-beat dots, sung/rest capsules, word dividers and syllable gaps, lyrics and continuous underscore extensions for sustained syllables, starting measure numbers, rehearsal letters, textual directions/dynamics, and the source's repeats/endings. A four-dot beat example appears beneath the pitch index for this piece. The companion `.acn-layout.json` supplies all displayed titles; titles appear only on page 1. By default, a word/syllable occupying a two-dot group is centered beneath its own pair, including within a shared capsule, with first-dot centering otherwise. Saved data is validated before rendering. Unsupported subdivisions, changing meter, multiple lyric verses, or out-of-range pitches fail explicitly. Every lyric starts one pitch space below its own lowest capsule. Sustained syllables and all syllables of a word share a baseline across measures and systems. Unrelated lower notes do not pull other words down. Two-dot note pairs use compact spacing automatically.  Hairpins remain future work. Geometric and grouping heuristics still need transcriber review; see the prototype notes in `docs/ACN-SPEC.md`.

## Shared defaults and score overrides

Presentation overrides are **score-wide only** and belong exclusively in `{name}.acn-layout.json`, as a subset of `default-layout.json` settings. `.acn.json` stores musical content and transcription choices, not per-lyric, measure, or system layout exceptions. Deprecated lyric `alignment` and `capsuleGap` fields are rejected.

`default-layout.json` contains shared presentation defaults and replaces the old `layout.json`. The command reads it from the current working directory. Missing settings in that file use built-in defaults.

For `output/if-ye-love-me-tenor.acn.json`, a required neighboring `output/if-ye-love-me-tenor.acn-layout.json` is loaded automatically. It contains all four title fields (empty strings hide them), plus any other settings that differ from the defaults, for example:

```json
{
  "leftTitle": "",
  "centerTitle": "If Ye Love Me",
  "rightTitle": "Thomas Tallis (vers 1505-1585)",
  "centerSubtitle": "Tenor",
  "lyricSize": 16,
  "musicMeasuresPerSystem": 3
}
```

Every saved score must have its companion layout file. Import initializes its titles from the native source and selected part; reimport preserves existing layout settings. Display titles and composer text are not stored in `.acn.json`; the semantic part name still identifies the selected voice. Rendering never derives titles from music metadata. Older scores must move `metadata.title` to `centerTitle` and `metadata.composer` to `rightTitle`, add `leftTitle` and `centerSubtitle`, and remove the old metadata fields.

`--layout`/`-l` applies an additional partial override after the required companion and shared defaults. It does not replace the companion requirement. For blank rendering, it applies directly over shared defaults. Missing or malformed layout files produce an error before rendered outputs are written. Shared defaults contain no piece-specific titles.

## Generate the blank page

Requires Node.js 22 or later.

```sh
npm ci
npm start -- --blank
# Optional partial override file:
npm start -- --blank --layout my-blank.acn-layout.json
# Optional destination:
npm start -- --blank --output output/my-blank-page.svg
npm test
```

All application options have a full-word and single-letter form: `--blank`/`-b`, `--layout`/`-l`, `--output`/`-o`, and `--help`/`-h`. For example: `npm start -- -b -l my-blank.acn-layout.json`. Positional arguments are not accepted. The `--` after `npm start` forwards options to the application.

The command regenerates and overwrites one SVG per page and a single multipage PDF (`output/blank-tenor.pdf` by default). A custom SVG destination sets the base name for both formats. PDF pages are rendered directly from the SVGs using PDFKit and svg-to-pdfkit, preserving vector lines and text.

The supplied layout generates four US Letter pages with five blank C3–G+4 staffs per page. Pitch indexes appear on the first staff of odd pages. No input file is needed. Each staff has four equal-width blank measures, with the first measure numbered above the staff (1, 5, 9, 13, 17). Where a pitch index appears, the first staff’s measures begin after it; other staffs use the full available width. Measure numbering continues across pages. The page has no notes or time signature because no musical content or meter has been supplied. Open the SVG in a browser or vector editor.

`pages` sets the positive whole-number **blank-score** page count (built-in default: 1; the supplied file uses 4). `pitchIndexPages` accepts `"every"`, `"even"`, or `"odd"` (default), using page numbers starting at 1. Titles appear only on page 1. `firstPageTop` sets the first staff’s position on that page when titles are populated (default 88); `top` sets it on later pages and untitled pages (default 64).

Every SVG filename includes its page number: `blank-tenor-page-1.svg`, `blank-tenor-page-2.svg`, etc. `--output output/custom.svg` selects the base name, producing `custom-page-1.svg`, subsequent numbered SVGs, and `custom.pdf`. Existing generated pages are overwritten; reducing the page count does not remove older extra-page files.

Presentation settings use SVG units (96 units = one inch). Unknown keys, invalid types, and page layouts that do not fit are rejected before output is written. Shared defaults and partial overrides are described above.

`lineColorMode` selects `"standard"` (default, current colors), `"monochrome"` (red and blue staff lines become black; gray lines stay gray), or `"pitch-based"` (replacement colors for the black, red, and blue staff lines). The pitch-based palette is C `#B22222`, E `#008000`, and G+ `#0000FF`, repeated in every octave; gray lines retain their current color. The setting applies to both blank and musical scores, including lines through the pitch index. Set it in `default-layout.json` or in a score's companion layout.

`noteColorMode` independently selects `"monochrome"` (default: black sung dots) or `"pitch-based"` (sung dots use the confirmed chromatic palette in `docs/ACN-SPEC.md`). Full and half dots use the same pitch color in every octave. Rests remain white. Capsules use a lighter gray (`#d9d9d9`) in Pitch-based note mode for better contrast; Monochrome retains `#bfbfbf`. Internal word dividers also lighten to `#999999` in Pitch-based mode, versus `#666666` in Monochrome. Lyrics, measure bars, repeat dots, and time-signature example dots retain their existing colors. Set this in shared defaults or the score's companion layout; selecting colored lines does not automatically color notes.

When Pitch-based notes are combined with Monochrome lines, E and G+ staff lines use medium gray (`#999999`) instead of black, while C lines stay black. Standard and Pitch-based line palettes keep their assigned colors; light-gray lines and other notation are unchanged.

In Pitch-based note mode, each pitch-label oval in the pitch index uses its pitch color with white lettering. The C3 and Middle C boxes use the C color and white lettering too. Monochrome note mode retains white label backgrounds and dark text; the gray index panel and its geometry are unchanged.

The text fields `leftTitle`, `centerTitle`, and `rightTitle` share a header row, aligned to the left margin, page center, and right margin. `centerSubtitle` appears centered below that row. They use the serif font; empty strings omit them. Keep each field to a short single line; automatic wrapping and collision handling are not yet implemented.

Settings include page dimensions/margins, system count and spacing, semitone spacing, index width, measures per system, staff/bar line thicknesses, measure-number size/gap/inset, pitch-label size, serif/sans-serif font families, `lyricSize`, `lyricFontWeight`, `lyricGap`, `lyricBackgroundOpacity`, `lyricContinuationMinLength`, `dotRadius`, `capsuleHeight`, `capsuleEndPadding`, `measureStartPadding`, `measureEndPadding`, `wordDividerPadding`, and `beatSpacing`. `lyricFontWeight` selects a real Roboto weight: 400 (Regular), 500 (Medium, default), 600 (SemiBold), or 700 (Bold). It replaces the provisional outline setting. `lyricGap` defaults to 14 SVG units (one pitch-line space at the default staff spacing), measured from capsule bottom to lyric text-box top before shared-baseline and continuation adjustments. `lyricContinuationMinLength` omits extensions with less than 28 SVG units available by default, except trailing underscores that signal continuation onto the next system. Qualifying extensions are then clipped to their sung capsule’s edge where the syllable ends with that capsule. `wordDividerPadding` adds clearance on each side of a gray word divider (default 4 before system justification). `measureStartPadding` sets the minimum horizontal gap from a starting measure barline to a new capsule (default 12). `measureEndPadding` sets the matching gap after a final capsule (also 12 by default); unused event space is trimmed before fitting measures. Capsules continuing across barlines stay connected. `beatSpacing` defaults to 18; final spacing may expand to fit lyrics and fill a system. `capsuleHeight` defaults to 14, matching the distance between adjacent pitch lines at the default semitone spacing so space-centered capsules meet the lines. `capsuleEndPadding` is the horizontal clearance between the full-dot edge and each rounded capsule end (default 10); it also applies to single-dot capsules. Spacing grows when needed to keep neighboring capsules separate. The default sans-serif family is bundled Roboto. SVGs embed the required Roboto faces; PDF export and lyric measurement use those same files. Font aliases preserve intermediate weights through the PDF converter. Other font families use installed fonts through Fontconfig; the serif default remains Times New Roman with Liberation Serif available as a fallback. On systems without Fontconfig, PDF export falls back to standard Times/Helvetica fonts. The current index lettering and box geometry remain fixed, so large font-size changes may need further tuning. Exact colors remain in `src/pitch.ts`. Page size, system count/spacing, typography, label arrangement, and line thickness are implementation defaults for review, not newly confirmed notation rules.

`src/score.ts` defines semantic data; `src/musescore.ts` imports native source files; `src/score-reader.ts` validates saved music. `src/settings.ts` validates presentation settings and `src/layout-settings.ts` loads/merges files. `src/layout.ts` constructs staff frames; `src/music-layout.ts` lays out musical content; `src/svg.ts` serializes scenes. `src/text-metrics.ts` measures installed fonts and `src/pdf.ts` renders the same SVGs into a multipage PDF. `src/cli.ts` orchestrates these layers. Layout and SVG serialization do not depend on Node APIs; text measurement is injected into musical layout.

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
├── src/                       # semantic model, import, layout, SVG/PDF rendering, CLI
└── tests/                     # importer, notation, pagination, settings, and CLI checks
```

## Guiding principle

ACN should reduce the decoding burden for a singer. The software should therefore preserve the directness of the notation rather than drifting back toward traditional engraving conventions merely because they are familiar to notation software.
