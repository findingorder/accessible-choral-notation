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

1. **Black dots are sung.**
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

Implemented: `npm start -- --blank` produces `output/blank-tenor.svg`, with five C3–G+4 staffs on US Letter paper and one pitch index. Each staff defaults to four equal-width blank measures, numbered 1, 5, 9, 13, and 17 above the first measure of each staff. `layout.json` now supplies editable page and typography settings; select another file with `npm start -- --blank --layout path/to/layout.json`. The command overwrites SVG output plus a single multipage PDF (`output/blank-tenor.pdf`). PDF rendering uses vector SVG content directly, with embedded installed font matches. PNG generation has been removed at the user’s request. `pages` controls page count; `pitchIndexPages` selects every/even/odd pages (default odd). The current user layout has four pages. Page 1 retains the base filename; later pages add `-page-N`, with continuous measure numbering. Pitch mapping, settings validation, layout, SVG serialization, and file writing are separate modules. `npm test` checks the pitch mapping and page layout. All geometry and exact colors are provisional review defaults; see README for commands and configuration locations.

Next: review this blank-page output with the user before expanding rendering. The later batch pipeline is native MuseScore import → editable `.acn.json` → SVG. Importers, persistence schema, and musical-event rendering are not implemented. MIDI was discussed as a possible later importer; support is not committed. Browser UI and agent editing remain later milestones.

Continue resolving notation questions when they affect the next increment rather than blocking the prototype on every edge case. Grouping for music “in 3” and other unresolved rules remain open in `docs/ACN-SPEC.md`.
