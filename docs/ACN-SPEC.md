# Accessible Choral Notation Specification

**Status:** Draft 0.1  
**Purpose:** Capture the notation rules precisely enough that software can render ACN deterministically from semantic score data.

This document intentionally separates **confirmed rules** from **observations and open questions**. A visual pattern in the reference score is not normative until its meaning has been confirmed by the notation's creator.

---

## 1. Scope

The first specification target is a **single monophonic choral part**.

Each ACN score contains one selected part. Multiple parts are not placed on the same staff; Tenor 1 and Tenor 2, for example, must have separate scores.

The reference implementation is the tenor part of Handel's *But Thanks Be to God*, stored at:

`reference/But Thanks Be to God.pdf`

The initial software need not support the full universe of traditional music notation. It should first support the musical constructs actually needed to reproduce the reference score faithfully.

---

## 2. Core visual model

### 2.1 Pitch axis — confirmed

Vertical position represents pitch.

ACN uses a stable pitch map rather than requiring the reader to decode pitch through a traditional clef. The reference pages include pitch-name labels and landmark labels such as `Middle C` / octave-numbered C references.

### 2.2 Time axis — confirmed at the conceptual level

Horizontal position represents musical time.

Horizontal spacing may expand to accommodate lyrics; dot positions are therefore not required to follow strictly proportional time spacing. Reference example: PDF page 2, measure 26, “thanks be to”. The exact spacing algorithm remains to be specified.

### 2.3 Sound and silence — confirmed

- **Sung dots are black in the default Monochrome note mode, or pitch-colored in Pitch-based note mode.**
- **White dots are rests.**

This is a fundamental semantic distinction and should remain visually immediate.

### 2.4 Horizontal gray capsules — partially specified

#### Confirmed

- A horizontal gray capsule encloses one or more sequential notes at the same pitch.
- Capsules centered on pitch spaces reach the adjacent horizontal pitch lines with no white gap along their straight upper and lower edges.
- The capsule ends before the pitch changes. A new pitch starts a new capsule.
- Sung dots indicate sound; white dots indicate rests. Sung dots are black by default; optional pitch colors are specified below.
- Long rest sequences use vertical white lines to divide the capsule into beat groups, as described in section 4.
- Capsules may span across barlines; a measure boundary does not by itself require a new capsule.
- When a barline separates syllables of the same word within one capsule, center it between the adjacent dots so their distances from the barline are equal (Tallis measures 15–16, “for”/“ev”).
- Two-dot sung capsules crossing an ordinary barline on the same system should be compact when their lyrics permit. Avoid adding excess spacing from the adjoining measures; preserve the syllable gap, lyric/hyphen clearance, and centered barline. This is a general rule, illustrated by Tallis measures 15–16 and 28–29. The prototype tightens these pairs after system justification, leaving longer text the space it needs.
- When a capsule continues at the same pitch onto a new system (staff line), its outgoing segment extends all the way to the right edge of the measure at the end of the current system, with **square corners** at that edge.
- The incoming segment starts at the left edge of the first measure on the next system, also with **square corners** at that edge, and continues at the same pitch.
- Individual beat dots do not by themselves indicate a new articulation; a sustained note may contain multiple beat dots.
- Vertical lines must be distinguished by function: **measure bars** work as in traditional notation, **white internal dividers** group rest beats, and **dark gray internal lines** mark lyric word boundaries. The earlier generic break-indicator rule is withdrawn; do not interpret every vertical line as a measure bar or assign it an articulation or breath meaning.
- When a single-pitch capsule contains two lyric words, a **dark gray vertical line inside the capsule** marks where the word break occurs. Reference example: PDF page 3, **measure 56**, between “thanks” and “be”.
- Leave extra space on both sides of a gray word divider, as between “love” and “me” in Tallis measure 2. The renderer's provisional `wordDividerPadding` default adds 4 SVG units per side before system justification; this adds no musical time.
- When a word boundary coincides with a measure boundary, the barline serves as the word separator: omit the additional gray divider and its extra padding. Example: “and”/“I” across Tallis measures 5–6. The same-pitch capsule remains connected through the barline.
- Adjacent centered words should have comparable readable spacing, as “keep”/“my” in Tallis measure 3 compared with “love”/“me” in measure 2. When reserving room within a capsule, use the neighboring half-word widths and count divider clearance only once.
- A **gap between sung dots within a single-pitch capsule** can indicate a boundary between syllables of the same word. This gap is **not a rest**. Reference example: PDF page 4, **measure 73**, between “Je” and “sus”. **Provisional sizing rule:** leave the space that one dot would occupy between the surrounding two dots, as though one dot position were omitted. This visual gap does not add a beat or rest.
- White dots retain their confirmed meaning of rest/silence; a capsule does not imply singing through them.
- When singing resumes at the same pitch after a rest within a capsule, it continues in that same capsule. One capsule can therefore contain sung sound, a rest, and more sung sound at the same pitch.
- A rest **at the end of a sung capsule** goes in its own **separate all-rest capsule**. A rest **inside a capsule, between sung portions at the same pitch**, stays in that capsule. This distinction qualifies the earlier half-beat note/rest example: sharing a capsule applies to an internal rest, not a trailing rest.
- In that sung–rest–sung sequence, the white rest dot alone indicates the interruption; no additional interruption mark is added before singing resumes.
- **All-rest capsules use the same vertical position as the previous sung capsule.** At the beginning of a score, before any sung capsule, they use the vertical position of the **first sung capsule**. This placement is for visual convenience only; the rests' vertical position has no pitch meaning.

