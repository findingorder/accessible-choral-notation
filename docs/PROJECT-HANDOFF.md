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

The specification now includes additional confirmed rules for chromatic lines/spaces and colors, pitch naming, full/half beat dots, sustaining capsules and break indicators, rest placement, lyrics, and measure layout. Read `docs/ACN-SPEC.md` for the current rules and explicitly unresolved questions; the list above is only a core summary.

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

## Immediate task

Do **not** start by building the application.

Work with the user to complete `docs/ACN-SPEC.md`.

Proceed component by component, asking precise questions and updating the spec after each answer. A good order is:

1. pitch grid and pitch naming;
2. rhythm/dot/bar semantics;
3. rests;
4. ties and sustained notes;
5. tuplets and other rhythmic exceptions;
6. lyrics and melismas;
7. measure widths and system layout;
8. dynamics/rehearsal/tempo markings;
9. page metadata and publication elements.

For each rule, seek enough precision that two independent implementers would draw the same result.

## Recommended next conversation with the user

Continue one question at a time from the unresolved items in `docs/ACN-SPEC.md`; the core pitch-grid and naming questions have been answered. Hairpin placement and grouping for music "in 3" are explicitly deferred for experimentation. Semantic editor architecture is now part of the product direction, but implementation still follows sufficient notation specification.
