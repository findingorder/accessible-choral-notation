import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readMuseScore, importMuseScore } from '../dist/musescore.js';
import { rational } from '../dist/score.js';
import { parseScore } from '../dist/score-reader.js';
import { layoutMusic } from '../dist/music-layout.js';
import { parseLayout } from '../dist/settings.js';
import { loadLayout } from '../dist/layout-settings.js';
import { createTextMeasurer } from '../dist/text-metrics.js';
import { renderSvg } from '../dist/svg.js';

const score = importMuseScore(await readMuseScore('docs/examples/If Ye Love Me - Tallis - Original.mscz'), 'Tenor');
score.transcription.beatUnit = rational(1, 4);
const measureText = createTextMeasurer();
const settings = parseLayout({});
const shapes = pages => pages.flatMap(p => p.shapes);
const isDot = s => /^(sung|rest)-(dot|half-)/.test(s.role ?? '');
const draw = (s = score, p = settings) => layoutMusic(s, p, measureText);
function small(measures) {
  const copy = structuredClone(score);
  copy.part.spans = []; copy.repeatEndings = [];
  copy.part.measures = measures.map((events, i) => {
    let onset = 0;
    return { number: i + 1, duration: rational(1), meter: { numerator: 4, denominator: 4 }, keySignature: 0, directions: [], startRepeat: false, endBarline: 'normal', events: events.map(([beats, pitch, text, syllabic = 'single'], j) => {
      const e = { id: `m${i + 1}e${j + 1}`, kind: pitch === null ? 'rest' : 'note', onset: rational(onset, 16), duration: rational(beats * 4, 16), lyrics: text ? [{ verse: 1, text, syllabic }] : [], ...(pitch === null ? {} : { pitch: { midi: pitch, name: 'C', octave: 4 } }) };
      onset += beats * 4; return e;
    }) };
  });
  return copy;
}

