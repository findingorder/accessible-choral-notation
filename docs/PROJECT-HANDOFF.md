# Project Handoff for Codex

## Background

The user created **Accessible Choral Notation (ACN)**, an alternative notation system aimed at making choral parts more directly readable by singers. The existing example was manually constructed in Microsoft PowerPoint and required extensive detailed graphics work.

The user's preferred notation authoring program is MuseScore. They explored adapting MuseScore itself to generate ACN, but judged that approach to be too large and invasive. The project therefore aims to build a separate application that reads score data originating in MuseScore and automatically generates ACN.

## Reference artifact

The current visual reference is:

`reference/But Thanks Be to God.pdf`

It is a tenor part of Handel's *But Thanks Be to God* rendered in ACN.

Important visual characteristics visible in the reference include:

- a stable vertical pitch map rather than traditional clefs;
- pitch labels/reference landmarks on selected systems;
- horizontal guide lines in multiple colors;
- gray horizontal event graphics with embedded dots;
- black and white dots;
- lyrics integrated tightly with the event graphics;
- conventional measure boundaries and measure numbers;
- rehearsal marks such as A/B/C/D;
- familiar expression/tempo markings such as dynamics, `rit.`, and `Adagio`;
- a final comparison diagram showing the ACN pitch region against traditional clefs.

Do not assign meaning to any observed element unless it is explicitly confirmed in the specification.

## Confirmed notation rules so far

1. **Sung dots are black by default, with optional pitch-based colors.**
2. **White dots are rests.**
3. **Vertical position represents pitch.**
4. **Horizontal position represents musical time** at the conceptual level.
5. ACN replaces traditional clef-based pitch decoding with a stable pitch-reference system.

The specification now includes additional confirmed rules for chromatic lines/spaces and colors, pitch naming, full/half beat dots, capsules, rest placement, lyrics, and measure layout. Distinguish conventional measure bars from white rest-group dividers (measures 37 and 29) and dark gray word-boundary lines inside single-pitch capsules (measure 56). The earlier generic break-indicator rule is withdrawn. Transcriptions should attempt to match source measure numbers and rehearsal letters so singers can follow the director's instructions. Read `docs/ACN-SPEC.md` for the current rules and explicitly unresolved questions; the list above is only a core summary.

## Product concept

Desired eventual user workflow:

```text
Open/select MuseScore score
        ↓
Choose vocal part or individual voice
        ↓
Generate Accessible Choral Notation
        ↓
Preview
        ↓
Describe semantic edits to an AI agent and review the regenerated score
        ↓
Save the editable ACN project
        ↓
Export PDF
```

The editor must support semantic changes to pitches, beats, lyrics, and other musical concepts after import. The intended interaction is to tell an AI agent what change is desired. SVG remains generated output; an editable project model retains musical meaning and transcription choices. See `docs/ARCHITECTURE.md` for proposed command validation, undo, and layout preference handling.

## Technical direction

The current proposed pipeline is:

```text
Native MuseScore source
        ↓
Native MuseScore importer
        ↓
ACN normalized score model
        ↓
layout engine
        ↓
SVG scene/rendering
        ↓
preview + PDF
```

Direct native import is required: no user export step and no MusicXML intermediate. The importer isolates MuseScore file structures from the normalized ACN model and renderer. Individual voices within a shared source staff can be selected for separate ACN scores.

Persistence is confirmed as readable, indented `.acn.json` with an explicit format version. The detailed schema remains open. The proposed editor loads that file into a semantic object model, derives layout, and displays SVG elements directly in the browser without requiring an HTML canvas. Semantic edits regenerate the affected display; saving preserves editable data, while SVG/PDF exports preserve the rendered score. See `docs/ARCHITECTURE.md` for the in-memory lifecycle and all five user-supplied editor examples.

## Current implementation milestone

The user authorized proceeding with a batch-first Node.js + TypeScript prototype. The first task is a page of blank tenor staffs with a pitch index at the beginning; it needs no input file and no web UI.

Implemented: `npm start -- --blank` produces `output/blank-tenor-page-1.svg`, with five C3–G+4 staffs on US Letter paper and one pitch index. Each staff defaults to four equal-width blank measures, numbered 1, 5, 9, 13, and 17 above the first measure of each staff. `default-layout.json` now supplies editable page and typography settings; select another file with `npm start -- --blank --layout path/to/score.acn-layout.json`. The command overwrites SVG output plus a single multipage PDF (`output/blank-tenor.pdf`). PDF rendering uses vector SVG content directly, with embedded installed font matches. PNG generation has been removed at the user’s request. `pages` controls blank-page count; `pitchIndexPages` selects every/even/odd pages (default odd). The current user layout has four pages. Every SVG adds `-page-N` to the output base, including page 1; the PDF keeps the base name. Measure numbering continues across pages. Pitch mapping, settings validation, layout, SVG serialization, and file writing are separate modules. `npm test` checks the pitch mapping and page layout. All geometry and exact colors are provisional review defaults; see README for commands and configuration locations.

