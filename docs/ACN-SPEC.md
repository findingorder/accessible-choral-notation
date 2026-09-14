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

The exact spacing algorithm—strict proportional spacing, constrained proportional spacing, or a hybrid with lyric/layout adjustment—has **not yet been specified**.

### 2.3 Sound and silence — confirmed

- **Black dots are sung.**
- **White dots are rests.**

This is a fundamental semantic distinction and should remain visually immediate.

### 2.4 Horizontal gray capsules — partially specified

#### Confirmed

- A horizontal gray capsule encloses one or more sequential notes at the same pitch.
- The capsule ends before the pitch changes. A new pitch starts a new capsule.
- Black dots indicate sung sound; white dots indicate rests.
- Long rest sequences use vertical white lines to divide the capsule into beat groups, as described in section 4.
- Capsules may span across barlines; a measure boundary does not by itself require a new capsule.
- When a capsule continues at the same pitch onto a new system (staff line), its outgoing segment extends all the way to the right edge of the measure at the end of the current system, with **square corners** at that edge.
- The incoming segment starts at the left edge of the first measure on the next system, also with **square corners** at that edge, and continues at the same pitch.
- Capsules are assumed to sustain across successive sung beat dots unless a break indicator appears between notes. Individual beat dots do not by themselves indicate a new articulation.
- A **vertical darker gray line spanning the capsule's entire height** indicates a **break between notes** within the capsule.
- This is a break indicator, not a breath indication; this rule corrects the earlier description. It is distinct from the white dividers used to group rest beats.
- White dots retain their confirmed meaning of rest/silence; the default sustain rule does not imply singing through them.
- When a group of rests occupies its own capsule, that capsule uses the same vertical pitch position as the preceding capsule. This placement is for visual convenience only; the rests' vertical position has no pitch meaning.

#### Still to specify

- whether any conditions require a new capsule between sequential notes at the same pitch;
- when rests share a capsule with sung beats versus occupy their own capsule, and where a rest capsule is placed when there is no preceding capsule;
- how musical duration maps to capsule length;
- how full and half dots are arranged for durations spanning multiple beats or combining whole and half beats;
- how source-score ties and repeated notes map to the confirmed sustain/break rules, and how melismas affect capsule and lyric layout;
- capsule/barline drawing order where they overlap, exact geometry of continuation edges, and whether the same system-continuation treatment applies across page boundaries.
- the exact gray shade, thickness, and horizontal placement of break indicators relative to beat dots.

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
- C ("do") is always located on a **black horizontal staff line**, in every octave.
- E is always located on a **red horizontal staff line**, in every octave.
- G+ is always located on a **blue horizontal staff line**, in every octave.
- All other horizontal staff lines are **gray**.
- The black, red, and blue lines divide each 12-tone chromatic octave into three regular, predictable groups of four successive pitches:
  - **Black C line:** C, C+, D, D+.
  - **Red E line:** E, F, F+, G.
  - **Blue G+ line:** G+, A, A+, B.
- Each colored landmark line begins its four-pitch group; after the blue group, the pattern repeats at the next octave's black C line.
- The default tenor staff range is **C3 through G+4**, inclusive. Middle C is C4; G+4 is the next chromatic pitch above G4. Octave numbers here identify the range endpoints; exact guide-label formatting remains to be specified.
- The staff range can vary for different voices. Other voice defaults have not yet been specified.

### Pitch naming — confirmed

- ACN does not use the terms or symbols "sharp" or "flat" for pitch names.
- A `+` after a whole-letter pitch name denotes the next chromatic pitch above it. For example, `A+` is the next pitch after `A`.
- When the next chromatic pitch already has a whole-letter name, use that name. There is no `E+`, because `F` immediately follows `E`; likewise, `C` follows `B` without a `B+` name.
- The repeating ascending pitch-name sequence is **C, C+, D, D+, E, F, F+, G, G+, A, A+, B**, then C in the next octave.
- These names identify dedicated positions on the staff; `+` is part of the pitch name, not an accidental applied to a note.

### Note guide placement — confirmed

- The note guide is the gray block at the left end of a staff, showing the pitch names at their corresponding vertical positions.
- The first system (staff line) of each facing-page pair always includes the note guide.
- The first system of each standalone page always includes the note guide.
- These rules establish required appearances; whether a guide may also appear on later systems has not yet been specified.

### Reference examples

- PDF page 2, first system: the left-hand pitch legend accompanies the tenor staff.
- PDF page 4: the tenor legend is repeated, and the comparison with traditional clefs shows a broader pitch region.

### To specify

1. How are line and space positions aligned with the centers of capsules and beat dots?
2. What is the physical spacing between adjacent semitone positions?
3. What exact color values should be used for the black, red, blue, and gray staff lines?
4. What thickness should the staff lines have?
5. Are staff-line colors and thicknesses fixed or configurable?
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
- In a facing pair, the **flat edges face one another**.
- The reference score uses whole beats and half beats. Rules for other beat subdivisions have not yet been specified.
- Dot shape expresses duration; the established black/white distinction expresses singing versus rest.

The pairing rule, treatment of unpaired half dots, and treatment of pairs spanning a pitch change remain unresolved.

### Time-signature display — confirmed

- ACN uses an example capsule instead of a numeric time signature.
- The example capsule appears below the gray note guide and shows the number of beats per measure.
- Reference example: PDF page 2, beneath the note guide for the first system.