#### Still to specify

- whether any conditions require a new capsule between sequential notes at the same pitch;
- how musical duration maps to capsule length;
- how full and half dots are arranged for durations spanning multiple beats or combining whole and half beats;
- how source-score ties and repeated notes are distinguished within capsules, and how melismas affect capsule and lyric layout;
- capsule/barline drawing order where they overlap, exact geometry of continuation edges, and whether the same system-continuation treatment applies across page boundaries.

---

## 3. Pitch grid

The reference score displays a continuous vertical pitch region with horizontal guide lines and labeled pitch references at the left edge of selected systems.

### Confirmed

- Pitch is read directly from vertical placement.
- The pitch grid is intended to avoid traditional clef-dependent decoding.
- The staff represents a 12-tone chromatic scale. Successive pitch positions (lines and spaces) represent successive semitones.
- Every successive semitone alternates between a line and a space. This mapping is identical in every octave:
  - **Spaces:** C+, D+, F, G, A, B.
  - **Lines:** C, D, E, F+, G+, A+.
- All chromatic pitches have their own positions; no accidental symbols are needed to alter a note's pitch.
- The same line/space pattern repeats in every octave: each pitch class retains its relative position within the octave's pattern, while higher octaves appear higher vertically.
- In **Standard** color mode, C ("do") is located on a **black horizontal staff line**, in every octave.
- In Standard mode, E is located on a **red horizontal staff line**, in every octave.
- In Standard mode, G+ is located on a **blue horizontal staff line**, in every octave.
- All other horizontal staff lines are **gray**.
- The black, red, and blue lines divide each 12-tone chromatic octave into three regular, predictable groups of four successive pitches:
  - **Black C line:** C, C+, D, D+.
  - **Red E line:** E, F, F+, G.
  - **Blue G+ line:** G+, A, A+, B.
- Each colored landmark line begins its four-pitch group; after the blue group, the pattern repeats at the next octave's black C line.
- The default tenor staff range is **C3 through G+4**, inclusive. Middle C is C4; G+4 is the next chromatic pitch above G4. Octave numbers here identify the range endpoints; exact guide-label formatting remains to be specified.
- The staff range can vary for different voices. Other voice defaults have not yet been specified.

### Line color modes — confirmed

- **Standard:** use the current line colors described above (default).
- **Monochrome:** change red and blue staff lines to black; retain the gray lines.
- **Pitch-based:** use C `#B22222`, E `#008000`, and G+ `#0000FF` in every octave, replacing the Standard black, red, and blue line colors respectively. Gray lines remain gray.
- The score-wide `lineColorMode` setting applies throughout the score and pitch index without changing pitch positions or other notation.

### Note color modes — confirmed

`noteColorMode` is independent of `lineColorMode` and applies score-wide. **Monochrome** is the default and retains black sung dots. **Pitch-based** applies the user's exact palette to full and half sung dots, repeating by pitch class in every octave. Rests remain white. Capsules use a lighter gray in Pitch-based note mode for better contrast (current rendering value `#d9d9d9`, versus `#bfbfbf` in Monochrome). Internal word dividers also lighten in Pitch-based note mode (current value `#999999`, versus `#666666` in Monochrome). Other notation retains its existing colors; time-signature beat-example dots have no pitch and remain black. Earlier black-dot examples describe Monochrome mode.

| ACN pitch | Color |
| --- | --- |
| C | `#B22222` |
| C+ | `#FF8000` |
| D | `#A38300` |
| D+ | `#89BC21` |
| E | `#008000` |
| F | `#008B8B` |
| F+ | `#20B2AA` |
| G | `#6495ED` |
| G+ | `#0000FF` |
| A | `#7F00FF` |
| A+ | `#BA55D3` |
| B | `#FF1493` |

When Pitch-based notes are combined with Monochrome lines, E and G+ staff lines use medium gray (`#999999`) instead of black, while C lines stay black. Standard and Pitch-based line palettes keep their assigned colors; light-gray lines and other notation are unchanged.

In Pitch-based note mode, each pitch-label oval in the pitch index uses its pitch color with white lettering. The C3 and Middle C boxes use the C color and white lettering too. Monochrome note mode retains white label backgrounds and dark text; the gray index panel and its geometry are unchanged.

### Pitch naming — confirmed

