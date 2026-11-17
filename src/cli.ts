import { embeddedFontCss } from './font-assets.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { layoutBlankPage } from './layout.js';
import { ensureScoreLayout, loadLayout } from './layout-settings.js';
import { parseScore } from './score-reader.js';
import { layoutMusic } from './music-layout.js';
import { createTextMeasurer } from './text-metrics.js';
import { renderSvg } from './svg.js';
import { renderPdf, type PdfPage } from './pdf.js';
import { readMuseScore, importMuseScore, importMuseScoreTitles } from './musescore.js';
import { parseTime, compareTime, rational } from './score.js';

try {
  const { values } = parseArgs({
    options: {
      blank: { type: 'boolean', short: 'b' },
      input: { type: 'string', short: 'i' },
      render: { type: 'string', short: 'r' },
      part: { type: 'string', short: 'p' },
      voice: { type: 'string', short: 'v' },
      beat: { type: 'string', short: 'u' },
      inspect: { type: 'boolean', short: 's' },
      layout: { type: 'string', short: 'l' },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });
  if ([values.blank, values.input, values.render].filter(Boolean).length > 1) throw new Error('--blank, --input, and --render cannot be combined.');
  if (values.help) {
    console.log(`Usage: npm start -- --blank [--layout overrides.json] [--output output.svg]
       npm start -- --render score.acn.json [--layout score.acn-layout.json]

  --blank,  -b         Generate blank tenor pages
  --input,  -i <file>  Import native MuseScore 3 .mscz/.mscx
  --render, -r <file>  Render saved .acn.json to SVG pages and a vector PDF
  --part,   -p <name>  Select part by name or listed ID
  --voice,  -v <n>     Select an individual voice (one-based)
  --beat,   -u <n/d>   Source duration of one ACN beat, e.g. 1/4
  --inspect,-s        List source parts without writing files
  --layout, -l <file>  Partial overrides for "default-layout.json"
  --output, -o <file>  Output base: .svg for rendering, .acn.json for import
  --help,   -h         Show this help

A single multipage PDF is generated alongside one SVG per page. Every SVG adds a page suffix to the output base: -page-1.svg, -page-2.svg, etc. The PDF uses the base name. Generated files are overwritten on each run.`);
  } else if (values.input) {
    if (values.blank) throw new Error('--blank and --input cannot be combined.');
    const native = await readMuseScore(values.input);
    if (values.inspect) {
      if (values.part || values.voice || values.output || values.beat !== undefined) throw new Error('--inspect lists all parts; do not combine it with --part, --voice, --beat, or --output.');
      console.log(JSON.stringify({ source: native.source, parts: native.parts }, null, 2));
    } else {
      if (!values.part) throw new Error(`Specify --part (-p). Available parts: ${native.parts.map(p => `${p.id}: ${p.name}`).join(', ')}`);
      const selected = native.parts.find(p => p.id === values.part || p.name.toLowerCase() === values.part!.toLowerCase());
      if (selected && selected.voices.length > 1 && values.voice === undefined) throw new Error(`Select --voice (-v) for ${selected.name}: ${selected.voices.join(', ')}`);
      if (values.voice && !/^[1-4]$/.test(values.voice)) throw new Error('--voice must be a number from 1 to 4.');
      const score = importMuseScore(native, values.part, Number(values.voice ?? '1'));
      if (values.beat !== undefined) {
        const beatUnit = parseTime(values.beat);
        if (compareTime(beatUnit, rational(0)) <= 0) throw new Error('--beat must be a positive whole-note fraction.');
        score.transcription.beatUnit = beatUnit;
        score.importNotes = score.importNotes.filter(note => note !== 'ACN beat unit is unset pending a transcriber choice.');
      }
      const stem = basename(values.input, extname(values.input)).replace(/[^a-zA-Z0-9_-]+/g, '-');
      const output = resolve(values.output ?? `output/${stem}-part-${score.part.id}.acn.json`);
      if (!output.endsWith('.acn.json')) throw new Error('Import output must end in .acn.json');
      await mkdir(dirname(output), { recursive: true });
      const layoutPath = await ensureScoreLayout(output, importMuseScoreTitles(native, score.part.name));
      await writeFile(output, JSON.stringify(score, null, 2) + '\n', 'utf8');
      console.log(`Imported ${score.part.name}, voice ${score.part.voice}: ${score.part.measures.length} measures.\nWrote ${output}\nLayout: ${layoutPath}\n${score.transcription.beatUnit ? `ACN beat unit: ${score.transcription.beatUnit.numerator}/${score.transcription.beatUnit.denominator} of a whole note.` : 'ACN beat unit is unset.'} Render with --render ${JSON.stringify(output)}.`);
    }
  } else {
    if (values.part || values.voice || values.inspect || values.beat !== undefined) throw new Error('--part, --voice, --beat, and --inspect require --input.');
    if (!values.blank && !values.render) throw new Error('Specify --blank (-b), --input (-i), or --render (-r). Use --help (-h) for usage.');
    if (values.render && !values.render.endsWith('.acn.json')) throw new Error('Render input must end in .acn.json');
    const score = values.render ? parseScore(JSON.parse(await readFile(values.render, 'utf8'))) : undefined;
    const output = resolve(values.output ?? (values.render ? values.render.slice(0, -9) + '.svg' : 'output/blank-tenor.svg'));
    if (!output.endsWith('.svg')) throw new Error('Output path must end in .svg');
    const settings = await loadLayout(values.layout, values.render);
    const scenes = score ? layoutMusic(score, settings, createTextMeasurer()) :
      Array.from({ length: settings.pages }, (_, i) => layoutBlankPage(settings, i + 1));
    await mkdir(dirname(output), { recursive: true });
    const pdfPages: PdfPage[] = [];
    for (let pageNumber = 1; pageNumber <= scenes.length; pageNumber++) {
      const pageOutput = output.slice(0, -4) + `-page-${pageNumber}.svg`;
      const svg = renderSvg(scenes[pageNumber - 1], embeddedFontCss(scenes[pageNumber - 1]));
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
