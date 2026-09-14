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

The exact rules for dot count, gray bars, colored pitch lines, spacing, ties, tuplets, lyric placement, and many other details remain to be documented with the user.

## Product concept

Desired eventual user workflow:

```text
Open/select MuseScore score
        ↓
Choose vocal part
        ↓
Generate Accessible Choral Notation
        ↓
Preview
        ↓
Export PDF
```

An eventual interactive editor could support small layout overrides (for example dragging a lyric or annotation) without modifying the imported musical semantics.

## Technical direction

The current proposed pipeline is:

```text
.mscz (optional user-facing source)
        ↓
MuseScore conversion/export
        ↓
MusicXML
        ↓
ACN normalized score model
        ↓
layout engine
        ↓
SVG scene/rendering
        ↓
preview + PDF
```

The rationale is to keep ACN independent of MuseScore's internal file representation and to make the renderer reusable with other notation sources later.

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

Start with the pitch grid. Use the reference score as evidence, but ask rather than infer. Suggested first questions:

- What exact pitch interval does each horizontal row represent?
- What do the red, blue, and black/gray horizontal lines mean?
- How are sharps/flats represented?
- Why are particular C rows labeled, and when should the left-side pitch legend be shown?

Then update `docs/ACN-SPEC.md` with the answers before moving on.
