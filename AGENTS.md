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

The project is in **specification-first mode**. Do not rush into application code. The immediate job is to help the user make the notation grammar explicit and internally consistent.

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
- Accept MuseScore as the authoring source, but prefer MusicXML as the semantic interchange format rather than coupling the renderer to MuseScore's internal format.
- Define a clean ACN intermediate score model so additional importers can be added later.

## Initial scope

Target one monophonic vocal part first. Do not expand the project to full-score SATB rendering, accompaniment, or arbitrary instrumental notation until the single-line choral use case works.

## Reference integrity

Do not edit or overwrite files in `reference/` unless the user explicitly requests it. Derived fixtures should go elsewhere.

## Working style

Keep documentation current as decisions are made. If implementation begins, favor small testable increments and reference-score regression tests over broad feature work.