test('Tallis renders all 27 measures, exact durations and pitches, with automatic page count', () => {
  const original = JSON.stringify(score);
  const pages = draw(score, { ...settings, pages: 99 });
  assert.equal(pages.length, 2);
  assert.deepEqual(draw(score, { ...settings, pages: 1 }), pages);
  assert.equal(JSON.stringify(score), original, 'layout never edits musical time or source data');
  const all = shapes(pages), dots = all.filter(isDot);
  const events = score.part.measures.flatMap(m => m.events);
  for (const e of events) {
    const rendered = dots.filter(s => s.eventId === e.id);
    assert.ok(rendered.length, e.id);
    assert.equal(rendered.reduce((sum, s) => sum + (s.role.includes('half') ? 0.5 : 1), 0), e.duration.numerator / e.duration.denominator * 4, e.id);
  }
  assert.equal(dots.reduce((sum, s) => sum + (s.role.includes('half') ? 0.5 : 1), 0), 108);
  const first = dots.find(s => s.eventId === events[0].id);
  assert.equal(first.y, settings.top + (68 - 57) * settings.semitoneStep);
  assert.equal(all.filter(s => s.role === 'lyric').length, 69);
  assert.deepEqual(all.filter(s => s.role === 'rehearsal').map(s => s.text), ['A', 'B', 'C', 'D']);
  assert.deepEqual(all.filter(s => s.role === 'ending-label').map(s => s.text), ['1.', '2.']);
  assert.equal(all.filter(s => s.role === 'repeat-dot').length, 4);
  assert.equal(all.filter(s => s.role === 'example-dot').length, 4);
  const giveDots = dots.filter(s => s.eventId === 's3-v1-m10-e3');
  const giveExtension = all.find(s => s.role === 'lyric-continuation' && s.eventId === 's3-v1-m10-e3');
  assert.ok(giveExtension, 'retain the extension after give');
  assert.ok(Math.abs(giveExtension.x2 - giveDots.at(-1).x - Math.max(settings.capsuleHeight / 2, settings.dotRadius + settings.capsuleEndPadding)) < 1e-8,
    'give extension ends at the capsule edge before the next pitch');
  const lineStarts = all.filter(s => s.role === 'measure-number').map(s => Number(s.text));
  assert.ok(lineStarts.some((n, i) => i > 0 && n - lineStarts[i - 1] > 4), 'automatic fitting allows more than four measures');
  const secondPageStart = pages[1].shapes.find(s => s.role === 'measure-number').text;
  assert.ok(pages[1].description.includes(`${secondPageStart}–27`));
  for (const page of pages) assert.doesNotMatch(renderSvg(page), /NaN|undefined|Infinity/);
  const extensions = all.filter(s => s.role === 'lyric-continuation');
  assert.ok(!extensions.some(s => s.eventId === 's3-v1-m2-e1'), 'omit the short underscore after love');
  assert.ok(extensions.some(s => s.eventId === 's3-v1-m2-e2'), 'retain the longer continuation after me');
  for (const e of score.part.measures[1].events.slice(0, 1)) {
    const pair = all.filter(s => isDot(s) && s.eventId === e.id);
    const lyric = all.find(s => s.role === 'lyric' && s.eventId === e.id);
    const textCenter = lyric.x + measureText(lyric.text, settings.lyricSize, settings.sansSerifFont, settings.lyricFontWeight) / 2;
    assert.ok(Math.abs(textCenter - (pair[0].x + pair[1].x) / 2) < 1e-8);
  }
  const lyrics = all.filter(s => s.role === 'lyric');
  const wordGap = (left, right) => {
    const a = lyrics.find(s => s.eventId === left), b = lyrics.find(s => s.eventId === right);
    return b.x - a.x - measureText(a.text, settings.lyricSize, settings.sansSerifFont, settings.lyricFontWeight);
  };
  // A pair-centered word spans more musical time to the next anchor than a
  // one-dot word; duration-based stretch may differ by at most one dot width.
  assert.ok(Math.abs(wordGap('s3-v1-m3-e2', 's3-v1-m3-e3') - wordGap('s3-v1-m2-e1', 's3-v1-m2-e2')) < 2 * settings.dotRadius,
    'keep/my and love/me word gaps stay within one dot width of each other');
  const compact = all;
  const ments = compact.find(s => s.role === 'lyric' && s.eventId === 's3-v1-m4-e2');
  const outgoing = compact.find(s => s.role === 'lyric-continuation' && s.eventId === ments.eventId && Math.abs(s.y1 - (ments.y + settings.lyricSize * 0.45)) < 1e-8);
  assert.ok(outgoing && outgoing.x2 > outgoing.x1, 'ments signals continuation onto the next system');
  assert.ok(outgoing.x2 - outgoing.x1 < settings.lyricContinuationMinLength, 'keep the necessary short outgoing underscore');
  assert.ok(Math.abs(outgoing.x1 - ments.x - measureText(ments.text, settings.lyricSize, settings.sansSerifFont, settings.lyricFontWeight)) < 1e-8, 'underscore touches the lyric');
  const incoming = compact.find(s => s.role === 'lyric-continuation' && s.eventId === ments.eventId && s.y1 > outgoing.y1);
  const lastSungDot = compact.filter(s => isDot(s) && s.eventId === 's3-v1-m5-e1').at(-1);
  const capsuleInset = Math.max(settings.capsuleHeight / 2, settings.dotRadius + settings.capsuleEndPadding);
  assert.ok(Math.abs(incoming.x2 - lastSungDot.x - capsuleInset) < 1e-8, 'measure 5 continuation ends at its sung capsule before the rest');
  for (const e of score.part.measures[3].events) {
    const pair = compact.filter(s => isDot(s) && s.eventId === e.id);
    const text = compact.find(s => s.role === 'lyric' && s.eventId === e.id);
    const center = text.x + measureText(text.text, settings.lyricSize, settings.sansSerifFont, settings.lyricFontWeight) / 2;
    assert.ok(Math.abs(center - (pair[0].x + pair[1].x) / 2) < 1e-8, 'center each syllable beneath its pair');
  }
});

