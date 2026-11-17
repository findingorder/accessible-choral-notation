# Proposed Architecture

**Status:** The batch pipeline now imports native MuseScore 3 into preliminary version 0.1 `.acn.json` and renders saved music or blank staffs to SVG pages and a vector PDF. The agent editor and the broader designs below remain proposed.

The first milestone requires no input file or web UI: `npm start -- --blank` generates a blank tenor page. The batch pipeline separates import to `.acn.json` from rendering that document to SVG. See README for the current modules and commands.

## 1. Architectural goal

Separate musical semantics from ACN layout and rendering so that the notation system is not tightly coupled to MuseScore or to a particular output format.

```text
Input source
   │
   ▼
Native MuseScore importer
   │
   ▼
Editable ACN project model <── semantic commands <── AI agent <── transcriber
   │
   ▼
Layout engine
   │
   ▼
Vector scene / SVG
   │
   ├── browser preview
   └── PDF export
```

## 2. Input layer

### User-facing source

MuseScore is the preferred score-authoring application.

The user selects a native MuseScore source file and the part to import. ACN reads the native format directly, without requiring an export from MuseScore and without using MusicXML as an intermediate format.

Each imported part produces a separate ACN score. Multiple parts must not share an ACN staff: Tenor 1 and Tenor 2, for example, have separate scores.

When a source encodes distinct vocal lines as multiple voices within one part/staff, the importer must let the user select an individual voice to create its separate ACN score. The exact selection interface remains to be designed.

### Native import boundary

Keep native MuseScore parsing in a dedicated importer that translates the selected part or voice into the normalized ACN model. The renderer works with that model, independent of source-file structures.

