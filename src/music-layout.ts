import { noteColor } from './pitch.js';
import { weightedFamily } from './font-families.js';
import { layoutBlankPage, type PageScene, type Shape, type SystemPlan } from './layout.js';
import type { LayoutSettings } from './settings.js';
import type { AcnScore, Rational, ScoreEvent, ScoreMeasure, ScorePosition } from './score.js';
import { parseScore } from './score-reader.js';
import type { MeasureText } from './text-metrics.js';

type Edge = 'left' | 'right' | 'up';
interface Dot { beat: number; half: boolean; edge?: Edge; x: number }
interface EventLayout {
  event: ScoreEvent; measure: MeasureLayout; pitch: number; group: number;
  gap: number; width: number; trailingSpace: number; x: number; dots: Dot[];
}
interface MeasureLayout {
  source: ScoreMeasure; events: EventLayout[]; minWidth: number; x: number; width: number;
  system: SystemLayout; lyricOffset: number; startPadding: number; endPadding: number; contentWidth: number;
}
interface SystemLayout { page: number; row: number; top: number; left: number; right: number; measures: MeasureLayout[] }
interface LyricSpan { first: EventLayout; events: EventLayout[]; lyricOffset: number }

const value = (r: Rational): number => r.numerator / r.denominator;
const line = (x1: number, y1: number, x2: number, y2: number, color = '#000000', width = 1, role?: string): Shape =>
  ({ kind: 'line', x1, y1, x2, y2, color, width, role });
const circle = (x: number, y: number, radius: number, fill: string, role: string, eventId?: string): Shape =>
  ({ kind: 'ellipse', x, y, rx: radius, ry: radius, fill, stroke: 'none', role, eventId });

/** Round true ends; square ends indicate a capsule continuing on another system. */
function capsule(left: number, right: number, y: number, height: number, openLeft: boolean, openRight: boolean): string {
  const r = height / 2, top = y - r, bottom = y + r;
  return `M ${left + (openLeft ? 0 : r)} ${top} H ${right - (openRight ? 0 : r)} ` +
    (openRight ? `V ${bottom} ` : `A ${r} ${r} 0 0 1 ${right - r} ${bottom} `) +
    `H ${left + (openLeft ? 0 : r)} ` + (openLeft ? `V ${top} ` : `A ${r} ${r} 0 0 1 ${left + r} ${top} `) + 'Z';
}
function halfDot(x: number, y: number, r: number, edge: Edge): string {
  if (edge === 'up') return `M ${x - r} ${y} A ${r} ${r} 0 0 0 ${x + r} ${y} Z`;
  return `M ${x} ${y - r} A ${r} ${r} 0 0 ${edge === 'left' ? 1 : 0} ${x} ${y + r} Z`;
}

