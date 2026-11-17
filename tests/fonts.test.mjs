import test from 'node:test';
import assert from 'node:assert/strict';
import { createTextMeasurer } from '../dist/text-metrics.js';
import { embeddedFontCss } from '../dist/font-assets.js';
import { weightedFamily } from '../dist/font-families.js';
import { renderSvg } from '../dist/svg.js';
import { renderPdf } from '../dist/pdf.js';

test('intermediate lyric weights use distinct metrics and actual embedded PDF faces', async () => {
  const measure = createTextMeasurer();
  const family = 'Roboto, sans-serif';
  assert.notEqual(measure('love', 14, family, 400), measure('love', 14, family, 500));
  const page = { width: 300, height: 120, pageNumber: 1, hasPitchIndex: false, fontFamily: family,
    shapes: [400, 500, 600, 700].map((weight, i) => ({ kind: 'text', text: 'love me', x: 80, y: 20 + i * 24, size: 14, fontFamily: weightedFamily(family, weight), fontWeight: weight })) };
  const svg = renderSvg(page, embeddedFontCss(page));
  assert.match(svg, /font-weight="500" font-family="ACN Roboto Medium"/);
  assert.equal((svg.match(/data:font\/ttf;base64,/g) ?? []).length, 4);
  assert.doesNotMatch(svg, /stroke-width/);
  const pdf = (await renderPdf([{ svg, width: page.width, height: page.height }])).toString('latin1');
  for (const face of ['Regular', 'Medium', 'SemiBold', 'Bold']) assert.match(pdf, new RegExp(`Roboto-${face}`));
});
