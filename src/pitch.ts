const names = ['C', 'C+', 'D', 'D+', 'E', 'F', 'F+', 'G', 'G+', 'A', 'A+', 'B'];

// MIDI numbers are used only as integer semitone coordinates, not as an importer.
export const tenorRange = { low: 48, high: 68 }; // C3 through G+4

export function pitchName(pitch: number): string {
  return names[pitch % 12];
}

export function octave(pitch: number): number {
  return Math.floor(pitch / 12) - 1;
}

export type LineColorMode = 'standard' | 'monochrome' | 'pitch-based';
export type NoteColorMode = 'monochrome' | 'pitch-based';

// User-supplied chromatic palette, ordered C through B and repeated by octave.
const pitchColors = [
  '#B22222', '#FF8000', '#A38300', '#89BC21', '#008000', '#008B8B',
  '#20B2AA', '#6495ED', '#0000FF', '#7F00FF', '#BA55D3', '#FF1493',
];

export function noteColor(pitch: number, mode: NoteColorMode = 'monochrome'): string {
  return mode === 'pitch-based' ? pitchColors[pitch % 12] : '#000000';
}

export function lineColor(pitch: number, mode: LineColorMode = 'standard', noteMode: NoteColorMode = 'monochrome'): string | undefined {
  const pc = pitch % 12;
  if (pc % 2 !== 0) return undefined;
  if (mode === 'monochrome' && pc % 4 === 0) {
    return noteMode === 'pitch-based' && pc !== 0 ? '#999999' : '#202020';
  }
  if (mode === 'pitch-based' && pc % 4 === 0) return noteColor(pitch, 'pitch-based');
  if (pc === 0) return '#202020';
  if (pc === 4) return '#e53935';
  if (pc === 8) return '#4589cf';
  return '#d4d4d4';
}