test('two-dot syllable groups center within entire or shared capsules', () => {
  const all = shapes(draw());
  const id = 's3-v1-m22-e2';
  const pair = all.filter(s => isDot(s) && s.eventId === id);
  const text = all.find(s => s.role === 'lyric' && s.eventId === id);
  const center = t => t.x + measureText(t.text, settings.lyricSize, settings.sansSerifFont, settings.lyricFontWeight) / 2;
  assert.equal(pair.length, 2);
  assert.ok(Math.abs(center(text) - (pair[0].x + pair[1].x) / 2) < 1e-8, 'truth centers automatically');
  for (const id of ['s3-v1-m26-e1', 's3-v1-m26-e2']) {
    const dots = all.filter(s => isDot(s) && s.eventId === id);
    const lyric = all.find(s => s.role === 'lyric' && s.eventId === id);
    assert.equal(dots.length, 2);
    assert.ok(Math.abs(center(lyric) - (dots[0].x + dots[1].x) / 2) < 1e-8, `${lyric.text} centers under its own pair in measure 26`);
  }
  const s = small([[[1, 60, 'one'], [1, 60], [2, 62, 'two']]]);
  const rendered = shapes(draw(s));
  const dots = rendered.filter(isDot);
  assert.ok(Math.abs(center(rendered.find(s => s.role === 'lyric' && s.text === 'one')) - (dots[0].x + dots[1].x) / 2) < 1e-8, 'pair may span source events');
  s.part.measures[0].events[1].lyrics = [{ verse: 1, text: 'next', syllabic: 'single' }];
  const separate = shapes(draw(s));
  assert.ok(Math.abs(center(separate.find(s => s.role === 'lyric' && s.text === 'one')) - separate.find(isDot).x) < 1e-8, 'separate words keep separate anchors');

});

test('final barlines use a spaced thin/thick pair ending at the staff edge', () => {
  const s = small([[[4, 60, 'end']]]);
  s.part.measures[0].endBarline = 'end';
  for (const width of [0.8, 1.2]) {
    const p = { ...settings, barLineWidth: width };
    const bars = shapes(draw(s, p)).filter(s => s.role === 'barline');
    const thick = bars.find(s => s.width === 6 * width);
    assert.ok(thick);
    assert.ok(Math.abs(thick.x1 + thick.width / 2 - (p.width - p.margin)) < 1e-8);
    assert.ok(bars.some(s => s.width === width && Math.abs(thick.x1 - s.x1 - 9 * width) < 1e-8));
    assert.equal(bars.length, 3, 'one starting bar and exactly two ending strokes');
    const lastDot = shapes(draw(s, p)).filter(isDot).at(-1);
    const capsuleRight = lastDot.x + Math.max(p.capsuleHeight / 2, p.dotRadius + p.capsuleEndPadding);
    const innerEdge = thick.x1 - 9 * width - width / 2;
    assert.ok(innerEdge - capsuleRight >= p.measureEndPadding - 1e-8, 'final bar preserves capsule end clearance');
  }
});

test('line surplus is shared by duration rather than lyric-driven measure width', () => {
  const s = small([[[1, 60, 'several'], [1, 62, 'longer'], [1, 64, 'lyric'], [1, 65, 'words']], [[4, 57, 'held']]]);
  const boundary = width => {
    const pages = draw(s, { ...settings, width, musicMeasuresPerSystem: 2 });
    const bars = pages[0].shapes.filter(s => s.role === 'barline');
    assert.equal(bars.length, 3, 'both measures fit on the same line');
    return bars[1].x1;
  };
  assert.ok(Math.abs(boundary(1100) - boundary(1000) - 50) < 1e-8, 'equal-duration measures each receive half of the extra space');
});