- ACN does not use the terms or symbols "sharp" or "flat" for pitch names.
- A `+` after a whole-letter pitch name denotes the next chromatic pitch above it. For example, `A+` is the next pitch after `A`.
- When the next chromatic pitch already has a whole-letter name, use that name. There is no `E+`, because `F` immediately follows `E`; likewise, `C` follows `B` without a `B+` name.
- The repeating ascending pitch-name sequence is **C, C+, D, D+, E, F, F+, G, G+, A, A+, B**, then C in the next octave.
- These names identify dedicated positions on the staff; `+` is part of the pitch name, not an accidental applied to a note.

### Note guide placement — confirmed

- The note guide is the gray block at the left end of a staff, showing the pitch names at their corresponding vertical positions.
- A **vertical black line** runs along the **left edge of the pitch index**.
- The **C3 label at the bottom left of the index** sits inside a **narrow rounded rectangle with a thin black border**. Exact dimensions, corner radius, and border thickness are provisional rendering settings.
- The **Middle C label** also uses a **narrow rounded rectangle**, fitted closely around its text. Exact dimensions remain provisional.
- Pitch-index page placement is configurable as **every page**, **even pages only**, or **odd pages only**, with odd pages as the default. Page parity uses one-based page numbers. On a selected page the index appears on the first system. This explicit setting supersedes the earlier blanket rule requiring an index on each standalone page or facing-page pair. Whether an index may also appear on later systems remains unspecified.

### Reference examples

- PDF page 2, first system: the left-hand pitch legend accompanies the tenor staff.
- PDF page 4: the tenor legend is repeated, and the comparison with traditional clefs shows a broader pitch region.

### To specify

1. How are line and space positions aligned with the centers of capsules and beat dots?
2. What is the physical spacing between adjacent semitone positions?
3. What exact color values should be used for the black, red, blue, and gray staff lines?
4. What thickness should the staff lines have?
5. Color modes and the Pitch-based palette are confirmed above; color-mode selection and staff-line thickness are configurable.
6. Which C pitches receive explicit labels such as `C3`, `Middle C`, etc.?
7. May the note guide also appear on later systems, and how is facing-page versus standalone-page layout selected?
8. Does the pitch map transpose visually for transposing music, or always show sounding/concert pitch?
9. What are the default ranges for other voices, and how is a range selected or changed?
10. How should pitches outside the selected staff range be displayed?

---

## 4. Rhythm and duration

### Confirmed

- Time progresses left to right.
- Sung and rest events are distinguished by black vs. white dots.

### Beat terminology and dot shapes — confirmed

- The transcriber chooses what duration in the source score counts as **one ACN beat**. This is a human judgment that depends on the score's note and lyric density, rather than a fixed mapping from conventional meter or note values.
- ACN describes durations in **beats**, rather than using conventional note-value names such as "quarter note" or "eighth note."
- A **whole beat** is represented by a full circular dot.
- A **half beat** is represented by a semicircular half dot.
- Half dots usually appear as **facing pairs**. This is a usual arrangement, not a requirement that every half dot have a partner.
- For an **unpaired half dot**, the flat side faces **left at the beginning of a capsule** and **right at the end of a capsule**. If it is the **only dot in the capsule**, or is **inside a capsule with full dots on both sides**, its flat side faces **up**.
- In a facing pair, the **flat edges face one another**.
- Two consecutive half-beat notes at different pitches still form a facing pair: the first half dot has its **flat edge facing right**, and the second has its **flat edge facing left**, even though they occupy different heights in separate capsules.
- A half-beat sung note followed by a half-beat rest also forms a facing pair: the black half dot has its **flat edge facing right**, followed by a white half dot with its **flat edge facing left**. Both dots sit inside the same gray capsule when the rest is internal to a same-pitch sung sequence. Under the subsequently clarified trailing-rest rule, a rest at the end of a sung capsule instead occupies a separate all-rest capsule.
- The reference score uses whole beats and half beats. Rules for other beat subdivisions have not yet been specified.
- Dot shape expresses duration; the established black/white distinction expresses singing versus rest.
- A single note sustained for **2½ ACN beats** is drawn as **two full black dots followed by one black half dot**, all inside one capsule. The final half dot has its **flat edge facing right**. This confirms this duration example; the general rules for other mixed whole-and-half-beat durations remain to be specified.

The general pairing rule remains unresolved. Unpaired half-dot orientation at capsule beginnings and ends, when alone, and inside a capsule with full dots on both sides is confirmed above. Facing-pair orientation across a pitch change is confirmed above.

### Time-signature display — confirmed

- ACN uses an example capsule instead of a numeric time signature.
- The example capsule appears below the gray note guide and shows the number of beats per measure.
- The time-signature example spans the width of the pitch index: its vertical end bars align exactly with the left and right edges of the index. The gray capsule is inset from both bars, leaving visible white space at each end (provisional inset: 4 SVG units).
- Its dots are centered as a group with slightly tighter spacing, without narrowing the capsule (provisional dot span: 90% of the available span after end padding).
- Reference example: PDF page 2, beneath the note guide for the first system.

