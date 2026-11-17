import { weightedFamily } from './font-families.js';
import PDFDocument from 'pdfkit';
import { fontResolver } from './pdf.js';

export type MeasureText = (text: string, size: number, family: string, weight?: number) => number;
/** Same installed font matching as PDF export, without coupling layout to Node. */
export function createTextMeasurer(): MeasureText {
  const doc = new PDFDocument({ autoFirstPage: false });
  const resolveFont = fontResolver();
  const cache = new Map<string, number>();
  return (text, size, family, weight = 400) => {
    family = weightedFamily(family, weight);
    const key = JSON.stringify([text, size, family]);
    if (!cache.has(key)) {
      doc.font(resolveFont(family, false, false)).fontSize(size);
      cache.set(key, doc.widthOfString(text));
    }
    return cache.get(key)!;
  };
}