test('internal rests remain in the sung capsule; trailing and initial rests are separate at the prescribed pitch', () => {
  const s = small([[[1, null], [1, 60, 'a'], [1, null], [1, 60, 'b']], [[1, null], [3, 62, 'c']]]);
  const all = shapes(draw(s));
  assert.equal(all.filter(s => s.role?.startsWith('capsule')).length, 4);
  const rest = all.filter(s => s.role === 'rest-dot');
  assert.equal(rest.length, 3);
  assert.ok(rest.every(s => s.y === settings.top + 8 * settings.semitoneStep));
});

test('written-out measures retain source numbers while keeping unique internal order', () => {
  const s = small([[[4, 60, 'one']], [[4, 62, 'two']], [[4, 60, 'one']]]);
  s.part.measures.forEach((m, i) => { m.sourceNumber = [14, 15, 14][i]; });
  const pages = draw(s, { ...settings, musicMeasuresPerSystem: 1 });
  assert.deepEqual(shapes(pages).filter(s => s.role === 'measure-number').map(s => s.text), ['14', '15', '14']);
  assert.ok(!shapes(pages).some(s => ['repeat-dot', 'repeat-ending', 'ending-label'].includes(s.role)));
  s.part.measures[2].sourceNumber = 0;
  assert.throws(() => draw(s), /source number/);
});

test('rehearsal letters copied by unfolded repeats get a prime across pages without changing source text', () => {
  const s = small([[[4, 60]], [[4, 60]], [[4, 60]]]);
  for (const m of s.part.measures) m.directions = [
    { kind: 'rehearsal', text: 'K', onset: rational(0) },
    { kind: 'tempo', text: 'Adagio', onset: rational(0) },
  ];
  s.part.measures[1].repeatOf = 1;
  const original = JSON.stringify(s);
  const p = { ...settings, systems: 1, musicMeasuresPerSystem: 1 };
  const rendered = draw(s, p);
  assert.equal(rendered.length, 3);
  assert.deepEqual(shapes(rendered).filter(s => s.role === 'rehearsal').map(s => s.text), ['K', "K'", 'K']);
  assert.deepEqual(shapes(rendered).filter(s => s.role === 'tempo').map(s => s.text), ['Adagio', 'Adagio', 'Adagio']);
  assert.equal(JSON.stringify(s), original);
  assert.deepEqual(draw(s, p), rendered, 'rerendering never accumulates primes');
  for (const invalid of [0, 2, 3, 1.5, '1']) {
    s.part.measures[1].repeatOf = invalid;
    assert.throws(() => draw(s, p), /repeatOf must identify an earlier measure/);
  }
});

test('word boundaries and syllable gaps are different and do not add beats', () => {
  const s = small([[[1, 60, 'Je', 'begin'], [1, 60, 'sus', 'end'], [2, 60, 'lives']]]);
  const all = shapes(draw(s)), dots = all.filter(isDot);
  assert.equal(dots.length, 4);
  assert.equal(all.filter(s => s.role === 'word-divider').length, 1);
  const unsplit = small([[[1, 60, 'Je'], [1, 60, 'sus'], [2, 60, 'lives']]]);
  const ordinaryDots = shapes(draw(unsplit)).filter(isDot);
  assert.ok(dots[1].x - dots[0].x > ordinaryDots[1].x - ordinaryDots[0].x);
  const acrossBar = shapes(draw(small([[[4, 60, 'and']], [[2, 60, 'I'], [2, 60, 'will']]])));
  const dividers = acrossBar.filter(s => s.role === 'word-divider');
  assert.equal(dividers.length, 1, 'barline replaces the and/I divider; I/will keeps its divider');
  const iDots = acrossBar.filter(s => isDot(s) && s.eventId === 'm2e1');
  const willDot = acrossBar.find(s => isDot(s) && s.eventId === 'm2e2');
  assert.ok(dividers[0].x1 > iDots.at(-1).x && dividers[0].x1 < willDot.x);
  assert.equal(acrossBar.filter(s => s.role?.startsWith('capsule')).length, 1, 'capsule stays connected across the barline');
});

