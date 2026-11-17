import type { ScoreTitles } from './layout-settings.js';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { DOMParser, type Element } from '@xmldom/xmldom';
import { octave, pitchName } from './pitch.js';
import { addTime, compareTime, equalTime, parseTime, rational, type AcnScore, type Rational, type ScoreEvent, type ScoreMeasure, type ScorePosition, type ScoreSpan } from './score.js';

const children = (node: Element, tag?: string): Element[] => Array.from(node.childNodes)
  .filter((n): n is Element => n.nodeType === 1 && (!tag || n.nodeName === tag));
const child = (node: Element, tag: string): Element | undefined => children(node, tag)[0];
const content = (node: Element | undefined): string => node?.textContent?.trim() ?? '';
const text = (node: Element, tag: string): string => content(child(node, tag));
function integer(value: string, context: string): number {
  if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Invalid integer for ${context}: ${value}`);
  return Number(value);
}
function xmlDocument(xml: string): Element {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML document types and entity declarations are not supported.');
  const doc = new DOMParser({ onError: (level, message) => { throw new Error(`Invalid XML (${level}): ${message}`); } }).parseFromString(xml, 'application/xml');
  if (!doc.documentElement) throw new Error('Empty XML document');
  return doc.documentElement;
}
export interface PartChoice { id: string; name: string; staffIds: string[]; voices: number[] }
export interface NativeScore {
  score: Element;
  source: AcnScore['source'];
  parts: PartChoice[];
}
export async function readMuseScore(path: string): Promise<NativeScore> {
  const bytes = await readFile(path);
  let xml: string;
  let archiveEntry: string | undefined;
  if (extname(path).toLowerCase() === '.mscz') {
    // Read only XML members; no archive paths are extracted to disk.
    const files = unzipSync(bytes, { filter: file => file.name === 'META-INF/container.xml' || file.name.endsWith('.mscx') });
    const manifest = files['META-INF/container.xml'];
    if (!manifest) throw new Error('MuseScore archive has no META-INF/container.xml');
    const container = xmlDocument(strFromU8(manifest));
    const rootfiles = child(container, 'rootfiles');
    const candidates = rootfiles ? children(rootfiles, 'rootfile').map(e => e.getAttribute('full-path') ?? '').filter(n => n.endsWith('.mscx')) : [];
    if (candidates.length !== 1) throw new Error('Expected one native .mscx rootfile in the MuseScore archive');
    archiveEntry = candidates[0];
    if (!files[archiveEntry]) throw new Error(`Missing archive score: ${archiveEntry}`);
    xml = strFromU8(files[archiveEntry]);
  } else if (extname(path).toLowerCase() === '.mscx') {
    xml = bytes.toString('utf8');
  } else throw new Error('Input must be a native .mscz or .mscx file.');
  const root = xmlDocument(xml);
  const version = root.getAttribute('version') ?? '';
  if (root.tagName !== 'museScore' || !version.startsWith('3.')) throw new Error(`This importer currently supports MuseScore 3 native XML only (found ${version || root.tagName}).`);
  const score = child(root, 'Score');
  if (!score) throw new Error('MuseScore file has no main score');
  const staffs = children(score, 'Staff');
  const parts = children(score, 'Part').map((part, index) => {
    const staffIds = children(part, 'Staff').map(s => s.getAttribute('id') ?? '');
    const maxVoices = Math.max(1, ...staffs.filter(s => staffIds.includes(s.getAttribute('id') ?? '')).flatMap(s => children(s, 'Measure').map(m => children(m, 'voice').length)));
    return { id: String(index + 1), name: text(part, 'trackName') || `Part ${index + 1}`, staffIds, voices: Array.from({ length: maxVoices }, (_, i) => i + 1) };
  });
  return { score, parts, source: { file: basename(path), sha256: createHash('sha256').update(bytes).digest('hex'), format: 'MuseScore', version, programVersion: text(root, 'programVersion'), ...(archiveEntry ? { archiveEntry } : {}) } };
}
const durations: Record<string, Rational> = {
  longa: rational(4), breve: rational(2), whole: rational(1), half: rational(1, 2), quarter: rational(1, 4), eighth: rational(1, 8),
  '16th': rational(1, 16), '32nd': rational(1, 32), '64th': rational(1, 64), '128th': rational(1, 128),
};
function eventDuration(event: Element, measureDuration: Rational): Rational {
  const type = text(event, 'durationType');
  if (type === 'measure' && event.tagName === 'Rest') return text(event, 'duration') ? parseTime(text(event, 'duration')) : measureDuration;
  const base = durations[type];
  if (!base) throw new Error(`Unsupported durationType: ${type}`);
  const dots = integer(text(event, 'dots') || '0', 'dots');
  if (dots < 0 || dots > 4) throw new Error('Unsupported dot count');
  return rational(base.numerator * (2 ** (dots + 1) - 1), base.denominator * 2 ** dots);
}
function relativePosition(location: Element, here: ScorePosition): ScorePosition {
  for (const field of ['staves', 'voices', 'grace', 'notes']) {
    if (text(location, field) && Number(text(location, field)) !== 0) throw new Error(`Cross-${field} spanners are not yet supported`);
  }
  return { measure: here.measure + integer(text(location, 'measures') || '0', 'spanner measure offset'), onset: addTime(here.onset, parseTime(text(location, 'fractions') || '0/1')) };
}
interface PendingSpan { kind: ScoreSpan['kind']; from: string; to: ScorePosition }
interface Timeline { measures: ScoreMeasure[]; pending: PendingSpan[]; endingStarts: AcnScore['repeatEndings'] }
function parseStaff(staff: Element, voiceNumber: number): Timeline {
  let meter = { numerator: 4, denominator: 4 };
  let keySignature = 0;
  const pending: PendingSpan[] = [];
  const endingStarts: AcnScore['repeatEndings'] = [];
  const measures = children(staff, 'Measure').map((m, index) => {
    const number = index + 1;
    const context = `staff ${staff.getAttribute('id')}, measure ${number}, voice ${voiceNumber}`;
    const voices = children(m, 'voice');
    const voice = voices[voiceNumber - 1];
    if (!voice) throw new Error(`Missing selected voice in ${context}; implicit voice rests are not implemented.`);
    for (const field of children(m)) {
      if (!['voice', 'stretch', 'startRepeat', 'endRepeat', 'irregular'].includes(field.tagName)) throw new Error(`Unsupported measure field ${field.tagName} in ${context}`);
    }
    const timeSig = children(voices[0], 'TimeSig')[0];
    if (timeSig) {
      meter = { numerator: integer(text(timeSig, 'sigN'), 'meter numerator'), denominator: integer(text(timeSig, 'sigD'), 'meter denominator') };
      if (meter.numerator <= 0 || meter.denominator <= 0) throw new Error(`Invalid meter in ${context}`);
    }
    const key = children(voices[0], 'KeySig')[0];
    if (key) keySignature = integer(text(key, 'accidental') || '0', 'key signature');
    const duration = m.getAttribute('len') ? parseTime(m.getAttribute('len')!) : rational(meter.numerator, meter.denominator);
    if (compareTime(duration, rational(0)) <= 0) throw new Error(`Invalid measure length in ${context}`);
    const events: ScoreEvent[] = [];
    const directions: ScoreMeasure['directions'] = [];
    let onset = rational(0);
    let endBarline = 'normal';
    for (const item of children(voice)) {
      const here = { measure: number, onset };
      if (['KeySig', 'TimeSig', 'Beam', 'Clef'].includes(item.tagName)) continue;
      if (item.tagName === 'location') throw new Error(`Explicit voice timing locations are not yet supported (${context})`);
      if (item.tagName === 'BarLine') { endBarline = text(item, 'subtype'); continue; }
      const directionKinds = { RehearsalMark: 'rehearsal', Tempo: 'tempo', StaffText: 'expression', SystemText: 'expression', Dynamic: 'dynamic' } as const;
      if (item.tagName in directionKinds) {
        directions.push({ kind: directionKinds[item.tagName as keyof typeof directionKinds], onset, text: text(item, 'text') || text(item, 'subtype') });
        continue;
      }
      if (item.tagName === 'Spanner' && item.getAttribute('type') === 'Volta') {
        const volta = child(item, 'Volta');
        const next = child(item, 'next');
        if (volta && next) {
          const loc = child(next, 'location');
          if (!loc) throw new Error(`Volta without endpoint in ${context}`);
          // beginText is escaped rich text in MuseScore 3.
          const rawText = text(volta, 'beginText');
          const label = rawText.includes('<') ? content(xmlDocument(`<text>${rawText}</text>`)) : rawText;
          endingStarts.push({ numbers: text(volta, 'endings').split(',').map(n => integer(n.trim(), 'volta ending')), text: label, from: here, to: relativePosition(loc, here) });
        }
        continue;
      }
      if (!['Chord', 'Rest'].includes(item.tagName)) throw new Error(`Unsupported ${item.tagName} in ${context}; import stopped rather than dropping it.`);
      const accepted = ['durationType', 'duration', 'dots', 'Lyrics', 'Note', 'Spanner', 'StemDirection', 'BeamMode', 'linkedMain', 'visible', 'offset'];
      for (const field of children(item)) if (!accepted.includes(field.tagName)) throw new Error(`Unsupported ${field.tagName} in ${context}`);
      if (text(item, 'visible') === '0') throw new Error(`Invisible event in ${context} needs an explicit import policy`);
      const length = eventDuration(item, duration);
      const notes = children(item, 'Note');
      if (item.tagName === 'Chord' && notes.length !== 1) throw new Error(`Expected a monophonic vocal line; found ${notes.length} simultaneous notes in ${context}`);
      const event: ScoreEvent = { id: `s${staff.getAttribute('id')}-v${voiceNumber}-m${number}-e${events.length + 1}`, kind: item.tagName === 'Chord' ? 'note' : 'rest', onset, duration: length, lyrics: [] };
      for (const lyric of children(item, 'Lyrics')) {
        for (const field of children(lyric)) if (!['text', 'syllabic', 'no', 'linkedMain'].includes(field.tagName)) throw new Error(`Unsupported lyric ${field.tagName} in ${context}`);
        const syllabic = text(lyric, 'syllabic') || 'single';
        if (!['single', 'begin', 'middle', 'end'].includes(syllabic)) throw new Error(`Unknown syllabic value in ${context}`);
        event.lyrics.push({ verse: integer(text(lyric, 'no') || '0', 'lyric verse') + 1, text: text(lyric, 'text'), syllabic: syllabic as 'single' | 'begin' | 'middle' | 'end' });
      }
      if (event.kind === 'note') {
        const note = notes[0];
        for (const field of children(note)) if (!['pitch', 'tpc', 'tpc2', 'Spanner', 'Accidental', 'linkedMain'].includes(field.tagName)) throw new Error(`Unsupported note ${field.tagName} in ${context}`);
        const midi = integer(text(note, 'pitch'), 'note pitch');
        if (midi < 0 || midi > 127) throw new Error(`Pitch out of range in ${context}`);
        event.pitch = { midi, name: pitchName(midi), octave: octave(midi) };
      }
      for (const spanner of [...children(item, 'Spanner'), ...notes.flatMap(n => children(n, 'Spanner'))]) {
        const type = spanner.getAttribute('type');
        if (type !== 'Tie' && type !== 'Slur') throw new Error(`Unsupported ${type} spanner in ${context}`);
        const next = child(spanner, 'next');
        if (next) {
          const loc = child(next, 'location');
          if (!loc) throw new Error(`Spanner without endpoint in ${context}`);
          pending.push({ kind: type === 'Tie' ? 'tie' : 'slur', from: event.id, to: relativePosition(loc, here) });
        }
      }
      events.push(event);
      onset = addTime(onset, length);
    }
    if (!equalTime(onset, duration)) throw new Error(`Events do not fill ${context}: got ${onset.numerator}/${onset.denominator}, expected ${duration.numerator}/${duration.denominator}`);
    return { number, duration, meter: { ...meter }, keySignature, events, directions, startRepeat: !!child(m, 'startRepeat'), ...(child(m, 'endRepeat') ? { repeatCount: integer(text(m, 'endRepeat'), 'repeat count') } : {}), endBarline };
  });
  return { measures, pending, endingStarts };
}
export function importMuseScore(native: NativeScore, partSelector: string, voiceNumber = 1): AcnScore {
  const choices = native.parts.filter(p => p.id === partSelector || p.name.toLowerCase() === partSelector.toLowerCase());
  if (choices.length !== 1) throw new Error(`Choose a unique part name or ID: ${native.parts.map(p => `${p.id}: ${p.name}`).join(', ')}`);
  const part = choices[0];
  if (part.staffIds.length !== 1) throw new Error('This first importer supports single-staff parts only.');
  if (!Number.isInteger(voiceNumber) || !part.voices.includes(voiceNumber)) throw new Error(`Voice must be one of ${part.voices.join(', ')} for ${part.name}`);
  const staff = children(native.score, 'Staff').find(s => s.getAttribute('id') === part.staffIds[0]);
  if (!staff) throw new Error('Selected part has no main-score staff');
  const selected = parseStaff(staff, voiceNumber);
  const topStaff = children(native.score, 'Staff')[0];
  const global = staff === topStaff && voiceNumber === 1 ? selected : parseStaff(topStaff, 1);
  if (global.measures.length !== selected.measures.length) throw new Error('Top and selected staff measure counts differ');
  for (let i = 0; i < selected.measures.length; i++) {
    const m = selected.measures[i], g = global.measures[i];
    if (!equalTime(m.duration, g.duration)) throw new Error(`Staff measure durations differ at measure ${m.number}`);
    for (const direction of g.directions.filter(d => ['rehearsal', 'tempo'].includes(d.kind))) {
      if (!m.directions.some(d => JSON.stringify(d) === JSON.stringify(direction))) m.directions.push(direction);
    }
    m.startRepeat ||= g.startRepeat;
    if (m.repeatCount === undefined && g.repeatCount !== undefined) m.repeatCount = g.repeatCount;
  }
  const allEvents = selected.measures.flatMap(m => m.events);
  const spans = selected.pending.map(pending => {
    const target = selected.measures[pending.to.measure - 1]?.events.find(e => equalTime(e.onset, pending.to.onset));
    const source = allEvents.find(e => e.id === pending.from)!;
    if (!target || source.kind !== 'note' || target.kind !== 'note') throw new Error(`Unresolved ${pending.kind} endpoint from ${pending.from}`);
    if (pending.kind === 'tie' && source.pitch!.midi !== target.pitch!.midi) throw new Error(`Tie changes pitch at ${pending.from}`);
    return { kind: pending.kind, from: source.id, to: target.id };
  });
  const meta = Object.fromEntries(children(native.score, 'metaTag').map(e => [e.getAttribute('name'), content(e)]));
  return {
    formatVersion: '0.1', metadata: { copyright: meta.copyright || '' },
    source: native.source,
    part: { id: part.id, name: part.name, staffId: part.staffIds[0], voice: voiceNumber, measures: selected.measures, spans },
    repeatEndings: global.endingStarts,
    transcription: { beatUnit: null, staffRange: part.name.toLowerCase() === 'tenor' ? { low: 48, high: 68 } : null },
    importNotes: ['Written measure order is preserved; repeats are not expanded.', 'ACN beat unit is unset pending a transcriber choice.', 'Source engraving, playback settings, and embedded extracted parts are not imported.'],
  };
}

/** Header text is imported into presentation settings, never the semantic score. */
export function importMuseScoreTitles(native: NativeScore, partName: string): ScoreTitles {
  const meta = Object.fromEntries(children(native.score, 'metaTag').map(e => [e.getAttribute('name'), content(e)]));
  const topStaff = children(native.score, 'Staff')[0];
  const headerTexts = children(topStaff, 'VBox').flatMap(box => children(box, 'Text'));
  const header = (style: string) => text(headerTexts.find(e => text(e, 'style') === style) ?? native.score, 'text');
  const singleLine = (value: string) => value.replace(/\s+/g, ' ').trim();
  return {
    leftTitle: '',
    centerTitle: singleLine(meta.workTitle || header('Title')),
    rightTitle: singleLine(meta.composer || header('Composer')),
    centerSubtitle: singleLine(partName),
  };
}
