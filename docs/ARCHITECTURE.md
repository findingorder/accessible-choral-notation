# Proposed Architecture

**Status:** Initial design direction; implementation has not started.

## 1. Architectural goal

Separate musical semantics from ACN layout and rendering so that the notation system is not tightly coupled to MuseScore or to a particular output format.

```text
Input source
   │
   ▼
Importer / converter
   │
   ▼
Normalized ACN score model
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

The eventual application may allow a user to select an `.mscz` file directly.

### Semantic interchange

Prefer **MusicXML** as the primary semantic interchange format.

Reasons:

- it describes musical semantics rather than MuseScore's private UI/layout state;
- it reduces coupling to a specific MuseScore file-format version;
- it creates a path to import from other notation applications later;
- it is a better fit for a renderer that needs notes, rests, lyrics, directions, measures, and timing rather than MuseScore internals.

If direct `.mscz` input is offered, a thin MuseScore integration/conversion layer can export or convert the source score before parsing.

## 3. Normalized score model

Do not allow MusicXML parser structures to leak directly into rendering code.

Create a compact internal model whose concepts match what ACN needs.

Illustrative shape only:

```ts
interface AcnScore {
  metadata: AcnMetadata;
  parts: AcnPart[];
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

Exact tooling is intentionally undecided until implementation starts.

## 8. Editable overrides — later

A future UI may allow the user to drag text or adjust layout without changing the underlying score semantics.

If implemented, overrides should be stored separately from imported musical data, for example:

```text
semantic score + ACN layout overrides -> rendered score
```

This keeps regeneration safe when the MuseScore source changes.

## 9. First vertical slice

After the notation spec is sufficiently defined, build the smallest end-to-end slice that can prove the architecture:

1. import a tiny MusicXML monophonic vocal fragment;
2. normalize notes/rests/lyrics/measures;
3. lay out pitch and time;
4. render ACN guide lines + one or two events + lyrics to SVG;
5. compare the output against a hand-created reference fixture.

Do not begin by implementing the full Handel score.

## 10. Testing strategy

Later tests should include:

- importer unit tests with small MusicXML fixtures;
- model invariants;
- layout unit tests using deterministic coordinates;
- SVG snapshot tests where useful;
- reference-render regression tests for selected measures from the Handel example;
- manual visual inspection for typography/collision cases that are difficult to assert mechanically.