Full dots represent whole beats using the transcriber's chosen beat unit. At every time-signature change, place a new dotted time-signature capsule below the first measure with the new signature. Count dots from the meter, not the actual duration of an incomplete measure. Thus Rachmaninov starts with four dots below the first-page pitch index, then six dots below measure 20 and four below measure 26. Change markers are centered below their measures, clear of lyrics; extra vertical space is reserved when needed. Later pitch-index examples use the meter active at that index.

### Optional beat-count labels — confirmed

- The composer, arranger, or transcriber may optionally place beat numbers above individual beats in sequences that are hard to count.
- The numbers appear outside and above the capsules, aligned with the beats they identify.
- Reference example: PDF page 2, measure 29. The `3` and `7` are beat-count labels, not tuplet indications.
- In measure 29, the rest capsule runs from beat **3** through beat **7**. These labels mark its beginning and end to help singers count the tricky rhythm.

### Grouping long rest sequences — confirmed for the current example

- In a **full-measure rest with eight beats**, the capsule contains eight white rest dots and a **vertical white line between beats 4 and 5**, dividing them into two groups of four. Reference example: PDF page 2, **measure 37**. This internal divider groups rest beats; it is not a measure bar.
- In a long sequence of rest beats within an 8-beat measure, a vertical white line breaks the capsule between beats 4 and 5.
- For measures with more beats, the current rule places a vertical white divider between successive groups of four beats in a long rest sequence.
- Reference example: PDF page 2, measure 29.
- In measure 29, the rest begins on beat 3 and crosses the half-measure boundary. Its white divider falls **between measure beats 4 and 5**, after the capsule's first two rest dots. The divider follows the measure's beat grouping, rather than counting four rest dots from the start of the capsule.
- **Pending revision:** This grouping rule must be revisited for scores "in 3" rather than "in 4." Do not assume groups of four apply to every meter.

### To specify

1. How is the transcriber's chosen beat unit recorded, and may it change within a score?
2. How are full and half dots spaced, and does their spacing change with rhythmic context?
3. How are durations combining whole and half beats represented?
4. Resolved for arcs: source ties and slurs use traditional curved marks, always above the notes.
5. How are syncopations represented?
6. How are tuplets represented?
7. What are the exact alignment and vertical offset for optional beat-count labels?
8. How is a new articulation at the same pitch indicated when there is no rest?
9. When do adjacent gray shapes touch, overlap, or remain separated?
10. How are pickup measures and incomplete measures handled?
11. What grouping or other details, beyond the beat dots, are required in the example time-signature capsule?
12. Resolved: time-signature capsules accompany pitch indexes; each meter change is additionally marked beneath its first measure.
13. Which half beats are paired? Unpaired orientation at capsule beginnings and ends, when alone, and inside a capsule with full dots on both sides, and facing-pair orientation across a pitch change, are confirmed above.
14. How are beat subdivisions other than halves represented?
15. How should rest grouping work for scores "in 3" and other meters?
16. Measure 29 confirms that a partial-measure rest crossing the midpoint of an eight-beat measure is divided at that measure boundary between beat groups. How does this extend to other meters and longer rest sequences?
17. What width and height should the white capsule dividers have?

---

## 5. Lyrics

The reference notation integrates lyrics tightly with the sung events.

### Confirmed