test('half dots face across pitch changes; unpaired final half faces right and lone half faces up', () => {
  const s = small([[[0.5, 60], [0.5, 62], [3, 64]], [[2.5, 60], [1, 62], [0.5, 64]]]);
  const all = shapes(draw(s));
  assert.deepEqual(all.filter(s => s.role?.includes('-half-')).map(s => s.role), ['sung-half-right', 'sung-half-left', 'sung-half-right', 'sung-half-up']);
});

test('rest dividers follow the measure midpoint, including partial-measure rests', () => {
  const s = small([[[1, 60, 'a'], [2.5, null], [0.5, 62]], [[4, null]]]);
  s.transcription.beatUnit = rational(1, 8);
  const all = shapes(draw(s));
  assert.equal(all.filter(s => s.role === 'rest-divider').length, 2);
  const restDots = all.filter(s => s.role === 'rest-dot' && s.eventId === 'm1e2');
  const separator = all.find(s => s.role === 'rest-divider');
  assert.ok(separator.x1 > restDots[1].x && separator.x1 < restDots[2].x);
});

test('capsules and melismatic lyrics continue through system and page breaks at the same pitch and baseline', () => {
  const s = small([[[4, 60, 'sing']], [[4, 60]]]);
  const p = { ...settings, systems: 1, musicMeasuresPerSystem: 1, centerTitle: 'Title' };
  const pages = draw(s, p);
  assert.equal(pages.length, 2);
  assert.ok(pages[0].shapes.some(s => s.role === 'capsule-continued-right'));
  assert.ok(pages[1].shapes.some(s => s.role === 'capsule-continued-left'));
  const text = pages[0].shapes.find(s => s.role === 'lyric');
  const continuation = pages[1].shapes.find(s => s.role === 'lyric-continuation');
  assert.equal(continuation.kind, 'line');
  assert.ok(continuation.x2 > continuation.x1);
  assert.ok(Math.abs(text.y + p.lyricSize * 0.45 - p.firstPageTop - (continuation.y1 - p.top)) < 1e-8);
  assert.equal(continuation.y1, continuation.y2);
  assert.equal(continuation.x1, p.margin, 'incoming underscore meets the left barline');
  const outgoing = pages[0].shapes.find(s => s.role === 'lyric-continuation');
  assert.equal(outgoing.x2, p.width - p.margin, 'outgoing underscore meets the right barline');
  assert.ok(!shapes(pages).some(s => s.kind === 'text' && s.text === '-'));
  assert.ok(!pages[1].shapes.some(s => s.role === 'lyric'));
});

test('all syllables of a word share a baseline across measures and pages', () => {
  const all = shapes(draw());
  const forDot = all.find(s => isDot(s) && s.eventId === 's3-v1-m15-e4');
  const evDot = all.find(s => isDot(s) && s.eventId === 's3-v1-m16-e1');
  const boundary = all.find(s => s.role === 'barline' && s.x1 > forDot.x && s.x1 < evDot.x && s.y1 < forDot.y && s.y2 > forDot.y);
  assert.ok(boundary, 'barline separates for and ev');
  assert.ok(Math.abs((boundary.x1 - forDot.x) - (evDot.x - boundary.x1)) < 1e-8, 'for and ev dots are equally far from the barline');
  for (const ids of [
    ['s3-v1-m15-e4', 's3-v1-m16-e1', 's3-v1-m16-e3'],
    ['s3-v1-m18-e2', 's3-v1-m18-e3', 's3-v1-m19-e1'],
  ]) {
    const text = ids.map(id => all.find(s => s.role === 'lyric' && s.eventId === id));
    assert.ok(text.every(s => s.y === text[0].y));
    for (const hyphen of all.filter(s => s.role === 'lyric-hyphen' && ids.includes(s.eventId))) assert.equal(hyphen.y, text[0].y);
  }
  const s = small([[[2, 67, 'sing'], [2, 60, 'for', 'begin']], [[2, 48, 'ev', 'middle'], [2, 55, 'er', 'end']]]);
  const p = { ...settings, systems: 1, musicMeasuresPerSystem: 1, centerTitle: 'Title' };
  const pages = draw(s, p);
  const first = pages[0].shapes.find(s => s.role === 'lyric' && s.text === 'for');
  const second = pages[1].shapes.filter(s => s.role === 'lyric');
  assert.ok(second.every(s => s.y - p.top === first.y - p.firstPageTop), 'same word height relative to each staff');
  assert.ok(pages[0].shapes.find(s => s.role === 'lyric' && s.text === 'sing').y < first.y, 'unrelated word keeps its closer baseline');
});

