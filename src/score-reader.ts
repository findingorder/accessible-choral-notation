import { addTime, compareTime, equalTime, rational, type AcnScore, type Rational } from './score.js';

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid ACN score: ${message}`);
}
function fraction(value: unknown, label: string, positive = false): asserts value is Rational {
  const r = value as Rational | null;
  requireValue(r && Number.isSafeInteger(r.numerator) && Number.isSafeInteger(r.denominator) && r.denominator > 0 && (positive ? r.numerator > 0 : r.numerator >= 0), label);
}
/** Validate saved score data before any layout or output writes. */
export function parseScore(value: unknown): AcnScore {
  const score = value as AcnScore | null;
  requireValue(score && score.formatVersion === '0.1', 'expected formatVersion 0.1');
  requireValue(score.metadata && typeof score.metadata.copyright === 'string', 'metadata must contain a copyright string');
  requireValue(!('title' in score.metadata) && !('composer' in score.metadata), 'move metadata.title and metadata.composer to centerTitle and rightTitle in the companion .acn-layout.json file');
  requireValue(score.part && typeof score.part.name === 'string' && Array.isArray(score.part.measures) && score.part.measures.length > 0, 'part must have measures');
  requireValue(score.transcription, 'missing transcription settings');
  fraction(score.transcription.beatUnit, 'choose a positive transcription.beatUnit before rendering', true);
  requireValue(score.transcription.staffRange?.low === 48 && score.transcription.staffRange.high === 68, 'this first renderer supports the C3–G+4 tenor range');
  const ids = new Set<string>();
  let previousNumber = 0;
  const measureNumbers = new Set<number>();
  for (const m of score.part.measures) {
    requireValue(m && Number.isSafeInteger(m.number) && m.number > previousNumber, 'measure numbers must increase');
    requireValue(m.repeatOf === undefined || (Number.isSafeInteger(m.repeatOf) && measureNumbers.has(m.repeatOf)), `measure ${m.number} repeatOf must identify an earlier measure`);
    measureNumbers.add(m.number);
    previousNumber = m.number;
    requireValue(m.sourceNumber === undefined || (Number.isSafeInteger(m.sourceNumber) && m.sourceNumber > 0), `measure ${m.number} source number`);
    fraction(m.duration, `measure ${m.number} duration`, true);
    requireValue(m.meter && Number.isSafeInteger(m.meter.numerator) && m.meter.numerator > 0 && Number.isSafeInteger(m.meter.denominator) && m.meter.denominator > 0, `measure ${m.number} meter`);
    requireValue(Array.isArray(m.events) && m.events.length > 0, `measure ${m.number} events`);
    let cursor = rational(0);
    for (const e of m.events) {
      requireValue(e && ['note', 'rest'].includes(e.kind) && typeof e.id === 'string' && e.id && !ids.has(e.id), `measure ${m.number} event identity`);
      ids.add(e.id);
      fraction(e.onset, `event ${e.id} onset`);
      fraction(e.duration, `event ${e.id} duration`, true);
      requireValue(equalTime(e.onset, cursor), `event ${e.id} overlaps or leaves a gap`);
      cursor = addTime(cursor, e.duration);
      if (e.kind === 'note') requireValue(e.pitch && Number.isSafeInteger(e.pitch.midi) && e.pitch.midi >= 48 && e.pitch.midi <= 68, `event ${e.id} pitch is outside C3–G+4`);
      requireValue(Array.isArray(e.lyrics) && e.lyrics.length <= 1, `event ${e.id}: only one lyric verse is supported`);
      for (const lyric of e.lyrics) requireValue(lyric && typeof lyric.text === 'string' && !/[\r\n]/.test(lyric.text) && lyric.verse === 1 && ['single', 'begin', 'middle', 'end'].includes(lyric.syllabic), `event ${e.id} lyric`);
      if (e.kind === 'rest') requireValue(e.lyrics.length === 0, `rest ${e.id} cannot carry lyrics`);
      for (const lyric of e.lyrics) requireValue(Object.keys(lyric).every(key => ['verse', 'text', 'syllabic'].includes(key)), `event ${e.id}: lyrics contain only verse, text, and syllabic; presentation overrides belong in a score-wide .acn-layout.json file`);
    }
    requireValue(equalTime(cursor, m.duration), `measure ${m.number} events do not fill its duration`);
    requireValue(typeof m.startRepeat === 'boolean' && ['normal', 'end', 'double'].includes(m.endBarline), `measure ${m.number} barline`);
    requireValue(m.repeatCount === undefined || m.repeatCount === 2, 'only two-pass repeats are currently rendered');
    requireValue(Array.isArray(m.directions), `measure ${m.number} directions`);
    for (const d of m.directions) {
      requireValue(d && ['rehearsal', 'tempo', 'expression', 'dynamic'].includes(d.kind) && typeof d.text === 'string', `measure ${m.number} direction`);
      fraction(d.onset, 'direction onset');
      requireValue(compareTime(d.onset, m.duration) <= 0, 'direction outside its measure');
    }
  }
  requireValue(Array.isArray(score.part.spans), 'missing spans');
  const events = score.part.measures.flatMap(m => m.events);
  for (const span of score.part.spans) {
    requireValue(span && ['tie', 'slur'].includes(span.kind) && ids.has(span.from) && ids.has(span.to), 'invalid span endpoint');
    const from = events.findIndex(e => e.id === span.from), to = events.findIndex(e => e.id === span.to);
    requireValue(from < to && events[from].kind === 'note' && events[to].kind === 'note', 'span must connect notes in forward order');
    if (span.kind === 'tie') requireValue(to === from + 1 && events[from].pitch!.midi === events[to].pitch!.midi, 'tie must connect consecutive notes at the same pitch');
  }
  requireValue(Array.isArray(score.repeatEndings), 'missing repeatEndings');
  for (const ending of score.repeatEndings) {
    requireValue(ending && Array.isArray(ending.numbers) && ending.numbers.every(n => Number.isInteger(n) && n > 0) && typeof ending.text === 'string', 'invalid repeat ending');
    for (const position of [ending.from, ending.to]) {
      requireValue(position, 'repeat ending position');
      const measure = score.part.measures.find(m => m.number === position.measure);
      requireValue(measure, 'repeat ending measure does not exist');
      fraction(position.onset, 'repeat ending onset');
      requireValue(compareTime(position.onset, measure.duration) <= 0, 'repeat ending outside measure');
    }
    requireValue(ending.from.measure < ending.to.measure || (ending.from.measure === ending.to.measure && compareTime(ending.from.onset, ending.to.onset) < 0), 'repeat ending must move forward');
  }
  return score;
}