Native import is now implemented as the next increment. The user selected **Tenor** from `docs/examples/If Ye Love Me - Tallis - Original.mscz` (MuseScore XML 3.01, program 3.5.0). `npm start -- -i "docs/examples/If Ye Love Me - Tallis - Original.mscz" -p Tenor --beat 1/4 -o output/if-ye-love-me-tenor.acn.json` generates a preliminary version 0.1 semantic score. `-s`/`--inspect` lists parts; `-v`/`--voice` selects a voice. The source contains Sopraan, Alt, Tenor, and Bas, plus an embedded extracted part which is not imported as a fifth part.

Verified tenor import: 27 measures, 76 notes, 4 rests, 69 lyric syllables, 4 ties, 2 slurs, F3–G4 pitch range. Rehearsal marks and repeats/endings come from the top staff. All measure timelines are exact whole-note fractions and fill their measures. The original files are unchanged. The native importer is intentionally limited to the MuseScore 3 subset documented in README; unsupported semantic structures fail explicitly.

The user chose **four ACN beats per measure** for this 4/4 piece: one ACN beat equals a quarter note (`transcription.beatUnit = {"numerator": 1, "denominator": 4}`). Reproduce that choice using `--beat 1/4` (`-u 1/4`) when importing. Musical rendering is now implemented: `npm start -- --render output/if-ye-love-me-tenor.acn.json` loads and validates the saved score, then writes two SVG pages and one vector PDF. The working score now writes out the repeat in full: source measures 1–26, then 14–25, then 27 (second ending). Its 39 measures occupy nine systems: five on page 1 and four on page 2, with no repeat signs or ending brackets. Following the user’s correction, displayed and internal measure numbers both increase consecutively from 1 to 39; the second pass starts at measure 27. The working file no longer sets `sourceNumber`. Second-pass copies have unique event IDs ending in `-pass2`, with their ties/slurs remapped. Rehearsal letters C/D appear as C'/D' on the second pass. Copied measures record `repeatOf`, referencing their earlier ACN measure; this semantic provenance triggers a prime on rehearsal letters without changing consecutive measure numbering. This is a saved-score edit; fresh imports still contain repeats. Centered word spacing inside capsules accounts for neighboring half-word widths and counts divider clearance once, bringing “keep”/“my” in measure 3 close to “love”/“me” in measure 2. Gray word dividers have extra clearance on each side (`wordDividerPadding: 4` before justification), including between “love” and “me” in measure 2. Music fits measures automatically by width, including five measures on some lines. `musicMeasuresPerSystem` is `"auto"` by default; a positive whole number sets an optional maximum. `measuresPerSystem` retains the four-measure blank-score default. Matching start/end capsule clearances trim excess trailing space before fitting measures. The blank-page `pages` setting is ignored for music. Both pages were visually inspected. Regression tests cover exact rendered durations, pitch placement, rests, word/syllable separation, half dots, melismas, repeats, pagination, layout inheritance, and CLI output. Saved-score editing and the agent editor are not implemented. MIDI and MuseScore 4 support remain deferred.

Each saved score now requires a sibling **`{name}.acn-layout.json`** containing `leftTitle`, `centerTitle`, `rightTitle`, and `centerSubtitle`, plus any score-wide overrides of **`default-layout.json`**. Empty strings hide title fields. Import initializes this companion from source headers and the selected part, preserving an existing file on reimport. `.acn.json` no longer stores title/composer fields; rendering uses layout settings only. `--layout` applies additional partial overrides after the required companion. Missing companions fail before rendering. The working score has been migrated without changing its musical content.

The initial music renderer uses documented provisional heuristics for spacing, lyric baselines, adjacent half-dot pairing, repeat-boundary capsule breaks, and page continuations. See the prototype notes in ACN-SPEC; these are not newly confirmed notation rules. Next: review Tallis with the user and refine those choices before expanding the supported notation subset.

Continue resolving notation questions when they affect the next increment rather than blocking the prototype on every edge case. Grouping for music “in 3” and other unresolved rules remain open in `docs/ACN-SPEC.md`.

