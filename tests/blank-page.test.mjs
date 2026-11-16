import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutBlankPage, blankPageDefaults } from '../dist/layout.js';
import { lineColor, pitchName } from '../dist/pitch.js';
import { renderSvg } from '../dist/svg.js';

test('chromatic pitch names and landmark colors repeat each octave', () => {
  assert.deepEqual(Array.from({ length: 12 }, (_, i) => pitchName(48 + i)),
    ['C', 'C+', 'D', 'D+', 'E', 'F', 'F+', 'G', 'G+', 'A', 'A+', 'B']);
  for (let pitch = 48; pitch <= 56; pitch++) {
    assert.equal(lineColor(pitch), lineColor(pitch + 12));
    assert.equal(lineColor(pitch) === undefined, pitch % 2 !== 0);
  }
  assert.equal(lineColor(48), '#202020');
  assert.equal(lineColor(52), '#e53935');
  assert.equal(lineColor(56), '#4589cf');
});

test('five complete tenor grids fit the page with one correctly aligned index', () => {
  const page = layoutBlankPage();
  const lines = page.shapes.filter(s => s.kind === 'line' && s.y1 === s.y2);
  assert.equal(lines.length, 55); // 11 chromatic lines per system
  const labels = page.shapes.filter(s => s.kind === 'text' && !/^\d+$/.test(s.text));
  assert.equal(labels.length, 23); // 21 pitches plus C3 and Middle C landmarks
  assert.equal(labels[0].text, 'C');
  assert.equal(labels.at(-1).text, 'G+');
  for (const label of labels) {
    assert.ok(label.y >= 64 && label.y <= 204);
    assert.ok(label.x > 48 && label.x < 176);
  }
  for (const line of lines) {
    assert.ok(line.x1 >= 48 && line.x2 <= page.width - 48);
    assert.ok(line.y1 >= 48 && line.y1 <= page.height - 48);
  }
  const verticals = page.shapes.filter(s => s.kind === 'line' && s.x1 === s.x2);
  const indexEdge = verticals.find(s => s.x1 === 48 && s.y1 === 64);
  assert.ok(indexEdge);
  assert.equal(indexEdge.color, '#000000');
  assert.equal(indexEdge.y2, 204);
  const bars = verticals.filter(s => s !== indexEdge);
  assert.equal(bars.length, 25); // five boundaries enclose four measures per system
  const numbers = page.shapes.filter(s => s.kind === 'text' && /^\d+$/.test(s.text));
  assert.deepEqual(numbers.map(s => s.text), ['1', '5', '9', '13', '17']);
  for (let system = 0; system < 5; system++) {
    const boundaries = bars.slice(system * 5, system * 5 + 5);
    assert.equal(boundaries[0].x1, system === 0 ? 176 : 48);
    assert.equal(boundaries[4].x1, 768);
    assert.ok(numbers[system].y < boundaries[0].y1);
    for (let i = 1; i < 5; i++) {
      assert.equal(boundaries[i].x1 - boundaries[i - 1].x1, (768 - boundaries[0].x1) / 4);
      assert.equal(boundaries[i].color, '#000000');
    }
  }
  const svg = renderSvg(page);
  assert.match(svg, /width="8.5in" height="11in"/);
  assert.doesNotMatch(svg, /NaN|undefined/);
  assert.equal(svg, renderSvg(layoutBlankPage()));
});

test('pitch index policies use one-based page parity and reclaim index space', () => {
  for (const policy of ['every', 'even', 'odd']) {
    for (let pageNumber = 1; pageNumber <= 4; pageNumber++) {
      const page = layoutBlankPage({ ...blankPageDefaults, pages: 4, pitchIndexPages: policy }, pageNumber);
      const expected = policy === 'every' || pageNumber % 2 === (policy === 'odd' ? 1 : 0);
      assert.equal(page.hasPitchIndex, expected);
      assert.equal(page.shapes.filter(s => s.kind === 'ellipse').length, expected ? 21 : 0);
      const firstNumber = page.shapes.find(s => s.kind === 'text' && /^\d+$/.test(s.text));
      assert.equal(firstNumber.x, (expected ? 176 : 48) + 12);
      assert.equal(firstNumber.text, String((pageNumber - 1) * 20 + 1));
    }
  }
});

test('titles only appear on the first page with extra header space', () => {
  const settings = { ...blankPageDefaults, pages: 2, leftTitle: 'Left', centerTitle: 'Center', rightTitle: 'Right', centerSubtitle: 'Subtitle' };
  const first = layoutBlankPage(settings, 1);
  const second = layoutBlankPage(settings, 2);
  for (const text of ['Left', 'Center', 'Right', 'Subtitle']) {
    assert.ok(first.shapes.some(s => s.kind === 'text' && s.text === text));
    assert.ok(!second.shapes.some(s => s.kind === 'text' && s.text === text));
  }
  assert.equal(Math.min(...first.shapes.filter(s => s.kind === 'line').map(s => s.y1)), settings.firstPageTop);
  assert.equal(Math.min(...second.shapes.filter(s => s.kind === 'line').map(s => s.y1)), settings.top);
});