- Lyrics appear close below their corresponding pitch capsules.
- **Starting spacing:** one pitch space below the sung dots/capsule is the default before applying word alignment, continuation, and readability decisions. It is not limited to Tallis measures 22–23. The current renderer measures this clearance from the capsule bottom to the top of the lyric text box: `lyricGap: 14` SVG units, one pitch-line space at `semitoneStep: 7`. Later placement decisions may move lyrics farther down.
- All lyrics have **translucent white rectangular backgrounds** for legibility, allowing horizontal pitch lines to remain **faintly visible behind them**. This corrects the earlier opaque-background description. Exact opacity remains to be specified.
- Words may share a baseline for readability, but a measure boundary does not by itself group unrelated words vertically. Determine the starting height from each word’s own notes; a lower neighboring word must not pull a higher word away from its capsule (Tallis “ev’n” in measures 19 and 32).
- All syllables of the same word must share one vertical baseline, including their hyphens and underscore extensions. Keep it below the lowest relevant dots, including across measures; across systems/pages retain the same height relative to the staff. Tallis examples: “for–ev–er” in measures 15–16 and 18–19. Other words may remain closer to their own dots.
- In Tallis measures 22–23, place lyrics close to their own capsules, about one pitch space below; a low note elsewhere in the measure must not pull all of these lyrics downward. Apply the same placement to their unfolded copies in measures 35–36.
- The lyric baseline may change within a measure when the pitch changes substantially, keeping lyrics close below the corresponding capsules. A single baseline throughout a measure is not mandatory.
- **Placement principle:** make lyrics as close to the dots as reasonably possible while keeping them easy to read. Avoid excessive vertical jumping. Choosing when to keep a shared baseline and when to move it is a **transcriber judgment call**, not a confirmed fixed pitch-change threshold.
- A shared lyric baseline may extend across multiple measures below the lowest note in the passage. Reference example: PDF page 3, **measures 64–67**, where lyrics remain at the same vertical level. In contrast, PDF page 4, **measure 69**, moves lyrics vertically to keep them near their dots. Both are intentional applications of the placement principle.
- Dots may be spaced farther apart to make room for lyric words. Reference example: PDF page 2, **measure 26**, “thanks be to”. This is a layout adjustment, not a change in musical duration.
- When one word or syllable occupies a **two-dot capsule**, center it beneath the pair (Tallis measure 22, “truth,” and its repeated measure 35). This also applies to each two-dot word/syllable group within a shared capsule: Tallis measure 26’s “truth” and “that” each center beneath their own pair. Single-dot syllables keep their individual anchors.
- Otherwise, each lyric syllable is **centered under its first dot**, as clarified by “If” and “ye” in measure 1 of *If Ye Love Me*. This supersedes the earlier capsule-edge alignment. When a syllable spans a sequence of pitches, center its text under the first dot of that sequence. Choose a vertical position that keeps the lyric **below all dots in that sequence**, and use **uninterrupted underscores for the remainder of the horizontal distance**. The underscore begins immediately at the end of the lyric text, with no intervening space. This supersedes the earlier spaced-hyphen rule for long syllables.
- Apply alignment and compact two-dot spacing as common rules, without score-specific event IDs or saved corrections. Automatic two-dot grouping gives “love” pair centering, leaves the longer “me” continuation at its first dot, and centers the two-dot “mand” and outgoing “ments” segments. These choices are derived by the renderer; per-lyric layout overrides are not supported.
- Omit very short continuation underscores, such as the one after “love” in Tallis measure 2. The provisional renderer threshold is `lyricContinuationMinLength: 28` SVG units, applied to the available extension before clipping at a capsule edge; qualifying extensions still begin immediately after the text and are retained if capsule-edge clipping shortens them.
- Exception: retain a trailing underscore when the syllable continues onto the next system, even if the available segment is short. Example: “ments” in Tallis measure 4 signals continuation into measure 5 on the next line.
- When a syllable ends with its sung capsule, cap its continuation underscore at that capsule’s trailing edge, including before a pitch change (Tallis measure 10, “give”).
- When that continuation ends before a rest, its underscore must not extend past the trailing edge of the sung capsule. In Tallis measure 5, the incoming “ments” continuation ends at its sung capsule, before the separate rest capsule.
- If that sequence continues onto the next system, the new system begins with a continuous underscore until the next syllable, at the **same vertical level relative to the staff**. At a system break, the outgoing underscore reaches the right barline and the incoming underscore starts at the left barline, with no white gap (Tallis measures 4–5). Other clearance, underscore thickness, behavior when the staff range changes between systems, and continuation across page breaks remain to be specified.
- When two lyric words occur within one single-pitch capsule, a dark gray vertical line in that capsule indicates the word boundary (PDF page 3, measure 56: “thanks” / “be”).
- For different syllables of the same word at one pitch, a gap between sung dots indicates the syllable boundary without indicating a rest (PDF page 4, measure 73: “Je” / “sus”). Provisionally, the gap occupies one omitted dot position between the surrounding dots, as described in section 2.4. Its interaction with the overall time-spacing algorithm remains to be specified.

### Reference examples

- Handel reference PDF, page 2, measure 31: the rising pitch capsules have lyric fragments at different heights within the measure.
- Handel reference PDF, page 4, measure 72 (under `Adagio`): the lyric placement shifts down for `Lord` beneath the lower capsule.

### Observed

- Hyphens and extended syllables are represented in a way that retains normal lyric readability.
- Melismatic passages appear to allow a lyric syllable to span multiple musical events.

### To specify

1. Exact anchoring of a lyric syllable to its note/event.
2. Default gap below capsules and renderer heuristics for balancing proximity with stable, readable baselines, including across measures. Baseline changes are a transcriber judgment call; no fixed pitch-change threshold is confirmed. What general rules and score-wide settings should express this judgment?
3. Translucent white-background opacity and padding, and collision-avoidance rules when pitches descend into lyric space.
4. Hyphen rules for multi-syllable words.
5. Exact clearance, underscore thickness and endpoints for a syllable spanning multiple pitches, behavior when the staff range changes between systems, and continuation across page breaks. Centering the lyric text under its first dot, remaining below the entire sequence, and extending with uninterrupted underscores onto the next system at the same vertical level are confirmed.
6. Rules for elision, apostrophes, punctuation, and repeated words.
7. How much horizontal spacing to add for lyric readability, and how that adjustment affects neighboring dots and measure width. Expanding dot spacing to accommodate words is confirmed.

---

## 6. Measures and systems

### Blank-page default — confirmed

- The blank-score generator defaults to **four measures per system**, with the first measure number above each system (1, 5, 9, 13, 17 on the initial five-system page). This is a blank-page default, not a fixed measure count for imported music. Equal widths within each blank system are a provisional layout choice.

### Observed

- Vertical measure boundaries are retained.
- Measure numbers are displayed.
- The score wraps into systems across the page.

### Confirmed