/** First monophonic tenor renderer. Heuristics are documented separately from notation rules. */
export function layoutMusic(input: AcnScore, p: LayoutSettings, measureText: MeasureText): PageScene[] {
  const score = parseScore(input);
  const beatUnit = value(score.transcription.beatUnit!);
  const beats = (time: Rational): number => value(time) / beatUnit;
  const meter = score.part.measures[0].meter;
  const beatsPerMeasure = meter.numerator / meter.denominator / beatUnit;
  if (!Number.isInteger(beatsPerMeasure) || beatsPerMeasure < 1 || beatsPerMeasure > 16) throw new Error('The beat example currently requires 1–16 whole ACN beats per measure.');
  if (score.part.measures.some(m => m.meter.numerator !== meter.numerator || m.meter.denominator !== meter.denominator)) throw new Error('Meter changes are not yet supported by music rendering.');
  const staffHeight = 20 * p.semitoneStep;
  const capsuleInset = Math.max(p.capsuleHeight / 2, p.dotRadius + p.capsuleEndPadding);
  const capsuleFill = p.noteColorMode === 'pitch-based' ? '#d9d9d9' : '#bfbfbf';
  const wordDividerColor = p.noteColorMode === 'pitch-based' ? '#999999' : '#666666';
  const breathSize = 3 * p.capsuleHeight, breathGap = 4;
  const breathWidth = measureText(',', breathSize, p.serifFont);
  const breathSpace = breathWidth + 2 * breathGap;
  if (p.systems > 1 && p.systemStep < staffHeight + 36) throw new Error('Music needs more space between systems for lyrics and markings. Increase systemStep or reduce systems/semitoneStep.');
  const flat: EventLayout[] = [];
  const measures = score.part.measures.map(source => {
    const m = { source, events: [], minWidth: 0, x: 0, width: 0, lyricOffset: 0 } as unknown as MeasureLayout;
    m.events = source.events.map(event => {
      const duration = beats(event.duration), onset = beats(event.onset);
      if (!Number.isInteger(duration * 2) || !Number.isInteger(onset * 2)) throw new Error(`Event ${event.id}: only whole and half ACN beats can currently be rendered. Choose a smaller beat unit when importing.`);
      const dots: Dot[] = [];
      for (let n = 0; n < Math.floor(duration); n++) dots.push({ beat: onset + n, half: false, x: 0 });
      if (duration % 1) dots.push({ beat: onset + Math.floor(duration), half: true, x: 0 });
      const e: EventLayout = { event, measure: m, pitch: event.pitch?.midi ?? 0, group: 0, gap: 0, width: 0, trailingSpace: 0, x: 0, dots };
      flat.push(e);
      return e;
    });
    return m;
  });
  const firstNote = flat.find(e => e.event.kind === 'note');
  if (!firstNote) throw new Error('An all-rest score needs an explicit rest-placement rule; this renderer requires a sung note.');
  // Breaths and repeat boundaries terminate capsules; ordinary barlines do not.
  const barriers = flat.map((e, i) => i === 0 || !!flat[i - 1].event.breathAfter || (e.measure !== flat[i - 1].measure &&
    (e.measure.source.startRepeat || flat[i - 1].measure.source.repeatCount !== undefined ||
     score.repeatEndings.some(v => v.from.measure === e.measure.source.number))));
  const internalRest = new Set<EventLayout>();
  let lastPitch = firstNote.pitch;
  for (let i = 0; i < flat.length;) {
    if (flat[i].event.kind === 'note') { lastPitch = flat[i].pitch; i++; continue; }
    let end = i;
    while (end < flat.length && flat[end].event.kind === 'rest' && (end === i || !barriers[end])) end++;
    const internal = i > 0 && end < flat.length && !barriers[i] && !barriers[end] && flat[i - 1].event.kind === 'note' && flat[end].pitch === lastPitch;
    for (let j = i; j < end; j++) { flat[j].pitch = lastPitch; if (internal) internalRest.add(flat[j]); }
    i = end;
  }
  let group = -1;
  const groups: EventLayout[][] = [];
  for (const [i, e] of flat.entries()) {
    const previous = flat[i - 1];
    const joined = previous && !barriers[i] && previous.pitch === e.pitch &&
      ((previous.event.kind === e.event.kind) || internalRest.has(previous) || internalRest.has(e));
    if (!joined) { group++; groups.push([]); }
    e.group = group;
    groups[group].push(e);
    const lyric = e.event.lyrics[0];
    if (joined && previous.event.kind === 'note' && lyric) {
      // A barline already separates words across measures; only internal
      // word dividers need their additional clearance.
      e.gap = ['middle', 'end'].includes(lyric.syllabic) ? p.beatSpacing
        : e.measure === previous.measure ? 2 * p.wordDividerPadding : 0;
    }
    const rhythmicWidth = Math.max(beats(e.event.duration) * p.beatSpacing, e.dots.length * (p.dotRadius * 2 + 6));
    e.width = Math.max(rhythmicWidth, lyric ? measureText(lyric.text, p.lyricSize, p.sansSerifFont, p.lyricFontWeight) + 12 : 0);
  }
  const lyricInset = (e: EventLayout): number => e.event.lyrics[0] ? measureText(e.event.lyrics[0].text, p.lyricSize, p.sansSerifFont, p.lyricFontWeight) / 2 : 0;
  const dotStep = (e: EventLayout): number => {
    const step = (e.width - e.trailingSpace) / Math.max(beats(e.event.duration), 1);
    // Centered two-dot syllables keep a compact pair; extra lyric width goes
    // between syllables rather than stretching the dots within the pair.
    return e.dots.length === 2
      ? Math.min(step, p.beatSpacing) : step;
  };
  // Center each lyric under its first dot and reserve room for neighboring text.
  for (let i = 0; i < flat.length - 1; i++) {
    const e = flat[i], next = flat[i + 1], lyric = e.event.lyrics[0];
    if (!lyric || !next.event.lyrics.length) continue;
    if (e.group === next.group && e.measure === next.measure &&
        e.dots.length !== 2 && next.dots.length !== 2 &&
        ['single', 'begin'].includes(next.event.lyrics[0].syllabic)) {
      // Centered words need half of each text width between their anchor dots.
      // Count the divider clearance once, rather than adding it to a full-word cell.
      const rhythmicWidth = Math.max(beats(e.event.duration) * p.beatSpacing, e.dots.length * (p.dotRadius * 2 + 6));
      e.width = Math.max(rhythmicWidth, lyricInset(e) + lyricInset(next) + 12 - next.gap);
      continue;
    }
    e.width = Math.max(e.width, measureText(lyric.text, p.lyricSize, p.sansSerifFont, p.lyricFontWeight) + 12 + lyricInset(next) - lyricInset(e));
  }
  // Reserve room between distinct capsules, including adjacent half beats.
  // Extra end padding must not spread into the neighboring capsule.
  for (let i = 0; i < flat.length - 1; i++) {
    const e = flat[i], next = flat[i + 1];
    if (e.group === next.group || e.measure !== next.measure) continue;
    const step = dotStep(e);
    const trailing = e.width - (e.dots.length - 1) * step;
    e.trailingSpace = Math.max(0, 2 * capsuleInset + 4 + (e.event.breathAfter ? breathSpace : 0) - trailing - next.gap);
    e.width += e.trailingSpace;
  }
  for (let i = 0; i < flat.length; i++) {
    const e = flat[i];
    for (let j = 0; j < e.dots.length; j++) {
      const dot = e.dots[j];
      if (!dot.half || dot.edge) continue;
      const nextEvent = flat[i + 1];
      const next = e.dots[j + 1] ?? (!barriers[i + 1] ? nextEvent?.dots[0] : undefined);
      if (next?.half) { dot.edge = 'right'; next.edge = 'left'; }
      else {
        const g = groups[e.group], atStart = g[0] === e && j === 0, atEnd = g.at(-1) === e && j === e.dots.length - 1;
        dot.edge = atStart && atEnd ? 'up' : atStart ? 'left' : atEnd ? 'right' : 'up';
      }
    }
  }
  const lyrics: LyricSpan[] = [];
  for (const [i, e] of flat.entries()) {
    if (!e.event.lyrics.length) continue;
    const events = [e];
    for (let j = i + 1; j < flat.length && !barriers[j] && flat[j].event.kind === 'note' && !flat[j].event.lyrics.length; j++) events.push(flat[j]);
    lyrics.push({ first: e, events, lyricOffset: 0 });
  }
  // Start below each capsule with the default one-pitch-space clearance,
  // then align sustained syllables and the syllables of each word.
  const lyricPosition = (e: EventLayout, gap = p.lyricGap): number =>
    (68 - e.pitch) * p.semitoneStep + p.capsuleHeight / 2 + gap + p.lyricSize / 2;
  // Keep every syllable of a word (and its hyphens/extensions) on one baseline.
  // Store this per lyric so lowering a word need not lower unrelated neighbors.
  const words: LyricSpan[][] = [];
  for (const [i, span] of lyrics.entries()) {
    span.lyricOffset = Math.max(...span.events.map(e => lyricPosition(e)));
    const previous = lyrics[i - 1];
    const joinsWord = previous && ['begin', 'middle'].includes(previous.first.event.lyrics[0].syllabic) &&
      ['middle', 'end'].includes(span.first.event.lyrics[0].syllabic) &&
      !barriers.slice(flat.indexOf(previous.events.at(-1)!) + 1, flat.indexOf(span.first) + 1).some(Boolean);
    if (!joinsWord) words.push([]);
    words.at(-1)!.push(span);
  }
  for (const word of words) {
    const offset = Math.max(...word.map(span => span.lyricOffset));
    for (const span of word) span.lyricOffset = offset;
  }
  // Derive pagination bounds from the final word positions, not vice versa.
  for (const span of lyrics) for (const e of span.events) e.measure.lyricOffset = Math.max(e.measure.lyricOffset, span.lyricOffset);
  const pad = Math.max(14, capsuleInset + 4);
  for (const m of measures) {
    const first = m.events[0], last = m.events.at(-1)!;
    const startsCapsule = groups[first.group][0] === first;
    m.startPadding = Math.max(startsCapsule ? Math.max(pad, capsuleInset + p.measureStartPadding) : pad, lyricInset(first) + 2);
    const endsCapsule = groups[last.group].at(-1) === last;
    m.endPadding = Math.max(endsCapsule ? capsuleInset + p.measureEndPadding : pad, lyricInset(last) + 2);
    if (last.event.breathAfter) m.endPadding += breathSpace;
    // Measure end clearance from the innermost stroke of a compound barline,
    // not the outer staff edge; the bar must not consume capsule padding.
    const endBarInset = m.source.repeatCount ? 5 + p.barLineWidth / 2
      : m.source.endBarline === 'end' ? 12.5 * p.barLineWidth
      : m.source.endBarline === 'double' ? 4 + p.barLineWidth / 2 : 0;
    m.endPadding += endBarInset;
    // Stop the content at its final dot, not at the unused tail of the event cell.
    const lastStep = dotStep(last);
    m.contentWidth = m.events.reduce((sum, e) => sum + e.width + e.gap, 0) - last.width + (last.dots.length - 1) * lastStep;
    m.minWidth = m.startPadding + m.contentWidth + m.endPadding;
  }
  const measureLimit = p.musicMeasuresPerSystem === 'auto' ? Infinity : p.musicMeasuresPerSystem;
  const systems: SystemLayout[] = [];
  let page = 1, row = 0, cursor = 0;
  const hasTitles = [p.leftTitle, p.centerTitle, p.rightTitle, p.centerSubtitle].some(Boolean);
  while (cursor < measures.length) {
    const top = (page === 1 && hasTitles ? p.firstPageTop : p.top) + row * p.systemStep;
    const hasIndex = row === 0 && (p.pitchIndexPages === 'every' || (p.pitchIndexPages === 'odd' ? page % 2 === 1 : page % 2 === 0));
    const left = p.margin + (hasIndex ? p.guideWidth : 0), right = p.width - p.margin;
    const system: SystemLayout = { page, row, top, left, right, measures: [] };
    let minimum = 0;
    while (cursor < measures.length && system.measures.length < measureLimit && minimum + measures[cursor].minWidth <= right - left) {
      const m = measures[cursor++];
      minimum += m.minWidth; system.measures.push(m);
    }
    if (!system.measures.length) throw new Error(`Measure ${measures[cursor].source.number} does not fit. Increase page width or reduce lyricSize/beatSpacing.`);
    const bottom = top + Math.max(staffHeight + (hasIndex ? 28 : 7), ...system.measures.map(m => m.lyricOffset + p.lyricSize / 2 + 3));
    if (bottom > p.height - p.margin) {
      cursor -= system.measures.length;
      if (row === 0) throw new Error('Music does not fit vertically within the page margins.');
      page++; row = 0; continue;
    }
    // Minimum widths already pay for lyrics, capsules, and barlines. Share
    // the remaining space by duration so word-heavy measures do not also
    // monopolize the stretch that gives sustained notes room to breathe.
    const extra = right - left - minimum;
    const duration = system.measures.reduce((sum, m) => sum + beats(m.source.duration), 0);
    let x = left;
    for (const m of system.measures) {
      m.x = x; m.width = m.minWidth + extra * beats(m.source.duration) / duration; m.system = system;
      const firstBeat = m.events[0].dots[0].beat;
      const beatSpan = m.events.at(-1)!.dots.at(-1)!.beat - firstBeat;
      const stretch = beatSpan > 0 ? (m.width - m.minWidth) / beatSpan : 0;
      let eventX = x + m.startPadding + (beatSpan === 0 ? (m.width - m.minWidth) / 2 : 0);
      for (const e of m.events) {
        // Stretch musical intervals, not the fixed room reserved for words,
        // capsule ends, and syllable separators.
        eventX += e.gap; e.x = eventX + stretch * (e.dots[0].beat - firstBeat);
        const step = dotStep(e);
        for (const [j, dot] of e.dots.entries()) dot.x = eventX + j * step + stretch * (dot.beat - firstBeat);
        eventX += e.width;
      }
      x += m.width;
    }
    // Tighten two-dot capsules crossing an ordinary barline after justification.
    // Move only the pair inward, preserving room to neighboring capsules and
    // enough space for the lyrics and any syllable-separating hyphen.
    for (let i = 1; i < system.measures.length; i++) {
      const previous = system.measures[i - 1], current = system.measures[i];
      const last = previous.events.at(-1)!, first = current.events[0];
      if (last.group !== first.group || previous.source.endBarline !== 'normal') continue;
      const g = groups[last.group];
      const twoDots = g.length === 2 && g.every(e => e.event.kind === 'note' && e.dots.length === 1);
      const sameWord = ['begin', 'middle'].includes(last.event.lyrics[0]?.syllabic) &&
        ['middle', 'end'].includes(first.event.lyrics[0]?.syllabic);
      if (twoDots) {
        const hyphenSpace = sameWord ? measureText('-', p.lyricSize, p.sansSerifFont, p.lyricFontWeight) + 16 : 12;
        const textSpace = last.event.lyrics.length && first.event.lyrics.length
          ? lyricInset(last) + lyricInset(first) + hyphenSpace : 0;
        const spacing = Math.max(p.beatSpacing + first.gap, 2 * p.dotRadius + 6, textSpace);
        const shift = Math.max(0, (first.dots[0].x - last.dots[0].x - spacing) / 2);
        last.x += shift; last.dots[0].x += shift;
        first.x -= shift; first.dots[0].x -= shift;
      }
      if (!twoDots && !sameWord) continue;
      // Transfer measure space so the barline bisects the final dot gap.
      const boundary = (last.dots.at(-1)!.x + first.dots[0].x) / 2;
      const right = current.x + current.width;
      previous.width = boundary - previous.x;
      current.x = boundary;
      current.width = right - boundary;
    }
    systems.push(system);
    row++;
    if (row === p.systems) { page++; row = 0; }
  }
  const pageCount = systems.at(-1)!.page;
  const pages: PageScene[] = [];
  for (let n = 1; n <= pageCount; n++) {
    const onPage = systems.filter(s => s.page === n);
    const plans: SystemPlan[] = onPage.map(s => ({ measures: s.measures.map(m => ({ number: m.source.sourceNumber ?? m.source.number, width: m.width })) }));
    const scene = layoutBlankPage({ ...p, pages: pageCount }, n, plans);
    scene.title = [p.centerTitle, p.centerSubtitle].filter(Boolean).join(' — ') || 'Accessible Choral Notation';
    const pageFirst = onPage[0].measures[0].source, pageLast = onPage.at(-1)!.measures.at(-1)!.source;
    scene.description = `Accessible Choral Notation, ${score.part.name}, measures ${pageFirst.sourceNumber ?? pageFirst.number}–${pageLast.sourceNumber ?? pageLast.number}. ${p.noteColorMode === 'pitch-based' ? 'Pitch-colored' : 'Black'} dots are sung; white dots are rests. Full dots are whole beats and semicircles half beats. ${beatsPerMeasure} ACN beats per measure. Pitch increases vertically from C3 to G+4.`;
    // Bars are painted after the capsules so measure boundaries remain visible.
    scene.shapes = scene.shapes.filter(s => s.role !== 'barline');
    pages.push(scene);
  }
  const shapes = (s: SystemLayout): Shape[] => pages[s.page - 1].shapes;
  const y = (e: EventLayout): number => e.measure.system.top + (68 - e.pitch) * p.semitoneStep;
  for (const g of groups) {
    const segments = new Map<SystemLayout, EventLayout[]>();
    for (const e of g) { const s = e.measure.system; if (!segments.has(s)) segments.set(s, []); segments.get(s)!.push(e); }
    for (const [system, events] of segments) {
      const first = events[0], last = events.at(-1)!, openLeft = first !== g[0], openRight = last !== g.at(-1);
      const left = openLeft ? system.left : first.dots[0].x - capsuleInset;
      const right = openRight ? system.right : last.dots.at(-1)!.x + capsuleInset;
      shapes(system).push({ kind: 'path', d: capsule(left, right, y(first), p.capsuleHeight, openLeft, openRight), fill: capsuleFill, role: `capsule${openLeft ? '-continued-left' : ''}${openRight ? '-continued-right' : ''}`, eventId: first.event.id });
      const held = events.find(e => e.event.fermata);
      if (held) {
        // Center on the actual capsule segment, including continued ends.
        // A filled arch avoids dependence on music-font glyph availability.
        const x = (left + right) / 2, radius = p.capsuleHeight;
        const bottom = y(first) - p.capsuleHeight / 2 - 7;
        const target = shapes(system), eventId = held.event.id;
        target.push({ kind: 'rect', x: x - radius - 2, y: bottom - radius - 2,
          width: 2 * radius + 4, height: radius + 4, fill: '#ffffff',
          opacity: p.lyricBackgroundOpacity, role: 'fermata-background', eventId });
        target.push({ kind: 'path', d: `M ${x - radius} ${bottom} A ${radius} ${radius} 0 0 1 ${x + radius} ${bottom} L ${x + radius * 0.93} ${bottom} A ${radius * 0.93} ${radius * 0.76} 0 0 0 ${x - radius * 0.93} ${bottom} Z`,
          fill: '#000000', role: 'fermata-arch', eventId });
        target.push(circle(x, bottom - radius * 0.2, radius * 0.2, '#000000', 'fermata-dot', eventId));
      }
    }
    for (let i = 1; i < g.length; i++) {
      const e = g[i], previous = g[i - 1], lyric = e.event.lyrics[0];
      if (!lyric || previous.event.kind !== 'note' || e.measure !== previous.measure || !['single', 'begin'].includes(lyric.syllabic)) continue;
      const x = (e.dots[0].x + previous.dots.at(-1)!.x) / 2;
      shapes(e.measure.system).push(line(x, y(e) - p.capsuleHeight / 2, x, y(e) + p.capsuleHeight / 2, wordDividerColor, 1.4, 'word-divider'));
    }
  }
  for (const e of flat) {
    const target = shapes(e.measure.system), fill = e.event.kind === 'note' ? noteColor(e.pitch, p.noteColorMode) : '#ffffff';
    for (const dot of e.dots) target.push(dot.half ?
      { kind: 'path', d: halfDot(dot.x, y(e), p.dotRadius, dot.edge!), fill, role: `${e.event.kind === 'note' ? 'sung' : 'rest'}-half-${dot.edge}`, eventId: e.event.id } :
      circle(dot.x, y(e), p.dotRadius, fill, e.event.kind === 'note' ? 'sung-dot' : 'rest-dot', e.event.id));
    if (e.event.breathAfter) {
      target.push({ kind: 'text', text: ',', x: e.dots.at(-1)!.x + capsuleInset + breathGap,
        y: y(e) - breathSize * 0.35, size: breathSize, fontFamily: p.serifFont,
        anchor: 'start', fill: '#000000', role: 'breath-mark', eventId: e.event.id });
    }
  }
  // White rest dividers align to measure beat groups, never to capsule-relative counts.
  if (beatsPerMeasure % 4 === 0) for (const m of measures) {
    const dots = m.events.flatMap(e => e.dots.map(dot => ({ e, dot })));
    for (let i = 1; i < dots.length; i++) {
      const a = dots[i - 1], b = dots[i];
      if (b.dot.beat > 0 && b.dot.beat % 4 === 0 && a.e.event.kind === 'rest' && b.e.event.kind === 'rest' && a.e.group === b.e.group) {
        const x = (a.dot.x + b.dot.x) / 2;
        shapes(m.system).push(line(x, y(b.e) - p.capsuleHeight / 2, x, y(b.e) + p.capsuleHeight / 2, '#ffffff', 1.5, 'rest-divider'));
      }
    }
  }
  const lyricText = (target: Shape[], text: string, x: number, y: number, eventId: string, role: string): void => {
    const width = measureText(text, p.lyricSize, p.sansSerifFont, p.lyricFontWeight);
    target.push({ kind: 'rect', x: x - 2, y: y - p.lyricSize / 2 - 2, width: width + 4, height: p.lyricSize + 4, fill: '#ffffff', opacity: p.lyricBackgroundOpacity, role: 'lyric-background' });
    target.push({ kind: 'text', text, x, y, size: p.lyricSize, fontWeight: p.lyricFontWeight, fontFamily: weightedFamily(p.sansSerifFont, p.lyricFontWeight), anchor: 'start', role, eventId });
  };
  const lyricX = (e: EventLayout): number => {
    const g = groups[e.group];
    // Center each word/syllable's own two-dot group, including groups within
    // a shared capsule and pairs split into multiple source events.
    const pair: Dot[] = [];
    for (let i = g.indexOf(e); i < g.length; i++) {
      const item = g[i];
      if (item.event.kind !== 'note' || item.measure.system !== e.measure.system ||
          (item !== e && item.event.lyrics.length > 0)) break;
      pair.push(...item.dots);
    }
    const center = pair.length === 2 ? (pair[0].x + pair[1].x) / 2 : e.x;
    return center - lyricInset(e);
  };
  for (const span of lyrics) {
    const first = span.first, lyric = first.event.lyrics[0];
    const involved = [...new Set(span.events.map(e => e.measure.system))];
    for (const system of involved) {
      const target = shapes(system), here = span.events.filter(e => e.measure.system === system), starts = here[0] === first;
      const baseline = system.top + span.lyricOffset;
      let start = system.left;
      if (starts) {
        lyricText(target, lyric.text, lyricX(first), baseline, first.event.id, 'lyric');
        start = lyricX(first) + measureText(lyric.text, p.lyricSize, p.sansSerifFont, p.lyricFontWeight);
      }
      const last = here.at(-1)!, index = flat.indexOf(last), next = flat[index + 1];
      const continues = last !== span.events.at(-1);
      const sustained = span.events.reduce((count, e) => count + e.dots.length, 0) > 1;
      const splitWord = !continues && ['begin', 'middle'].includes(lyric.syllabic);
      const end = continues ? system.right : next?.measure.system === system ? (next.event.lyrics.length ? lyricX(next) : next.x) - 10 : Math.min(system.right - 4, last.measure.x + last.measure.width - 8);
      const availableEnd = end - (splitWord ? 12 : 0);
      // When the syllable ends with its capsule, stop at that capsule's edge.
      // Keep an otherwise warranted extension even if this trimming shortens it.
      const underscoreEnd = Math.min(availableEnd,
        !continues && groups[last.group].at(-1) === last ? last.dots.at(-1)!.x + capsuleInset : Infinity);
      // A trailing extension signals continuation onto the next system even
      // when it is shorter than the usual threshold for optional underscores.
      if (sustained && underscoreEnd > start && (continues || availableEnd - start >= p.lyricContinuationMinLength)) {
        target.push({ kind: 'rect', x: start, y: baseline - p.lyricSize / 2 - 2, width: Math.min(system.right, underscoreEnd + 2) - start, height: p.lyricSize + 4, fill: '#ffffff', opacity: p.lyricBackgroundOpacity, role: 'lyric-background' });
        const underscoreY = baseline + p.lyricSize * 0.45;
        target.push({ ...line(start, underscoreY, underscoreEnd, underscoreY, '#202020', 1, 'lyric-continuation'), eventId: first.event.id });
      }
      if (splitWord && end - start > 5) lyricText(target, '-', (sustained ? end - 5 : (start + end - 5) / 2), baseline, first.event.id, 'lyric-hyphen');
    }
  }
  const positionX = (m: MeasureLayout, onset: Rational): number => {
    const time = beats(onset);
    if (time <= 0) return m.x;
    if (time >= beats(m.source.duration)) return m.x + m.width;
    const e = [...m.events].reverse().find(e => beats(e.event.onset) <= time)!;
    const next = m.events[m.events.indexOf(e) + 1];
    return e.x + (time - beats(e.event.onset)) / beats(e.event.duration) * ((next?.x ?? m.x + m.width - m.endPadding) - e.x);
  };
  for (const system of systems) {
    const target = shapes(system), top = system.top, bottom = top + staffHeight;
    const bar = (x: number, width = p.barLineWidth): void => { target.push(line(x, top, x, bottom, '#000000', width, 'barline')); };
    bar(system.left);
    for (const [index, m] of system.measures.entries()) {
      const right = m.x + m.width;
      if (m.source.endBarline !== 'end' || m.source.repeatCount) bar(right);
      if (m.source.startRepeat) {
        bar(m.x + 1, 2.5); bar(m.x + 5);
        for (const offset of [-5, 5]) target.push(circle(m.x + 10, top + staffHeight / 2 + offset, 1.7, '#000000', 'repeat-dot'));
      }
      if (m.source.repeatCount) {
        bar(right - 1, 2.5); bar(right - 5);
        for (const offset of [-5, 5]) target.push(circle(right - 10, top + staffHeight / 2 + offset, 1.7, '#000000', 'repeat-dot'));
      } else if (m.source.endBarline === 'end') {
        const thickWidth = 6 * p.barLineWidth;
        const thickX = right - thickWidth / 2;
        bar(thickX, thickWidth);
        bar(thickX - 9 * p.barLineWidth);
      }
      else if (m.source.endBarline === 'double') bar(right - 4);
      let directionRow = 0;
      for (const d of m.source.directions) {
        if (d.kind === 'dynamic') {
          const x = positionX(m, d.onset) || m.events[0].x;
          const event = [...m.events].reverse().find(e => beats(e.event.onset) <= beats(d.onset)) ?? m.events[0];
          const dynamicX = beats(d.onset) === beats(event.event.onset) ? event.x : x;
          const size = 18, side = Math.max(size + 4, measureText(d.text, size, p.serifFont) + 6), centerY = y(event) - p.capsuleHeight / 2 - side / 2 - 3;
          target.push({ kind: 'rect', x: dynamicX - side / 2, y: centerY - side / 2, width: side, height: side, fill: '#ffffff', role: 'dynamic-background' });
          target.push({ kind: 'text', x: dynamicX, y: centerY, text: d.text, size, fontFamily: p.serifFont, italic: true, role: 'dynamic' });
        } else {
          const rehearsal = d.kind === 'rehearsal';
          const text = rehearsal && m.source.repeatOf !== undefined ? d.text + "'" : d.text;
          target.push({ kind: 'text', x: m.x + (index === 0 ? 36 : 8), y: top - 12 - directionRow++ * 20, text, size: rehearsal ? 20 : 14, fontFamily: p.serifFont, anchor: 'start', italic: !rehearsal, role: d.kind });
        }
      }
    }
    if (system.row === 0 && pages[system.page - 1].hasPitchIndex) {
      const left = p.margin, right = p.margin + p.guideWidth, y = bottom + 20;
      const barGap = 4; // White clearance between the capsule and its end bars.
      const dotSpan = p.guideWidth - 2 * (capsuleInset + barGap);
      if (dotSpan <= 0) throw new Error('Capsule end padding is too large for the pitch-index beat example. Increase guideWidth.');
      const compactSpan = dotSpan * 0.9;
      const step = compactSpan / Math.max(1, beatsPerMeasure - 1);
      target.push({ kind: 'path', d: capsule(left + barGap, right - barGap, y, p.capsuleHeight, false, false), fill: capsuleFill, role: 'beat-example' });
      target.push(line(left, y - 9, left, y + 9), line(right, y - 9, right, y + 9));
      for (let i = 0; i < beatsPerMeasure; i++) {
        const x = beatsPerMeasure === 1 ? (left + right) / 2 : (left + right - compactSpan) / 2 + step * i;
        target.push(circle(x, y, Math.min(p.dotRadius, step / 3), '#000000', 'example-dot'));
      }
    }
  }
  const absoluteTime = (position: ScorePosition): number => {
    let t = 0;
    for (const m of measures) { if (m.source.number === position.measure) return t + beats(position.onset); t += beats(m.source.duration); }
    throw new Error('Missing ending measure');
  };
  const startTimes = new Map<MeasureLayout, number>();
  let t = 0;
  for (const m of measures) { startTimes.set(m, t); t += beats(m.source.duration); }
  for (const ending of score.repeatEndings) {
    const from = absoluteTime(ending.from), to = absoluteTime(ending.to);
    const first = measures.find(m => m.source.number === ending.from.measure)!, last = measures.find(m => m.source.number === ending.to.measure)!;
    for (const system of systems) {
      const sysStart = startTimes.get(system.measures[0])!, sysEnd = startTimes.get(system.measures.at(-1)!)! + beats(system.measures.at(-1)!.source.duration);
      if (from >= sysEnd || to <= sysStart) continue;
      const left = from >= sysStart ? positionX(first, ending.from.onset) : system.left;
      const right = to <= sysEnd ? positionX(last, ending.to.onset) : system.right;
      // A zero-onset endpoint belongs to the preceding system's right edge.
      const endX = to === sysEnd ? system.right : right;
      const y = system.top - 30, target = shapes(system);
      target.push(line(left, y, endX, y, '#000000', 1, 'repeat-ending'));
      if (from >= sysStart) target.push(line(left, y, left, y + 7));
      if (to <= sysEnd) target.push(line(endX, y, endX, y + 7));
      target.push({ kind: 'text', x: left + 5, y: y + 10, text: ending.text || ending.numbers.join(', '), size: 12, anchor: 'start', fontFamily: p.serifFont, role: 'ending-label' });
    }
  }
  return pages;
}
