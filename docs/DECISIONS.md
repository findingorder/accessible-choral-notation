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

## D-004 — Import native MuseScore files directly

**Decision:** Import the native MuseScore format directly. Do not require the user to export from MuseScore, and do not use MusicXML as an import intermediate.

**Status:** Supersedes the earlier MusicXML import recommendation at the user's explicit direction. Native parsing remains isolated behind the normalized ACN model.

## D-005 — Use a normalized ACN score model

**Decision:** Parsing/import and rendering must be separated by a clean internal model.

**Reason:** This limits source-format coupling and makes future importers possible.

## D-006 — TypeScript + SVG is the leading implementation direction

**Decision:** Unless later evidence suggests otherwise, plan to implement the application/renderer in TypeScript with SVG as the primary vector representation.

**Status:** Directional, not yet irreversible.

## D-007 — First scope is one monophonic vocal part

**Decision:** Solve soprano/alto/tenor/bass part rendering one line at a time before attempting a combined SATB score or instrumental notation.

**Clarification:** The user selects a MuseScore source file and a part to import. Each part has its own ACN score. Multiple parts on the same staff are unsupported; Tenor 1 and Tenor 2 must have separate scores. If these are encoded as voices within a shared source staff, the user can select either voice for its separate ACN score.

## D-008 — Confirmed ACN sound/silence rule

**Decision:** Black dots represent sung sound; white dots represent rests/silence.

## D-009 — Semantic editing with an AI agent

**Decision:** Build an editor that lets the transcriber work with pitches, beats, lyrics, and other musical concepts. The intended interaction is to tell an AI agent what change is desired.

**Reason:** Transcribers need to edit the music and notation without manipulating individual SVG elements.

**Consequence:** SVG remains the rendering/output format. The application needs a persistent editable ACN project model from which it regenerates the score. Editing includes musical changes after import, extending the earlier layout-override concept. MuseScore remains the preferred source authoring tool.

**Status:** Product direction confirmed; agent implementation, detailed document schema, and editing workflow details remain to be designed. Persistence format is established in D-010. Specification-first development still applies.

## D-010 — Persist editable scores as JSON

**Decision:** Save each editable ACN score as readable, indented JSON using the **`.acn.json`** extension. Include an explicit format version.

**Reason:** JSON suits the nested musical content and layout settings of an application-managed score document.

**Scope:** This is ACN's native persistence format. MuseScore files are imported directly; SVG and PDF remain generated outputs. The detailed JSON schema and in-memory representation remain to be designed.

## D-011 — Begin with a standalone batch renderer

**Decision:** Proceed with Node.js + TypeScript and SVG in a command-line batch process, without a web UI. The first increment generates a page of blank tenor staffs with a pitch index at the beginning and requires no input file.

**Scope:** Start with provisional, documented presentation defaults and refine them through visual review. Native MuseScore import, `.acn.json` persistence, and separate rendering of saved documents are subsequent increments. MIDI remains a possible future importer, not an implemented or committed format. The agent-driven editor remains a later product direction.
