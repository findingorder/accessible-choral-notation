# Project Decisions

This file records decisions already made so future work does not repeatedly reopen them without reason.

## D-001 — Build a separate ACN generator rather than modifying MuseScore

**Decision:** Create an external application/toolchain that consumes a score authored in MuseScore and renders Accessible Choral Notation.

**Reason:** Adapting MuseScore's engraving system directly would be disproportionately complex for the goal. ACN has a sufficiently different visual grammar that a dedicated renderer is more tractable.

## D-002 — Specification before implementation

**Decision:** Formalize ACN as a written notation specification before substantial coding begins.

**Reason:** The existing notation was created visually and intuitively in PowerPoint. A renderer requires explicit deterministic rules and should not encode guesses.

## D-003 — MuseScore remains the preferred authoring environment

**Decision:** Do not build a replacement score-entry system in the first phase.

**Reason:** MuseScore already solves score entry and provides the semantic musical information the ACN generator needs.

## D-004 — Prefer MusicXML as the semantic boundary

**Decision:** The app may accept `.mscz` as a convenient user-facing input, but the core importer should preferentially consume MusicXML rather than MuseScore's internal format.

## D-005 — Use a normalized ACN score model

**Decision:** Parsing/import and rendering must be separated by a clean internal model.

**Reason:** This limits source-format coupling and makes future importers possible.

## D-006 — TypeScript + SVG is the leading implementation direction

**Decision:** Unless later evidence suggests otherwise, plan to implement the application/renderer in TypeScript with SVG as the primary vector representation.

**Status:** Directional, not yet irreversible.

## D-007 — First scope is one monophonic vocal part

**Decision:** Solve soprano/alto/tenor/bass part rendering one line at a time before attempting a combined SATB score or instrumental notation.

## D-008 — Confirmed ACN sound/silence rule

**Decision:** Black dots represent sung sound; white dots represent rests/silence.
