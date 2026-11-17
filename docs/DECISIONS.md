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

## D-012 — Shared defaults and partial score layouts

**Decision:** Rename `layout.json` to **`default-layout.json`**. A score must have a neighboring **`{name}.acn-layout.json`** containing all four title fields plus the layout settings that override those defaults. `--layout` applies additional overrides after that required sibling. See D-016 for title storage; this supersedes the original optional-companion and metadata-fallback behavior.

## D-013 — Music determines its own page count

**Decision:** The `pages` option controls blank generation only. When rendering music, ignore it and generate exactly the pages needed for the content, with no extra blank systems on the last page. Retain SVG page images and a combined vector PDF; do not generate PNG output.

## D-014 — Generalize engraving feedback

**Decision:** Implement review requirements as common notation/layout rules for any score. Specific measures identify examples and regression cases, not exceptions to encode in score data or renderer branches.

**Consequence:** Word-relative lyric height, pair centering, and compact two-dot spacing are derived automatically. The working Tallis score no longer contains per-lyric alignment or clearance overrides. Repeat expansion and musical transcription choices remain semantic score edits.

## D-015 — Score-wide layout overrides only

**Decision:** The only presentation overrides are partial, score-wide overrides of `default-layout.json`, stored in `{name}.acn-layout.json` (for example `if-ye-love-me-tenor.acn-layout.json`). No per-lyric, measure, or system layout overrides belong in the semantic score.

**Consequence:** Remove the provisional lyric `alignment` and `capsuleGap` fields and reject them when reading saved scores. The renderer derives individual placements from common rules. This supersedes earlier proposals for local layout preferences in the editor.

## D-016 — Required score layouts own the titles

**Decision:** Every saved score has a companion `{name}.acn-layout.json`. Store `leftTitle`, `centerTitle`, `rightTitle`, and `centerSubtitle` there, using empty strings for omitted fields. Do not store displayed title/composer fields in `.acn.json` or derive titles from that file during rendering.

**Consequence:** Import creates the companion from native source headers and the selected part, preserving an existing companion on reimport. Other settings remain partial score-wide overrides of shared defaults. Rendering requires the companion even when `--layout` supplies additional overrides. Part identity and copyright remain semantic metadata. Older saved title/composer fields must be migrated; the working Tallis score is migrated.

## D-017 — Prime rehearsal letters in unfolded repeats

**Decision:** Append a single quote to rehearsal letters repeated because a repeat has been unfolded. Keep the original occurrence unchanged.

**Consequence:** Copied measures retain semantic `repeatOf` provenance referring to an earlier ACN measure. The common renderer uses that provenance to decorate rehearsal letters without modifying their saved text or inferring repeats from duplicate labels, event IDs, or piece-specific measure numbers.

## D-018 — Three staff-line color modes

**Decision:** Add score-wide `lineColorMode`: `standard` preserves current colors; `monochrome` changes red and blue lines to black; `pitch-based` uses the user-supplied colors C `#B22222`, E `#008000`, and G+ `#0000FF` in every octave. Gray lines retain their current color.

**Status:** All three modes are implemented. Standard remains the default.

## D-019 — Independent note color modes

**Decision:** Add `noteColorMode` with `monochrome` (default, current black sung dots) and `pitch-based` (the exact twelve hex colors supplied by the user, listed in ACN-SPEC). This is a score-wide option independent of `lineColorMode`.

**Consequence:** Color full and half sung dots by pitch class in every octave. Rest dots remain white. Capsules use a lighter gray in Pitch-based note mode for better contrast (`#d9d9d9`; Monochrome retains `#bfbfbf`). Internal word dividers likewise lighten to `#999999` in Pitch-based note mode (Monochrome: `#666666`). Other notation retains its current colors, including the black dots of unpitched beat examples. Use the supplied hex values rather than substituting CSS color-name values.

## D-020 — Keep C prominent with colored notes and monochrome lines

**Decision:** In Pitch-based note mode, horizontal staff lines that would otherwise be black become dark gray, except C lines, which stay black. With Monochrome lines this changes E and G+ to `#999999`; the Standard and Pitch-based line palettes keep their assigned colors. Bar lines, lyric continuations, and light-gray staff lines retain their existing colors.