- A measure number always appears above the first measure of each system (staff line).
- Measure numbers are positioned **above the top line of the ACN staff**.
- Measure numbers use a **serif font**. The renderer requests Times New Roman, matching the reference, with Times and generic serif fallbacks.
- Measure bars are used as in traditional music notation.
- When transcribing a traditional score, attempt to match its measure numbers and rehearsal letters so singers can follow the director's rehearsal instructions using the same references. Handling source-numbering exceptions remains to be specified.
- Measures may vary in width according to the density of beats and lyrics they contain.
- Leave extra space between a starting measure barline and the first new capsule. Capsules continuing across a barline remain connected. The gap after the final capsule should be comparable to the gap before the first capsule (Tallis measure 1: after “ye” and before “If”). The prototype uses `measureStartPadding` and `measureEndPadding`, both 12 SVG units by default.
- Barlines are always **black**.
- Different barline types from traditional notation are supported. The exact supported types and their rendering details remain to be enumerated.

### To specify

1. How beat and lyric density determine measure width, and whether musical duration also contributes to the width calculation.
2. Minimum/maximum measure widths.
3. How many measures should appear per system.
4. Whether explicit MuseScore system/page breaks should be honored.
5. Rules for first/last measures of a system.
6. Enumerate the supported traditional barline types and specify their geometry, including line thicknesses and spacing.
7. Whether measure numbers may also appear above other measures, and their exact alignment and offset above the measure.

---

## 7. Rehearsal, tempo, dynamics, and expression text

The reference score preserves familiar conventional markings including rehearsal letters, dynamics, `rit.`, and `Adagio`.

### Dynamics and other text markings — confirmed

- A textual dynamic marking appears **directly above the dot where it takes effect**. It has a **white, borderless square background** that separates it from the horizontal staff lines; those lines do not show through the background. Reference example: PDF page 2, **measure 25**, the forte (`f`) marking. This supersedes the earlier rule placing all textual dynamics above the top staff line.
- Other text markings, including tempo and expression text such as **`rit.` and `Adagio`**, appear **above the top line of the staff**. Hairpins follow the separate placement rule below.
- Textual dynamics (`p`, `f`, `ff`, etc.) use bold italic serif type, retaining traditional dynamic styling.
- Lyrics follow the separate placement rules in section 5.

Opening metronome tempo appears above the first-page pitch index: a capsule of black dots representing the tempo unit in ACN beats, followed by `= BPM`. It replaces the equivalent textual metronome marking. For example, a quarter-note tempo with eighth-note ACN beats uses two dots. Store `metronome: {unit: {numerator, denominator}, bpm}` on the tempo direction; this is semantic music data.

### Hairpin dynamics — confirmed placement

- Hairpin dynamic markings appear **above the group of dots they apply to**. A hairpin connecting two dynamic markings on the same system sits horizontally between them, aligned with their vertical centers and separated from their letters by a small gap. Keep this row above the arcs.
- When the affected dots have different pitches, the hairpin is placed vertically **above the highest pitch in the covered span**.
- Hairpins have a **white, borderless background**. **Tentative direction:** use translucency like the lyric backgrounds, allowing horizontal pitch lines to remain faintly visible. Translucency for hairpins is not yet a final decision; the earlier claim that their backgrounds fully mask staff lines is withdrawn.
- Implemented prototype: semantic crescendo/diminuendo spans use exact measure/onset endpoints. Draw a black wedge above the highest pitch in the entire span; its opening continues proportionally across system/page breaks. Translucent white backing currently uses `lyricBackgroundOpacity`. Wedges move above overlapping dynamic/fermata backgrounds. Exact clearance, dimensions, and background opacity are rendering choices for review. Native MuseScore hairpin import remains future work.

### Breath marks — confirmed

A breath mark is a **large black comma to the right of the capsule** after which the breath is indicated. It remains black in either note color mode. The semantic event flag `breathAfter: true` marks the sung event after which to breathe; it does not insert a timed rest or change the lyric's punctuation. A breath ends its capsule, even when the next note has the same pitch. Layout reserves horizontal room for the comma before the next capsule or barline, keeping it with the preceding capsule at system/page breaks. Current size (three times capsule height) and clearance (4 SVG units) are provisional rendering choices.

The working Tallis score has a breath after “er,” in measure 13.

### Rehearsal markers — confirmed

- Rehearsal markers from the score used by the conductor may optionally be included in the ACN part.
- They appear as **large letters** or **circled numbers**, matching the rehearsal identifiers in the conductor's score.
- They are placed **above and near the beginning of the corresponding measures**.
- When a rehearsal letter is repeated by unfolding a repeat, append a **single quote** (prime), for example `C'`. The original occurrence retains its original letter. Copied measures carry semantic `repeatOf` provenance; the renderer adds the prime without changing the saved direction text. Reusing a letter elsewhere does not by itself indicate an unfolded repeat.

### Working principle

Do not redesign conventional markings that are already accessible and unambiguous unless ACN has a specific reason to do so.

### To specify