The sans-serif default is now bundled Roboto, replacing Noto Sans because the user wants a capital “I” without top/bottom bars. Lyrics use the real Medium (500) face, with Regular/Medium/SemiBold/Bold available through `lyricFontWeight`. This supersedes the ineffective 0.15-unit text outline. SVGs embed the used faces and PDF/text measurement use the same files; font-family aliases prevent the PDF converter from collapsing intermediate weights to Regular or Bold.

All syllables of a word now share a baseline below their lowest required lyric position, including across measures and systems. This aligns “for–ev–er” in 15–16 and 18–19, and the unfolded copies in 28–29 and 31–32. Hyphens and extensions follow the word baseline; unrelated neighboring words keep their existing positions.

Ordinary barlines between same-word syllables within one capsule are centered between the adjacent dots. Two-dot sung capsules crossing a normal barline now also tighten after system justification when the lyrics permit, retaining the centered barline. Dot spacing respects the beat spacing, any syllable gap, and measured lyric/hyphen widths. This balances and compacts “for”/“ev” in measures 15–16 and 28–29 through the same rules used for all scores.

Lyric placement is now general: start one pitch space below the lowest capsule belonging to the syllable; align the syllables of each word and its extensions to their lowest required baseline. Unrelated lower notes no longer impose a measure-wide baseline. This automatically raises “ev’n” in both 19 and 32 and keeps the lyrics close in 22–23 and 35–36. No word text, event ID, or measure number controls these decisions.

Two-dot note pairs use compact spacing automatically, and each two-dot word/syllable group centers under its own pair, including within a larger shared capsule and at a system continuation. Longer groups retain first-dot centering. Per-lyric `alignment` and `capsuleGap` fields have been removed from the model and renderer and are rejected by validation. Tests exercise the rules with arbitrary words, event IDs, measure numbers, and transposed pitches, in addition to the Tallis regression examples.

Implementation requirements from the user must become common rules applicable to any score. Do not implement review feedback by adding per-piece lyric overrides or matching specific words/measures. Record unresolved generalization choices in the specification.

Presentation overrides are permitted only at score-wide scope, in a sibling `{name}.acn-layout.json` inheriting `default-layout.json` (or an explicitly selected file with the same settings schema). No per-lyric, measure, or system overrides belong in `.acn.json`. The required working-score file is `output/if-ye-love-me-tenor.acn-layout.json`; it holds the four title fields and inherits all other settings.

Horizontal spacing now reserves the inner extent of compound barlines and distributes surplus line width by measure duration. Within each measure, only musical intervals stretch; measured text and capsule padding remain fixed. This reduces excess spacing in text-heavy measures and gives held-note measures more room. In the reviewed output, the last measure grows from about 126 to 142 SVG units while retaining 12 units between its capsule and the inner final-bar stroke. These are common rules, not measure-specific settings. Both output pages were visually checked; all 34 tests pass.

### Line color modes

`lineColorMode` is a score-wide layout option, defaulting to `standard`. `monochrome` changes red/blue staff lines to the existing black while preserving gray lines and all geometry. Both blank and musical rendering use it, including the pitch index. `pitch-based` uses the confirmed palette C `#B22222`, E `#008000`, and G+ `#0000FF` in every octave, keeping gray lines unchanged. All three modes are implemented.

### Note color modes

`noteColorMode` defaults to `monochrome`, with `pitch-based` available independently of line colors. The exact twelve-color palette supplied in the user's image is recorded in ACN-SPEC and `src/pitch.ts`. It applies to full and half sung dots by pitch class in every octave; rest dots stay white. In this mode, all capsules (including the time-signature example) use lighter gray `#d9d9d9` for contrast, while Monochrome retains `#bfbfbf`. Internal word dividers lighten to `#999999` in Pitch-based note mode; Monochrome retains `#666666`. Accessible SVG descriptions reflect the selected note mode. Shared defaults and existing score settings retain monochrome notes unless explicitly overridden.

When Pitch-based notes are combined with Monochrome lines, E and G+ staff lines use medium gray (`#999999`) instead of black, while C lines stay black. Standard and Pitch-based line palettes keep their assigned colors; light-gray lines and other notation are unchanged.

In Pitch-based note mode, each pitch-label oval in the pitch index uses its pitch color with white lettering. The C3 and Middle C boxes use the C color and white lettering too. Monochrome note mode retains white label backgrounds and dark text; the gray index panel and its geometry are unchanged.
