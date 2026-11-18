/** Exact musical time in whole-note units; independent of the chosen ACN beat. */
export interface Rational { numerator: number; denominator: number }
export function rational(numerator: number, denominator = 1): Rational {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) throw new Error('Invalid rational time');
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator)) * Math.sign(denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
export const addTime = (a: Rational, b: Rational): Rational => rational(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
export const equalTime = (a: Rational, b: Rational): boolean => a.numerator * b.denominator === b.numerator * a.denominator;
export const compareTime = (a: Rational, b: Rational): number => Math.sign(a.numerator * b.denominator - b.numerator * a.denominator);
export function parseTime(text: string): Rational {
  if (!/^-?\d+\/\d+$/.test(text)) throw new Error(`Invalid musical fraction: ${text}`);
  const [n, d] = text.split('/').map(Number);
  return rational(n, d);
}
export interface Lyric {
  verse: number;
  text: string;
  syllabic: 'single' | 'begin' | 'middle' | 'end';

}
export interface ScoreEvent {
  id: string;
  kind: 'note' | 'rest';
  /** A breath after this sung event, without changing its musical duration. */
  breathAfter?: boolean;
  /** A hold, displayed above the capsule containing this sung event. */
  fermata?: boolean;
  onset: Rational;
  duration: Rational;
  pitch?: { midi: number; name: string; octave: number };
  lyrics: Lyric[];
}
export interface ScorePosition { measure: number; onset: Rational }
export interface Hairpin {
  kind: 'crescendo' | 'diminuendo';
  from: ScorePosition;
  to: ScorePosition;
}
export interface ScoreSpan {
  kind: 'tie' | 'slur';
  from: string;
  to: string;
}
export interface Direction { kind: 'rehearsal' | 'tempo' | 'expression' | 'dynamic'; onset: Rational; text: string; metronome?: { unit: Rational; bpm: number } }
export interface ScoreMeasure {
  number: number;
  /** Original score number for display after repeats are written out. */
  sourceNumber?: number;
  /** Earlier ACN measure copied when unfolding a repeat; does not change numbering. */
  repeatOf?: number;
  duration: Rational;
  meter: { numerator: number; denominator: number };
  keySignature: number;
  events: ScoreEvent[];
  directions: Direction[];
  startRepeat: boolean;
  repeatCount?: number;
  endBarline: string;
}
export interface AcnScore {
  formatVersion: '0.1';
  metadata: { copyright: string };
  source: { file: string; sha256: string; format: 'MuseScore' | 'PDF'; version: string; programVersion?: string; archiveEntry?: string };
  part: { id: string; name: string; staffId: string; voice: number; measures: ScoreMeasure[]; spans: ScoreSpan[];
    hairpins?: Hairpin[];
    /** Independent additional lines of the same part, sharing measure timelines. */
    additionalVoices?: { voice: number; name: string; measures: ScoreMeasure[]; spans: ScoreSpan[]; hairpins?: Hairpin[] }[];
  };
  repeatEndings: { numbers: number[]; text: string; from: ScorePosition; to: ScorePosition }[];
  transcription: { beatUnit: Rational | null; staffRange: { low: number; high: number } | null };
  importNotes: string[];
}
