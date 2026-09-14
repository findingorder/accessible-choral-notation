# Accessible Choral Notation Specification

**Status:** Draft 0.1  
**Purpose:** Capture the notation rules precisely enough that software can render ACN deterministically from semantic score data.

This document intentionally separates **confirmed rules** from **observations and open questions**. A visual pattern in the reference score is not normative until its meaning has been confirmed by the notation's creator.

---

## 1. Scope

The first specification target is a **single monophonic choral part**.

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

### 2.4 Horizontal event graphics — partially specified

The reference score uses gray horizontal shapes containing dots. These visibly communicate temporal extent and/or subdivision.

What is confirmed:

- black dots indicate sung sound;
- white dots indicate rests.

Still to specify:

- the exact semantic role of the gray bar/background;
- how event length maps to bar length;
- how many dots appear for each rhythmic value;
- whether dots correspond to beats, subdivisions, attack opportunities, or another timing unit;
- how tied notes, sustained notes, and melismas alter the graphic.

---

## 3. Pitch grid

The reference score displays a continuous vertical pitch region with horizontal guide lines and labeled pitch references at the left edge of selected systems.

### Confirmed

- Pitch is read directly from vertical placement.
- The pitch grid is intended to avoid traditional clef-dependent decoding.

### To specify

1. What pitch interval does each adjacent horizontal row represent?
2. Are all chromatic pitches represented by dedicated vertical positions, or are accidentals encoded separately?
3. What do the red guide lines signify?
4. What do the blue guide lines signify?
5. What do the black/gray guide lines signify?
6. Which C pitches receive explicit labels such as `C3`, `Middle C`, etc.?
7. When is the pitch legend displayed—every system, selected systems, each page, or according to another rule?
8. Does the pitch map transpose visually for transposing music, or always show sounding/concert pitch?

---

## 4. Rhythm and duration

### Confirmed

- Time progresses left to right.
- Sung and rest events are distinguished by black vs. white dots.

### To specify

1. What is the base time unit represented by a single dot?
2. Is dot density fixed by meter/subdivision, or does it change according to rhythmic context?
3. How are dotted rhythms represented?
4. How are ties represented?
5. How are syncopations represented?
6. How are tuplets represented? The reference score includes a visible `3`; its exact rule needs confirmation.
7. What does the visible numeral `7` in the reference example signify?
8. What is the visual rule for a sustained pitch across several pulses?
9. When do adjacent gray shapes touch, overlap, or remain separated?
10. How are pickup measures and incomplete measures handled?

---

## 5. Lyrics

The reference notation integrates lyrics tightly with the sung events.

### Observed

- Syllables are positioned near/below corresponding pitch events.
- Hyphens and extended syllables are represented in a way that retains normal lyric readability.
- Melismatic passages appear to allow a lyric syllable to span multiple musical events.

### To specify

1. Exact anchoring of a lyric syllable to its note/event.
2. Baseline position relative to pitch rows.
3. Collision-avoidance rules when pitches descend into lyric space.
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

### To specify

1. Whether measure width is proportional to musical duration, content density, or both.
2. Minimum/maximum measure widths.
3. How many measures should appear per system.
4. Whether explicit MuseScore system/page breaks should be honored.
5. Rules for first/last measures of a system.
6. Barline styles required for the first implementation.
7. Whether measure numbers appear at every measure, only system starts, or according to a configurable rule.

---

## 7. Rehearsal, tempo, dynamics, and expression text

The reference score preserves familiar conventional markings including rehearsal letters, dynamics, `rit.`, and `Adagio`.

### Working principle

Do not redesign conventional markings that are already accessible and unambiguous unless ACN has a specific reason to do so.

### To specify

- placement rules for dynamics;
- placement rules for rehearsal marks;
- placement rules for tempo and expression text;
- precedence/collision rules among these labels;
- which MusicXML text/direction categories should be imported.

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
