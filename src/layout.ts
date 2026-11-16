import { defaultLayout, type LayoutSettings } from './settings.js';
import { lineColor, octave, pitchName, tenorRange } from './pitch.js';

export type Shape =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; fill: string; radius?: number; stroke?: string; strokeWidth?: number }
  | { kind: 'ellipse'; x: number; y: number; rx: number; ry: number }
  | { kind: 'text'; x: number; y: number; text: string; size: number; fontFamily?: string; anchor?: 'start' | 'middle' | 'end' };

export interface PageScene {
  width: number;
  height: number;
  shapes: Shape[];
  fontFamily: string;
  pageNumber: number;
  hasPitchIndex: boolean;
}

export const blankPageDefaults = defaultLayout;

export function layoutBlankPage(p: LayoutSettings = defaultLayout, pageNumber = 1): PageScene {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > p.pages) throw new Error('Page number is outside the configured page range.');
  const hasPitchIndex = p.pitchIndexPages === 'every' ||
    (p.pitchIndexPages === 'odd' ? pageNumber % 2 === 1 : pageNumber % 2 === 0);
  const shapes: Shape[] = [];
  const showTitles = pageNumber === 1 && [p.leftTitle, p.centerTitle, p.rightTitle, p.centerSubtitle].some(Boolean);
  const pageTop = showTitles ? p.firstPageTop : p.top;
  if (showTitles) {
    // Header sizes and offsets are provisional; empty fields produce no text.
    const titleY = pageTop - p.measureNumberGap - p.measureNumberSize - 22;
    for (const [text, x, anchor] of [
      [p.leftTitle, p.margin, 'start'],
      [p.centerTitle, p.width / 2, 'middle'],
      [p.rightTitle, p.width - p.margin, 'end'],
    ] as const) {
      if (text) shapes.push({ kind: 'text', text, x, y: titleY, size: 16, fontFamily: p.serifFont, anchor });
    }
    if (p.centerSubtitle) shapes.push({ kind: 'text', text: p.centerSubtitle, x: p.width / 2, y: titleY + 18, size: 16, fontFamily: p.serifFont });
  }
  const staffHeight = (tenorRange.high - tenorRange.low) * p.semitoneStep;
  for (let system = 0; system < p.systems; system++) {
    const top = pageTop + system * p.systemStep;
    if (system === 0 && hasPitchIndex) {
      shapes.push({ kind: 'rect', x: p.margin, y: top, width: p.guideWidth, height: staffHeight, fill: '#bfbfbf' });
    }
    for (let pitch = tenorRange.low; pitch <= tenorRange.high; pitch++) {
      const y = top + (tenorRange.high - pitch) * p.semitoneStep;
      const color = lineColor(pitch);
      if (color) shapes.push({ kind: 'line', x1: p.margin, y1: y, x2: p.width - p.margin, y2: y, color, width: p.staffLineWidth });
    }
    const musicLeft = p.margin + (system === 0 && hasPitchIndex ? p.guideWidth : 0);
    const measureWidth = (p.width - p.margin - musicLeft) / p.measuresPerSystem;
    for (let boundary = 0; boundary <= p.measuresPerSystem; boundary++) {
      const x = musicLeft + boundary * measureWidth;
      shapes.push({ kind: 'line', x1: x, y1: top, x2: x, y2: top + staffHeight, color: '#000000', width: p.barLineWidth });
    }
    shapes.push({ kind: 'text', x: musicLeft + p.measureNumberInset, y: top - p.measureNumberGap, text: String(((pageNumber - 1) * p.systems + system) * p.measuresPerSystem + 1), size: p.measureNumberSize, fontFamily: p.serifFont });
    if (system !== 0 || !hasPitchIndex) continue;
    shapes.push({ kind: 'line', x1: p.margin, y1: top, x2: p.margin, y2: top + staffHeight, color: '#000000', width: p.barLineWidth });
    // Two staggered columns keep neighboring semitone labels distinct.
    for (let pitch = tenorRange.low; pitch <= tenorRange.high; pitch++) {
      const y = top + (tenorRange.high - pitch) * p.semitoneStep;
      const x = p.margin + (pitch % 2 === 0 ? 82 : 108);
      shapes.push({ kind: 'ellipse', x, y, rx: 10, ry: 6.3 });
      shapes.push({ kind: 'text', x, y, text: pitchName(pitch), size: p.pitchLabelSize });
      if (pitch % 12 === 0) {
        const isMiddleC = pitch === 60;
        const labelWidth = isMiddleC ? 44 : 24;
        const labelLeft = p.margin + 6;
        shapes.push({ kind: 'rect', x: labelLeft, y: y - 6, width: labelWidth, height: 12, fill: '#ffffff',
          radius: 3, stroke: '#000000', strokeWidth: 0.6 });
        shapes.push({ kind: 'text', x: labelLeft + labelWidth / 2, y, text: isMiddleC ? 'Middle C' : `C${octave(pitch)}`, size: p.pitchLabelSize });
      }
    }
  }
  return { width: p.width, height: p.height, shapes, fontFamily: p.sansSerifFont, pageNumber, hasPitchIndex };
}