test('two-dot capsules across barlines tighten only as far as lyrics allow', () => {
  for (const [left, right] of [['for', 'ev'], ['considerably', 'longer-syllable']]) {
    const s = small([[[3, 64, 'before'], [1, 60, left, 'begin']], [[1, 60, right, 'middle'], [1, 55, 'er', 'end'], [2, 62, 'after']]]);
    const p = { ...settings, width: 1200 };
    const all = shapes(draw(s, p));
    const a = all.find(s => isDot(s) && s.eventId === 'm1e2');
    const b = all.find(s => isDot(s) && s.eventId === 'm2e1');
    const width = text => measureText(text, p.lyricSize, p.sansSerifFont, p.lyricFontWeight);
    const required = Math.max(2 * p.beatSpacing, (width(left) + width(right)) / 2 + width('-') + 16);
    assert.ok(Math.abs(b.x - a.x - required) < 1e-8, 'pair keeps only the rhythmic/lyric clearance it needs');
    const bar = all.find(s => s.role === 'barline' && s.x1 > a.x && s.x1 < b.x);
    assert.ok(Math.abs(bar.x1 - (a.x + b.x) / 2) < 1e-8, 'barline stays centered');
    const texts = all.filter(s => ['lyric', 'lyric-hyphen'].includes(s.role) && ['m1e2', 'm2e1'].includes(s.eventId)).sort((a, b) => a.x - b.x);
    for (let i = 1; i < texts.length; i++) assert.ok(texts[i - 1].x + width(texts[i - 1].text) <= texts[i].x, 'words and hyphens do not overlap');
    const split = draw(s, { ...p, musicMeasuresPerSystem: 1 });
    assert.ok(shapes(split).some(s => s.role === 'capsule-continued-right'), 'system breaks still use capsule continuation');
  }
});

test('default lyric clearance follows each word across page breaks without lowering neighboring words', () => {
  const s = small([[[4, 60, "ev'n"]], [[1, 60], [1, 53, 'the'], [1, 60, "sp'rit"], [1, 58, 'of']]]);
  const p = { ...settings, systems: 1, musicMeasuresPerSystem: 1 };
  const pages = draw(s, p);
  assert.equal(pages.length, 2);
  for (const page of pages) for (const text of page.shapes.filter(s => s.role === 'lyric')) {
    const dot = page.shapes.find(s => isDot(s) && s.eventId === text.eventId);
    assert.equal(text.y - p.lyricSize / 2 - (dot.y + p.capsuleHeight / 2), 14);
  }
  const outgoing = pages[0].shapes.find(s => s.role === 'lyric-continuation');
  const incoming = pages[1].shapes.find(s => s.role === 'lyric-continuation');
  assert.equal(outgoing.y1, incoming.y1, 'continuation retains the local lyric height');

});

test('saved lyrics reject local presentation overrides', () => {
  for (const field of [{ alignment: 'first-dot' }, { capsuleGap: 14 }, { y: 100 }]) {
    const s = small([[[4, 60, 'sing']]]);
    Object.assign(s.part.measures[0].events[0].lyrics[0], field);
    assert.throws(() => draw(s), /presentation overrides belong in a score-wide \.acn-layout\.json/);
  }
});