Full dots represent whole beats using the transcriber's chosen beat unit. The remaining details of the example capsule and the treatment of meter changes remain to be specified.

### Optional beat-count labels — confirmed

- The composer, arranger, or transcriber may optionally place beat numbers above individual beats in sequences that are hard to count.
- The numbers appear outside and above the capsules, aligned with the beats they identify.
- Reference example: PDF page 2, measure 29. The `3` and `7` are beat-count labels, not tuplet indications.

### Grouping long rest sequences — confirmed for the current example

- In a long sequence of rest beats within an 8-beat measure, a vertical white line breaks the capsule between beats 4 and 5.
- For measures with more beats, the current rule places a vertical white divider between successive groups of four beats in a long rest sequence.
- Reference example: PDF page 2, measure 29.
- **Pending revision:** This grouping rule must be revisited for scores "in 3" rather than "in 4." Do not assume groups of four apply to every meter.

### To specify

1. How is the transcriber's chosen beat unit recorded, and may it change within a score?
2. How are full and half dots spaced, and does their spacing change with rhythmic context?
3. How are durations combining whole and half beats represented?
4. How are source-score ties and repeated notes translated into sustaining capsules and break indicators?
5. How are syncopations represented?
6. How are tuplets represented?
7. What are the exact alignment and vertical offset for optional beat-count labels?
8. Does a break indicator imply any specific interruption duration, or only a new articulation?
9. When do adjacent gray shapes touch, overlap, or remain separated?
10. How are pickup measures and incomplete measures handled?
11. What grouping or other details, beyond the beat dots, are required in the example time-signature capsule?
12. Is the time-signature capsule repeated whenever the note guide appears, and how are meter changes displayed?
13. Which half beats are paired, how are unpaired half dots oriented, and how are pairs spanning a pitch change handled? These questions are explicitly unresolved.
14. How are beat subdivisions other than halves represented?
15. How should rest grouping work for scores "in 3" and other meters?
16. If a rest sequence starts partway through a measure, are its dividers aligned to the measure's beat groups or counted from the start of the rest sequence?
17. What width and height should the white capsule dividers have?

---

## 5. Lyrics

The reference notation integrates lyrics tightly with the sung events.

### Confirmed

- Lyrics appear close below their corresponding pitch capsules.
- Lyrics have white backgrounds for legibility; staff lines do not show through the lyric backgrounds.
- Lyrics generally share a common vertical baseline within a measure.
- The lyric baseline may change within a measure when the pitch changes substantially, keeping lyrics close below the corresponding capsules. A single baseline throughout a measure is not mandatory.

### Reference examples

- Handel reference PDF, page 2, measure 31: the rising pitch capsules have lyric fragments at different heights within the measure.
- Handel reference PDF, page 4, measure 72 (under `Adagio`): the lyric placement shifts down for `Lord` beneath the lower capsule.

### Observed

- Hyphens and extended syllables are represented in a way that retains normal lyric readability.
- Melismatic passages appear to allow a lyric syllable to span multiple musical events.

### To specify

1. Exact anchoring of a lyric syllable to its note/event.
2. Exact gap below capsules, criteria for sharing a baseline, and the pitch-change threshold or other rule for shifting the baseline within a measure.
3. White-background padding and collision-avoidance rules when pitches descend into lyric space.
4. Hyphen rules for multi-syllable words.
5. Melisma/extension rules.
6. Rules for elision, apostrophes, punctuation, and repeated words.
7. Whether the renderer may alter horizontal spacing to protect lyric readability.

---

## 6. Measures and systems

### Observed

- Vertical measure boundaries are retained.
- Measure numbers are displayed.
- The score wraps into systems across the page.

### Confirmed

- A measure number always appears above the first measure of each system (staff line).
- Measures may vary in width according to the density of beats and lyrics they contain.
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

- Textual dynamic markings and other text markings, including tempo and expression text, appear **above the top line of the staff**. Hairpin placement is unresolved, as noted below.
- They retain the styling used in traditional music notation.
- Lyrics follow the separate placement rules in section 5.

### Hairpin dynamics — unresolved; future experimentation

- Placement of hairpin dynamic markings has not been decided.
- The two candidate positions are **above the staff** and **directly above the capsules**.
- Future experimentation will determine the placement rule. Neither candidate is currently normative.

### Rehearsal markers — confirmed

- Rehearsal markers from the score used by the conductor may optionally be included in the ACN part.
- They appear as **large letters** or **circled numbers**, matching the rehearsal identifiers in the conductor's score.
- They are placed **above and near the beginning of the corresponding measures**.

### Working principle

Do not redesign conventional markings that are already accessible and unambiguous unless ACN has a specific reason to do so.

### To specify

- exact horizontal anchoring and vertical offset above the staff for dynamics;
- exact size, alignment, and vertical offset for rehearsal markers;
- exact horizontal anchoring and vertical offset above the staff for tempo and expression text;
- precedence/collision rules among these labels;
- which native MuseScore text/direction categories should be imported.

---

## 8. Page furniture and metadata

The reference PDF includes title/composer/part information, copyright/licensing text, and an explanatory pitch-grid comparison.

The first renderer should distinguish score-semantic output from optional publication furniture.

### To decide

- Which title/composer/part fields are imported automatically.
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
