import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { layoutBlankPage } from './layout.js';
import { parseLayout } from './settings.js';
import { renderSvg } from './svg.js';
import { renderPdf, type PdfPage } from './pdf.js';

try {
  const { values } = parseArgs({
    options: {
      blank: { type: 'boolean', short: 'b' },
      layout: { type: 'string', short: 'l', default: 'layout.json' },
      output: { type: 'string', short: 'o', default: 'output/blank-tenor.svg' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });
  if (values.help) {
    console.log(`Usage: npm start -- --blank [--layout layout.json] [--output output.svg]

  --blank,  -b         Generate blank tenor pages
  --layout, -l <file>  Layout settings (default: layout.json)
  --output, -o <file>  SVG destination (default: output/blank-tenor.svg)
  --help,   -h         Show this help

A single multipage PDF is generated alongside one SVG per page. Page 1 uses the output path; later pages add -page-2, -page-3, etc. Generated files are overwritten on each run.`);
  } else {
    if (!values.blank) throw new Error('Specify --blank (-b) to generate a blank page. Use --help (-h) for usage.');
    const output = resolve(values.output);
    if (!output.endsWith('.svg')) throw new Error('Output path must end in .svg');
    const layoutPath = resolve(values.layout);
    let settings;
    try {
      settings = parseLayout(JSON.parse(await readFile(layoutPath, 'utf8')));
    } catch (error) {
      throw new Error(`Cannot load layout ${layoutPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await mkdir(dirname(output), { recursive: true });
    const pdfPages: PdfPage[] = [];
    for (let pageNumber = 1; pageNumber <= settings.pages; pageNumber++) {
      // Preserve the existing first-page filename; suffix subsequent pages.
      const pageOutput = pageNumber === 1 ? output : output.slice(0, -4) + `-page-${pageNumber}.svg`;
      const svg = renderSvg(layoutBlankPage(settings, pageNumber));
      pdfPages.push({ svg, width: settings.width, height: settings.height });
      await writeFile(pageOutput, svg, 'utf8');
      console.log(`Wrote ${pageOutput}`);
    }
    const pdfOutput = output.slice(0, -4) + '.pdf';
    await writeFile(pdfOutput, await renderPdf(pdfPages));
    console.log(`Wrote ${pdfOutput}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