test('word placement is independent of measure numbers, event IDs, and text', () => {
  for (const transpose of [0, -5]) {
    const s = small([[[1, 60 + transpose, 'low'], [2, 67 + transpose, 'high'], [1, 60 + transpose, 'last']]]);
    s.part.measures[0].number = 73;
    s.part.measures[0].events.forEach((e, i) => { e.id = `arbitrary-${i}`; });
    const rendered = shapes(draw(s));
    for (const lyric of rendered.filter(s => s.role === 'lyric')) {
      const dot = rendered.find(s => isDot(s) && s.eventId === lyric.eventId);
      assert.equal(lyric.y - dot.y, settings.capsuleHeight / 2 + settings.lyricGap + settings.lyricSize / 2);
    }
  }
  const all = shapes(draw());
  const text = all.find(s => s.role === 'lyric' && s.eventId === 's3-v1-m19-e2');
  const dot = all.find(s => isDot(s) && s.eventId === text.eventId);
  assert.equal(text.y - dot.y, settings.capsuleHeight / 2 + settings.lyricGap + settings.lyricSize / 2);
});

test('score identity, event IDs, and absolute measure numbers do not affect engraving', () => {
  const renamed = structuredClone(score);
  renamed.metadata = { copyright: 'Another copyright' };
  renamed.source.file = 'unrelated-source.mscz';
  renamed.part.name = 'Selected voice';
  const ids = new Map();
  for (const m of renamed.part.measures) {
    m.number += 100;
    for (const e of m.events) {
      const id = `note-${ids.size}`;
      ids.set(e.id, id);
      e.id = id;
    }
  }
  for (const span of renamed.part.spans) {
    span.from = ids.get(span.from);
    span.to = ids.get(span.to);
  }
  for (const ending of renamed.repeatEndings) {
    ending.from.measure += 100;
    ending.to.measure += 100;
  }
  const engraving = pages => pages.map(({ title, description, shapes, ...page }) => ({
    ...page,
    shapes: shapes.map(({ eventId, ...shape }) => shape.role === 'measure-number' ? { ...shape, text: 'number' } : shape),
  }));
  assert.deepEqual(engraving(draw(renamed)), engraving(draw()));
});

test('lyric boxes fit within each system and text does not collide horizontally', () => {
  const pages = draw();
  for (const page of pages) {
    const texts = page.shapes.filter(s => s.role === 'lyric' || s.role === 'lyric-hyphen');
    for (const text of texts) {
      const right = text.x + measureText(text.text, settings.lyricSize, settings.sansSerifFont, settings.lyricFontWeight);
      assert.ok(right < settings.width - settings.margin, text.text);
      assert.ok(text.y + settings.lyricSize / 2 < settings.height - settings.margin, text.text);
      for (const other of texts) if (text !== other && Math.abs(other.y - text.y) < settings.lyricSize && other.x > text.x) assert.ok(right <= other.x, `${text.text} collides with ${other.text}`);
    }
  }
});

test('unsupported rhythmic subdivisions, missing beat unit, invalid timelines and out-of-range pitches fail explicitly', () => {
  for (const mutate of [
    s => { s.transcription.beatUnit = null; },
    s => { s.metadata.title = 'Must live in layout'; },
    s => { s.metadata.composer = 'Must live in layout'; },
    s => { s.part.measures[0].events[0].pitch.midi = 80; },
    s => { s.part.measures[0].events[0].onset = rational(1, 4); },
    s => { s.part.measures[1].meter.numerator = 3; },
    s => { s.part.spans[0].to = 'missing'; },
  ]) {
    const s = structuredClone(score); mutate(s); assert.throws(() => draw(s));
  }
  const s = small([[[0.25, 60], [3.75, 62]]]);
  assert.throws(() => draw(s), /whole and half/);
  assert.throws(() => parseScore({}), /formatVersion/);
});

