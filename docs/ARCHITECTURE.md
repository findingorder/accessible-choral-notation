# Proposed Architecture

**Status:** Batch-first implementation has begun with the standalone blank-staff SVG generator. Import, persistence, musical-event layout, and editor designs below remain proposed.

The first milestone requires no input file or web UI: `npm start -- --blank` generates a blank tenor page. The later batch pipeline separates import to `.acn.json` from rendering that document to SVG. See README for the current modules and commands.

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

Supported MuseScore versions, native file variants, and handling of unsupported source constructs remain to be specified and verified against native fixtures.

## 3. Normalized score model

Do not allow native MuseScore parser structures to leak directly into rendering code.

Create a compact internal model whose concepts match what ACN needs.

Illustrative shape only:

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
- layout preferences and overrides at score, system, and measure scope;
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

These are desired editor interactions, not requests to modify the reference score. Interpretations below are proposed behavior; unresolved details remain open.

| User request | Target and proposed effect | Details to resolve |
| --- | --- | --- |
| "Make measure 72 Adagio" | Add or update an Adagio tempo/expression marking at the start of measure 72, using traditional styling above the staff. | Whether this also affects future playback, any numeric tempo, and the duration of its effect. Do not invent a BPM value. |
| "In measure 68, make the lyrics closer to the notes." | Reduce the gap between lyrics and their corresponding capsules in measure 68, preserving translucent white rectangular backgrounds and legibility. | Default adjustment amount and collision constraints. |
| "Make measure 34 wider (narrower)." | Adjust measure 34's layout width and recompute its contents' positions. | Adjustment amount, minimum width, and whether neighboring measures redistribute or system breaks change. |
| "Scale the entire score bigger (smaller)." | Apply a score-wide presentation scale to staff spacing, capsules, dots, text, and related dimensions. | Whether the page size stays fixed and the score reflows, or the physical page scales with it; distinguish output scale from preview zoom. |
| "On the line beginning at measure 32, change the staff range to be from the A before C3 to the F+ above Middle C." | Set the displayed range of that system to **A2 through F+4**, without transposing its musical pitches. | Treatment of notes outside the range and how the override follows measures if later layout changes the system break. |

The examples require measure-level, system-level, and score-wide editing scopes. They also require the agent to interpret relative pitch descriptions in ACN naming and to distinguish semantic changes from presentation changes.

For relative requests such as "closer" or "wider," a proposed interaction is a modest visible adjustment with undo and the ability to say "more" or "less." Exact increments and reflow behavior remain to be designed.

### Proposed design — details to validate

- Give the agent structured editing commands over the project model, such as changing a pitch, replacing a lyric, or setting the ACN beat unit.
- Identify musical objects persistently so a request can target a measure, beat, lyric, or selected passage even after layout changes.
- Validate edits for timing consistency and notation rules, then regenerate layout and SVG from the updated model.
- Show the resulting score and a concise description of the changes, with undo/redo. Ask a focused question when the requested target or musical meaning is ambiguous.
- Store musical edits, transcription settings, and layout preferences separately within the editable project. A layout request such as widening a measure should not change its musical duration.
- Preserve the imported source and track subsequent edits. How to reconcile edits when a revised source score is imported remains an open design question.

The agent interface, command schema, detailed saved-document schema, and first editor milestone remain to be designed. JSON persistence is confirmed. These proposals do not resolve outstanding notation questions or authorize implementing the editor in the current blank-page milestone.

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
