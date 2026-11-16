const names = ['C', 'C+', 'D', 'D+', 'E', 'F', 'F+', 'G', 'G+', 'A', 'A+', 'B'];

// MIDI numbers are used only as integer semitone coordinates, not as an importer.
export const tenorRange = { low: 48, high: 68 }; // C3 through G+4

export function pitchName(pitch: number): string {
  return names[pitch % 12];
}

export function octave(pitch: number): number {
  return Math.floor(pitch / 12) - 1;
}

export function lineColor(pitch: number): string | undefined {
  const pc = pitch % 12;
  if (pc % 2 !== 0) return undefined;
  if (pc === 0) return '#202020';
  if (pc === 4) return '#e53935';
  if (pc === 8) return '#4589cf';
  return '#d4d4d4';
}