test('required companion holds all titles, inherits defaults, and accepts explicit overrides', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'acn-overrides-'));
  try {
    const input = join(dir, 'piece.acn.json');
    const companion = join(dir, 'piece.acn-layout.json');
    await assert.rejects(loadLayout(undefined, input), /Cannot load layout.*piece\.acn-layout\.json/);
    await writeFile(companion, JSON.stringify({ centerTitle: 'Incomplete' }));
    await assert.rejects(loadLayout(undefined, input), /must contain leftTitle/);
    await writeFile(companion, JSON.stringify({ lyricSize: 18, leftTitle: '', centerTitle: 'Custom title', rightTitle: '', centerSubtitle: '' }));
    const actual = await loadLayout(undefined, input);
    const defaults = JSON.parse(await readFile('default-layout.json', 'utf8'));
    assert.equal(actual.pages, defaults.pages);
    assert.equal(actual.width, defaults.width);
    assert.equal(actual.lyricSize, 18);
    assert.equal(actual.centerTitle, 'Custom title');
    assert.equal(actual.centerSubtitle, '');
    assert.equal(actual.rightTitle, '');
    const explicit = join(dir, 'explicit.json');
    await writeFile(explicit, JSON.stringify({ lyricSize: 12 }));
    const selected = await loadLayout(explicit, input);
    assert.equal(selected.lyricSize, 12);
    assert.equal(selected.centerTitle, 'Custom title');
    await rm(companion);
    await assert.rejects(loadLayout(explicit, input), /Cannot load layout.*piece\.acn-layout\.json/);
    await writeFile(companion, '{bad');
    await assert.rejects(loadLayout(undefined, input), /Cannot load layout/);
    await assert.rejects(loadLayout(join(dir, 'missing.json'), input), /Cannot load layout/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI renders saved music without its source, writes only SVG and vector PDF, and keeps outputs on invalid input', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'acn-render-'));
  try {
    const input = join(dir, 'piece.acn.json');
    const s = structuredClone(score); s.source.file = '/does/not/exist.mscz';
    await writeFile(input, JSON.stringify(s));
    await writeFile(join(dir, 'piece.acn-layout.json'), JSON.stringify({ pages: 100, leftTitle: '', centerTitle: 'Override title', rightTitle: '', centerSubtitle: '' }));
    const run = () => spawnSync(process.execPath, ['dist/cli.js', '-r', input], { encoding: 'utf8' });
    const rendered = run();
    assert.equal(rendered.status, 0, rendered.stderr);
    const pdf = await readFile(join(dir, 'piece.pdf'), 'latin1');
    assert.match(pdf, /\/Count 2\b/);
    assert.doesNotMatch(pdf, /\/Subtype \/Image\b/);
    const svg = await readFile(join(dir, 'piece-page-1.svg'), 'utf8');
    assert.match(svg, /Override title/);
    assert.doesNotMatch(svg, /If Ye Love Me|Thomas Tallis/);
    await rm(join(dir, 'piece.acn-layout.json'));
    const missingLayout = run();
    assert.equal(missingLayout.status, 1);
    assert.match(missingLayout.stderr, /Cannot load layout.*piece\.acn-layout\.json/);
    assert.equal(await readFile(join(dir, 'piece-page-1.svg'), 'utf8'), svg);
    assert.equal(await readFile(join(dir, 'piece.pdf'), 'latin1'), pdf);
    assert.ok(!(await readdir(dir)).some(name => name.endsWith('.png')));
    s.transcription.beatUnit = null; await writeFile(input, JSON.stringify(s));
    assert.equal(run().status, 1);
    assert.equal(await readFile(join(dir, 'piece-page-1.svg'), 'utf8'), svg);
    assert.equal(await readFile(join(dir, 'piece.pdf'), 'latin1'), pdf);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
