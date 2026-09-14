# Accessible Choral Notation

Accessible Choral Notation (ACN) is an alternative notation system for singers. The project goal is to turn a conventionally authored choral part—initially from MuseScore—into ACN automatically, replacing the labor-intensive manual graphics workflow previously used in Microsoft PowerPoint.

The initial reference score is the tenor part of Handel's **“But Thanks Be to God.”** It is stored in `reference/` and should be treated as the visual reference implementation while the notation rules are being formalized.

## Project goal

Build a toolchain that can eventually support this workflow:

```text
MuseScore score (.mscz)
        │
        ▼
MuseScore export / conversion
        │
        ▼
MusicXML
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

The application may accept `.mscz` as a user-facing input, but the design should avoid depending on MuseScore's private/internal file representation when MusicXML can provide the semantic score data we need.

## Current phase

**Phase 1: specify the notation before implementing the renderer.**

The first task is to turn the existing visual language into an explicit, testable specification. Do not infer a rule merely because it seems conventional or aesthetically likely. If a rule is not known, record it as an open question and ask the notation's creator.

Known core rules so far:

- Vertical position represents pitch.
- Horizontal position represents musical time.
- Black dots represent sung sound.
- White dots represent rests/silence.
- The notation uses stable pitch rows and visible pitch-reference landmarks rather than traditional clefs.
- Conventional information such as lyrics, measure numbers, rehearsal marks, dynamics, and tempo/expression text can remain recognizable rather than being reinvented.

See `docs/ACN-SPEC.md` for the evolving notation specification.

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
├── src/                       # implementation begins after specification work
└── tests/                     # test fixtures and renderer tests later
```

## Guiding principle

ACN should reduce the decoding burden for a singer. The software should therefore preserve the directness of the notation rather than drifting back toward traditional engraving conventions merely because they are familiar to notation software.