- exact alignment and gap above the target dot for dynamics, and square-background size and padding;
- exact size, alignment, and vertical offset for rehearsal markers;
- exact horizontal anchoring and vertical offset above the staff for tempo and expression text;
- precedence/collision rules among these labels;
- which native MuseScore text/direction categories should be imported.

---

## 8. Page furniture and metadata

The reference PDF includes title/composer/part information, copyright/licensing text, and an explanatory pitch-grid comparison.

The first renderer should distinguish score-semantic output from optional publication furniture.

### Confirmed title storage

- Import initializes center title from the source title, right title from the composer, and center subtitle from the selected part; left title starts empty. All four fields live in the required companion `.acn-layout.json`, and only that layout supplies the displayed headers.
### To decide

- Whether legal/licensing text is template-based.
- Whether the pitch legend/comparison diagram is generated automatically or maintained as a static publication element.

---

## 9. Accessibility goals

The notation should optimize for a singer who needs to follow one vocal line accurately without first mastering traditional clef-based notation.

Design goals include:

- direct pitch mapping;
- direct visual representation of time;
- immediate distinction between singing and silence;
- strong alignment between lyrics and musical events;
- minimal symbolic indirection;
- predictable visual grammar across pages and pieces.

These are design goals, not substitutes for exact rendering rules.

---

## 10. Specification process

For each rule we add, capture:

1. **Semantic meaning** — what musical fact is being represented.
2. **Visual encoding** — how ACN represents it.
3. **Layout rule** — how it is positioned and sized.
4. **Edge cases** — how unusual examples behave.
5. **Reference example** — a page/measure from a known score when possible.

The specification is ready to drive implementation only when the core pitch, rhythm, rest, lyric, and measure rules can be applied without relying on the creator's visual intuition.


## 11. Current prototype choices — provisional, for review

The Tallis tenor renderer implements confirmed rules with the following **implementation heuristics**, not additional normative notation rules:

- Whole/half-beat durations expand to full dots followed by a half dot when needed. Adjacent half dots pair in chronological order, including across pitch changes; the wider pairing rule remains unresolved.
- Consecutive same-pitch notes share a capsule, including ties. Explicit source ties and slurs are drawn as traditional arcs above the notes. Ordinary barlines do not break capsules. Repeat starts/ends and starts of alternate endings terminate capsules to avoid suggesting continuation across playback jumps. Page breaks currently use the same square-ended continuation as system breaks.
- One omitted dot position is reserved at a same-pitch syllable change. Word boundaries get dark gray dividers when they occur within a system; a new system starts without a redundant boundary divider. Widths expand for measured lyric text. Music measures are packed greedily by their required width, without a four-measure limit or compression below the dot/lyric minimum widths. `musicMeasuresPerSystem` defaults to `"auto"`; a positive whole number imposes a maximum. `measuresPerSystem` controls blank scores only.
- Horizontal justification first reserves minimum widths for dots, lyrics, capsule padding, and barlines. Remaining line width is shared among measures in proportion to musical duration, rather than their text-driven minimum widths. Within a measure, extra width stretches musical intervals between the first and last dots; it does not multiply the fixed lyric/capsule clearances. Single-dot measures center their content in the extra width. Two-dot capsules crossing barlines still compact afterward when lyrics permit.
- End padding is measured from the innermost stroke of a final, double, or repeat barline, so compound barlines do not consume the capsule’s end clearance. These rules give held-note measures room without disproportionate word spacing in neighboring measures (review example: measures 36–39).
- Lyrics begin one pitch space below the lowest capsule in their own sung sequence. Syllables belonging to the same word then share the lowest required baseline, including continuations across systems/pages. Unrelated words do not inherit another word’s height. Vertical pagination uses these final lyric positions. Notes without new lyric text continue the previous syllable until a rest, new syllable, or repeat boundary. General phrase-level smoothing beyond word alignment remains a transcriber judgment; no fixed threshold for it has been established.
- Capsule height 14 (matching the two-semitone distance between adjacent lines), dot radius 3.8, capsule end padding 10 (from the full-dot edge), beat spacing 18, lyric size 14, lyric font weight 500 (Roboto Medium, using a real intermediate weight), lyric gap 14 (one pitch-line space at the default staff spacing), and lyric background opacity 0.85 are editable defaults in SVG units. Baseline, padding, and lyric-extension placement algorithms remain provisional. Sustained syllables use continuous vector underscore lines with translucent white backgrounds; ordinary syllable separators use a single hyphen.
- Capsules are painted over pitch lines; black measure bars are painted over capsules. Conventional two-pass repeat bars, double/final bars, and numbered ending brackets use provisional geometry. Final barlines match the reference PDF’s ending on page 4: a thin stroke followed by a stroke six times as thick, with stroke centers nine thin-stroke widths apart. The thick stroke’s outer edge aligns with the staff end. These proportions scale with `barLineWidth`; at the default 0.8, the thick stroke is 4.8 SVG units and center spacing is 7.2. The reference’s vector strokes measure 0.5 and 3 PDF points with 4.5 points between centers. Textual dynamics have opaque square backgrounds; tempo/expression and rehearsal text go above the staff. General collision avoidance for dense combinations of directions/endings remains future work.
- The beat-example capsule repeats with each displayed pitch index. This renderer supports changing meters with 1–16 whole ACN beats per measure, and event durations/onsets in whole or half beats. It rejects unsupported subdivisions, multiple lyric verses, and pitches outside C3–G+4. An entirely silent score needs a rest-position rule and is not rendered yet.
- Output page count is derived from the music, as requested by the user. `pages` applies only to blank scores. Staff count and spacing remain configurable, with only needed systems drawn on the last page.

