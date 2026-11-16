import PDFDocument from 'pdfkit';
import svgToPdf from 'svg-to-pdfkit';
import { execFileSync } from 'node:child_process';

export interface PdfPage {
  svg: string;
  width: number;
  height: number;
}

// Fontconfig resolves installed font families for embedding in the PDF.
// On systems without Fontconfig, use PDF's standard serif/sans-serif fonts.
function fontResolver(): (family: string, bold: boolean, italic: boolean) => string {
  const cache = new Map<string, string>();
  return (family, bold, italic) => {
    const key = `${family}:weight=${bold ? 'bold' : 'regular'}:slant=${italic ? 'italic' : 'roman'}`;
    const cached = cache.get(key);
    if (cached) return cached;
    let font: string;
    try {
      font = execFileSync('fc-match', ['-f', '%{file}', key], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (!font) throw new Error('No installed font match');
    } catch {
      const serif = !family.includes('sans-serif') && /serif|Times|Georgia/i.test(family);
      font = serif ? (bold ? (italic ? 'Times-BoldItalic' : 'Times-Bold') : (italic ? 'Times-Italic' : 'Times-Roman'))
        : (bold ? (italic ? 'Helvetica-BoldOblique' : 'Helvetica-Bold') : (italic ? 'Helvetica-Oblique' : 'Helvetica'));
    }
    cache.set(key, font);
    return font;
  };
}

export function renderPdf(pages: PdfPage[]): Promise<Buffer> {
  if (pages.length === 0) return Promise.reject(new Error('PDF requires at least one page.'));
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, info: { Title: 'Accessible Choral Notation', Creator: 'ACN' } });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const fontCallback = fontResolver();
    try {
      for (const page of pages) {
        // SVG layout uses 96 units/inch; PDF uses 72 points/inch.
        const width = page.width * 72 / 96;
        const height = page.height * 72 / 96;
        doc.addPage({ size: [width, height], margin: 0 });
        svgToPdf(doc, page.svg, 0, 0, { width, height, fontCallback,
          warningCallback: warning => { throw new Error(`SVG to PDF: ${warning}`); } });
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
