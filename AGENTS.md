# AGENTS.md

This repository contains the Accessible Choral Notation (ACN) project.

## Before doing any work

Read these files in order:

1. `README.md`
2. `docs/PROJECT-HANDOFF.md`
3. `docs/ACN-SPEC.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DECISIONS.md`

Use `reference/But Thanks Be to God.pdf` as the current visual reference implementation.

## Current priority

The user has authorized a **batch-first rendering prototype**, starting with a page of blank tenor staffs and a pitch index, with no input file or web UI. Continue clarifying notation as needed for each small increment; keep provisional geometry distinct from confirmed notation rules. See README and docs/PROJECT-HANDOFF.md for the current implementation.

When examining the reference PDF:

- distinguish what is explicitly known from what is merely observed;
- never invent semantics for a visual element;
- record uncertainty in the specification as an open question;
- ask the user targeted questions when a rule must be resolved;
- keep examples tied to exact measures/pages where useful.

## Known rules

- Black dots are sung.
- White dots are rests.
- Vertical position represents pitch.
- Horizontal position represents musical time.
- ACN replaces traditional clef-dependent pitch decoding with a stable pitch map / pitch rows.

Everything else should be confirmed before being treated as normative.

## Architecture direction

Once the notation specification is sufficiently stable:

- Prefer TypeScript for the application/renderer unless the user decides otherwise.
- Prefer SVG as the primary rendering representation.
- Produce PDF from the vector rendering pipeline.
- Keep parsing, semantic score representation, layout, and rendering as separate layers.
- Import native MuseScore files directly. Do not use MusicXML for import or require the user to export from MuseScore. Keep native-format parsing isolated from the renderer through the ACN score model.
- Define a clean ACN intermediate score model so additional importers can be added later.
- Save editable scores as readable, indented `.acn.json` with an explicit format version; SVG and PDF are generated outputs.
- Support an agent-driven semantic editor for pitches, beats, lyrics, and layout preferences. See `docs/ARCHITECTURE.md` for proposed in-memory model and SVG display behavior.

## Initial scope

Target one monophonic vocal part first. Do not expand the project to full-score SATB rendering, accompaniment, or arbitrary instrumental notation until the single-line choral use case works.

Each selected part or individual voice has a separate ACN score. Allow selecting a voice from a shared MuseScore staff; do not combine Tenor 1 and Tenor 2 on one ACN staff.

## Reference integrity

Do not edit or overwrite files in `reference/` unless the user explicitly requests it. Derived fixtures should go elsewhere.

## Working style

Keep documentation current as decisions are made. If implementation begins, favor small testable increments and reference-score regression tests over broad feature work.