Every saved score requires `{name}.acn-layout.json`, containing all four title fields plus any score-wide partial overrides of `default-layout.json`. Displayed titles are not stored in the music JSON. Per-lyric `alignment` and `capsuleGap` fields have been removed and are rejected on input. There are no measure/system layout exceptions in `.acn.json`. Examples in this specification are regression cases, not conditions in the renderer.

Beat-count annotations and automatic source system-break handling are not yet implemented. These limitations do not change the confirmed notation rules above.

### Tallis repeat transcription

The user requested writing out the repeat rather than displaying repeat signs. The working Tallis score follows source measures 1–26, then 14–25, then the second ending at 27: 39 measures in performance order. Number the unfolded measures consecutively 1–39: the second pass starts at 27, and the final second-ending measure is 39. This supersedes the initial duplicated source-number display. Rehearsal letters are retained. This is a piece-specific transcription choice, not a change to the native importer’s repeat preservation.

### Fermatas — confirmed

A large fermata appears above the capsule it applies to, centered horizontally on that capsule. Store `fermata: true` on the sung event; the hold does not change its notated duration. For a capsule continuing across systems, the mark belongs to the segment containing the annotated event. The renderer draws one black vector arch and dot per marked capsule segment, independent of note color mode. Current size (two capsule heights wide), clearance (7 SVG units), and translucent white backing are provisional rendering choices. The final “truth.” in the working score carries this marking. Native MuseScore fermata import remains future work.

### Divided voices — updated scope

The user requests Tenor 1 and Tenor 2 together on one pitch grid, using simultaneous capsules, rather than separate staffs or separate scores. Independent voice rhythms must be preserved. The Rachmaninov example uses English lyrics, eighth-note ACN beats, a four-dot incomplete opening measure, 4/4 through measure 19, 6/4 in measures 20–25, and 4/4 again from measure 26. The shared-grid prototype aligns beat positions across voices, merges coincident unisons, and aligns matching lyrics below both voices. Source meters remain unchanged: their dotted examples now contain 8, 12, and 8 dots respectively. Dense divisi engraving remains subject to visual review.

### Slur and tie placement — confirmed

Slurs and ties retain their traditional curved appearance. In unison and upper voices they appear above the notes. In divisi, lower-voice arcs appear below their capsules and above the lyrics. This supersedes the earlier always-above rule. Both ties and slurs extend from the first dot of their starting event to the last dot of their ending event, covering all dots represented by the connected notes. Render the explicit semantic spans; do not infer extra arcs from lyric syllables or shared capsules. The prototype uses black tapered curves above the covered capsules, with enclosing slurs above shorter arcs. Arc endpoints follow the pitches of their respective notes with equal vertical clearance above the capsules. Different endpoint pitches therefore produce a sloped arc; its arch clears the full capsule envelopes, including padded leading and trailing edges, as well as intervening notes. Arcs occupy the closest position to the notes on their assigned side. Dynamics, hairpins, fermatas, and other markings belong above the arcs; overlapping symbols and their backgrounds move upward together. Spans continue across systems/pages. Exact arch height and clearance remain rendering choices for review.

Time-signature change capsules span the full width of their measure. Their two vertical end lines align with the beginning and ending barlines, retaining the small white gaps between the capsule and its end lines. This applies to every score.

Time-signature change capsules include their ACN beat count in black at the start, inside the capsule, with space reserved before the dots. Pitch-index beat examples retain dots only.

### Twelve-beat measure subdivision

Display full twelve-ACN-beat measures as two six-beat groups separated by a light gray vertical barline. Preserve the original measure number, source meter, duration, and event times. At the change into this grouping, show one six-dot capsule with a bold `6` below the first half, aligning its end lines with the opening barline and subdivision barline. Pitch-index examples in this meter also show the six-beat group. This supersedes the full-width twelve-dot change indicator; other meter-change indicators retain their existing behavior.

Lower-voice arc placement is determined by overlapping sounding pitches, not voice numbering. Shared lyrics move below the lower arcs as needed; all syllables of a word retain a shared baseline. Arc clearance participates in pagination, including spans crossing systems or pages.

For a sustained syllable, use text clearance at its lyric-bearing note and continuation-stroke clearance at later notes. Lower continuation notes need not reserve the full height of text that does not appear beneath them. Keep the word and its extension on one baseline, below all capsules with the configured clearance. Lower divisi arcs still take precedence over lyric placement.