The first implementation in `src/musescore.ts` supports the MuseScore 3 subset exercised by the Tallis reference file. It reads the `.mscz` container manifest to find native XML, or reads `.mscx` directly; it never converts through MusicXML. Top-level parts and staves are selected explicitly, without traversing nested extracted scores. See README for supported constructs and rejection behavior. Relative spanner positions follow MuseScore 3’s additive measure/fraction offsets, verified against [the upstream location implementation](https://github.com/musescore/MuseScore/blob/v3.6.2/libmscore/location.cpp).

## 3. Normalized score model

Do not allow native MuseScore parser structures to leak directly into rendering code.

Create a compact internal model whose concepts match what ACN needs.

The actual preliminary import model is in `src/score.ts`; it is independent of XML/parser types. It uses `{numerator, denominator}` whole-note fractions for onsets and durations, one selected part/voice, source-derived deterministic event IDs, explicit tie/slur links, and normalized repeat-ending positions. Repeat endings retain written measure positions on import. A saved score can instead contain explicitly duplicated measures in performance order; optional `sourceNumber` preserves printed source numbers while `number` remains unique and increasing. Copied events need unique IDs and remapped span endpoints. Copied measures record `repeatOf`, the earlier ACN measure number, independently of display numbering. Rehearsal letters on these measures render with a trailing single quote; source direction text remains intact. The saved file includes a source SHA-256 hash, version metadata, and an unset ACN beat unit pending a transcriber choice. Stable identity through later edits/reimport and a public JSON Schema remain future work.

Earlier illustrative shape only (not the implemented schema):

```ts
interface AcnScore {
  metadata: AcnMetadata;
  part: AcnPart;
}

interface AcnPart {
  id: string;
  name: string;
  measures: AcnMeasure[];
}

interface AcnMeasure {
  number: string;
  duration: Rational;
  events: AcnEvent[];
  directions: AcnDirection[];
}

type AcnEvent = AcnNoteEvent | AcnRestEvent;

interface AcnNoteEvent {
  kind: "note";
  pitch: AcnPitch;
  onset: Rational;
  duration: Rational;
  lyric?: AcnLyric;
  tieStart?: boolean;
  tieStop?: boolean;
}

interface AcnRestEvent {
  kind: "rest";
  onset: Rational;
  duration: Rational;
}
```

The exact interfaces must follow the completed ACN specification rather than this sketch.

The editable project must retain pitches, exact timing, lyrics, directions, and ACN transcription choices such as the transcriber's beat unit. SVG is generated output; saving only SVG would lose the editable musical meaning. Persist the editable score as readable, indented JSON with the **`.acn.json`** extension and an explicit format version.

### Persistence format — confirmed; schema to design

Each saved ACN score is a JSON document for one selected part or voice. JSON, readable indentation, the `.acn.json` extension, and a format version are confirmed. The detailed schema remains to be designed; its proposed contents are:

- normalized musical content for that part, including subsequent semantic edits;
- transcription choices such as the ACN beat unit and staff range;
- musical content and transcription choices; presentation settings live separately in score-wide `.acn-layout.json` files;
- source provenance identifying the MuseScore file and selected part, with stable identifiers where available;
- a format version for future migration.

The proposed saved document contains enough musical data to reopen and render independently of the original MuseScore file. Whether to embed a source copy or retain only a source reference is still open. Reimporting a revised source and reconciling ACN edits is a separate, unresolved operation; opening a saved score should not implicitly reimport it.

The illustrative `AcnScore.part` holds the one imported part or selected voice. The detailed schema must preserve this separate-score rule.

### In-memory representation and document lifecycle — proposed design

Opening an `.acn.json` file reconstructs structured objects for the editable score: measures, notes, rests, lyrics, markings, transcription settings, and layout preferences. This semantic model is the authoritative editable state.

The layout engine derives positioned scene objects from that state. The renderer creates SVG elements displayed directly in the editor's browser interface. An HTML canvas is not needed for score display. The semantic model and rendered SVG coexist in memory; the intermediate layout is derived data.

The application can create and update SVG elements directly without generating an SVG text file and reloading it after every edit. Exact incremental rendering and caching strategies remain implementation choices.

Rendered elements link back to stable musical-object identities so selection can identify the corresponding note, beat, lyric, or measure. This relationship need not be one-to-one: a capsule continuing across a system break has multiple rendered segments.

For example, "Make measure 34 wider" updates its width preference, recalculates affected layout (including neighboring measures if required), and updates the SVG display. It does not change musical duration.

- **Save:** serialize the editable model to readable, versioned `.acn.json`.
- **Open:** reconstruct the editable model and regenerate its layout and SVG.
- **Export SVG:** serialize the rendered vector score as `.svg`.
- **Export PDF:** generate a printable document from the same vector rendering pipeline.

Derived SVG elements and cached coordinates are not substitutes for the musical data in the saved document. Detailed runtime types and the JSON schema remain to be designed.

## 4. Timing representation

Use rational musical time internally rather than floating-point seconds.

Examples:

- quarter note = `1/4` of a whole-note unit, or an equivalent normalized tick/rational model;
- onset and duration should be exact enough that tuplets do not accumulate floating-point error.

Real-time tempo in seconds is not required for basic engraving/layout.

## 5. Layout engine

The layout engine converts semantic events into page/system coordinates.

Responsibilities should include:

- pitch-to-row mapping;
- time-to-X mapping;
- measure widths;
- event widths;
- lyric positioning;
- system breaking;
- vertical spacing;
- collision avoidance;
- placement of rehearsal marks, dynamics, tempo text, and other directions.

Layout should produce an intermediate scene description rather than drawing directly while calculating.

### Implemented first music layout

`src/music-layout.ts` validates the monophonic tenor score, derives dot/capsule and lyric groups, computes minimum measure widths from rhythm and measured text, packs measures into systems, and paginates automatically. Minimum measure widths include compound-barline clearance. Surplus line width is distributed by musical duration, then spread over the intervals between dots without scaling fixed text and capsule padding. `pages` affects blank generation only. The final page has no surplus empty systems. `src/layout.ts` accepts measured system plans so the same staff frame serves blank and musical rendering. Scene shapes retain source event IDs, exposed as SVG data attributes. Semantic `breathAfter` on sung events ends a capsule and reserves space for a black comma to its right, without altering musical time. Semantic `fermata` on sung events places a vector arch and dot above the containing capsule segment, centered on its rendered bounds.

Text measurement is an injected callback. The CLI supplies PDFKit measurements through `src/text-metrics.ts`, resolving the same bundled Roboto weight or installed font as vector PDF export. `src/font-families.ts` selects explicit weight aliases, while `src/font-assets.ts` loads bundled faces and supplies embedded SVG font CSS to the pure serializer. Musical time stays in the semantic model; spacing changes only derived coordinates.

`src/layout-settings.ts` merges `default-layout.json` with a required sibling `{name}.acn-layout.json`, followed by any explicit `--layout` override. These files are the only presentation override mechanism and hold score-wide options only. Per-lyric, measure, and system overrides are not supported. Saved lyric fields are limited to verse, text, and syllabic. All four music header fields are stored in the companion, with no metadata fallback. Import initializes them from source title/composer/part and preserves existing companions. The semantic score retains part identity and copyright but no title/composer fields. Runtime validation rejects unsupported music before writing outputs. The prototype heuristics and remaining limitations are documented in ACN-SPEC and README.

## 6. Rendering layer

Prefer **SVG** as the primary rendering target.

Advantages:

- vector quality;
- natural mapping to lines, text, circles, rounded rectangles, and other ACN primitives;
- browser preview;
- inspectability and debugging;
- easy CSS/typeface experimentation;
- a clean path to PDF generation.

The renderer should be as "dumb" as practical: given positioned scene objects, it draws them.

## 7. PDF export

PDF should be generated from the same vector scene used for preview so the preview and printable result do not diverge.

The batch renderer now creates one multipage PDF with PDFKit and svg-to-pdfkit directly from the generated SVG pages. Geometry is converted from 96 SVG units per inch to 72 PDF points per inch. Fontconfig resolves installed fonts for embedding; standard Times/Helvetica fonts are fallbacks when Fontconfig is unavailable.

## 8. Semantic editor and AI agent

### Confirmed product direction

The application must let the transcriber edit pitches, beats, lyrics, and other musical concepts without manipulating individual SVG elements. The intended interaction is an AI agent that accepts descriptions of desired changes and applies them to the editable ACN project. SVG remains the preview and vector output format.

MuseScore remains the preferred source authoring tool. The ACN editor supports semantic changes after import; its role goes beyond layout overrides.

### User-supplied editor examples

These are historical editor examples, not requests to modify the reference score. The later score-wide-only override decision supersedes the local layout preferences in this table; do not implement per-measure or per-system overrides. Interpretations below are proposed behavior; unresolved details remain open.

| User request | Target and proposed effect | Details to resolve |
| --- | --- | --- |
| "Make measure 72 Adagio" | Add or update an Adagio tempo/expression marking at the start of measure 72, using traditional styling above the staff. | Whether this also affects future playback, any numeric tempo, and the duration of its effect. Do not invent a BPM value. |
| "In measure 68, make the lyrics closer to the notes." | Reduce the gap between lyrics and their corresponding capsules in measure 68, preserving translucent white rectangular backgrounds and legibility. | Default adjustment amount and collision constraints. |
| "Make measure 34 wider (narrower)." | Adjust measure 34's layout width and recompute its contents' positions. | Adjustment amount, minimum width, and whether neighboring measures redistribute or system breaks change. |
| "Scale the entire score bigger (smaller)." | Apply a score-wide presentation scale to staff spacing, capsules, dots, text, and related dimensions. | Whether the page size stays fixed and the score reflows, or the physical page scales with it; distinguish output scale from preview zoom. |
| "On the line beginning at measure 32, change the staff range to be from the A before C3 to the F+ above Middle C." | Set the displayed range of that system to **A2 through F+4**, without transposing its musical pitches. | Treatment of notes outside the range and how the override follows measures if later layout changes the system break. |

Musical edits may target individual events; presentation overrides are score-wide only. They also require the agent to interpret relative pitch descriptions in ACN naming and to distinguish semantic changes from presentation changes.

For relative requests such as "closer" or "wider," a proposed interaction is a modest visible adjustment with undo and the ability to say "more" or "less." Exact increments and reflow behavior remain to be designed.

### Proposed design — details to validate

- Give the agent structured editing commands over the project model, such as changing a pitch, replacing a lyric, or setting the ACN beat unit.
- Identify musical objects persistently so a request can target a measure, beat, lyric, or selected passage even after layout changes.
- Validate edits for timing consistency and notation rules, then regenerate layout and SVG from the updated model.
- Show the resulting score and a concise description of the changes, with undo/redo. Ask a focused question when the requested target or musical meaning is ambiguous.
- Store musical edits, transcription settings, and layout preferences separately within the editable project. A layout request such as widening a measure should not change its musical duration.
- Preserve the imported source and track subsequent edits. How to reconcile edits when a revised source score is imported remains an open design question.

The agent interface, command schema, detailed saved-document schema, and first editor milestone remain to be designed. JSON persistence is confirmed. These proposals do not resolve outstanding notation questions or authorize implementing the editor as part of the current batch-rendering milestone.

## 9. First vertical slice

After the notation spec is sufficiently defined, build the smallest end-to-end slice that can prove the architecture:

1. import a tiny native MuseScore score and select a monophonic part or voice;
2. normalize notes/rests/lyrics/measures;
3. lay out pitch and time;
4. render ACN guide lines + one or two events + lyrics to SVG;
5. compare the output against a hand-created reference fixture.

Next, prove one semantic edit, such as changing a pitch or lyric, through a validated command with rerendering and undo before expanding the agent's editing vocabulary.

Do not begin by implementing the full Handel score.

## 10. Testing strategy

Later tests should include:

- importer unit tests with small native MuseScore fixtures;
- model invariants;
- layout unit tests using deterministic coordinates;
- SVG snapshot tests where useful;
- reference-render regression tests for selected measures from the Handel example;
- manual visual inspection for typography/collision cases that are difficult to assert mechanically.
