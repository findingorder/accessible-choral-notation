import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { zipSync, strToU8 } from 'fflate';
import { readMuseScore, importMuseScore, importMuseScoreTitles } from '../dist/musescore.js';
import { rational, addTime, equalTime } from '../dist/score.js';

const sourcePath = 'scores/Tallis - If Ye Love Me/input/If Ye Love Me - Tallis - Original.mscz';
const native = await readMuseScore(sourcePath);
const tenor = importMuseScore(native, 'Tenor');

test('Tallis native main score lists four parts, excluding the embedded extracted part', () => {
  assert.deepEqual(native.parts.map(p => p.name), ['Sopraan', 'Alt', 'Tenor', 'Bas']);
  assert.equal(native.source.version, '3.01');
  assert.equal(native.source.programVersion, '3.5.0');
  assert.equal(native.source.archiveEntry, 'temp_8929.mscx');
  assert.deepEqual(native.parts[2].voices, [1]);
  assert.deepEqual(native.parts[3].voices, [1, 2]);
  assert.throws(() => importMuseScore(native, 'Missing'), /unique part/);
  assert.throws(() => importMuseScore(native, 'Tenor', 2), /Voice/);
});

test('Tallis tenor preserves exact timing, sounding pitches, text, and syllabification', () => {
  assert.deepEqual(tenor.metadata, { copyright: 'CM 21/02/2015' });
  assert.deepEqual(importMuseScoreTitles(native, tenor.part.name), { leftTitle: '', centerTitle: 'If Ye Love Me', rightTitle: 'Thomas Tallis (vers 1505-1585)', centerSubtitle: 'Tenor' });
  assert.equal(tenor.part.measures.length, 27);
  const events = tenor.part.measures.flatMap(m => m.events);
  assert.equal(events.filter(e => e.kind === 'note').length, 76);
  assert.equal(events.filter(e => e.kind === 'rest').length, 4);
  assert.equal(events.flatMap(e => e.lyrics).length, 69);
  assert.deepEqual(tenor.part.measures[0].events.map(e => [e.pitch.midi, e.duration, e.lyrics[0].text]), [
    [57, rational(3, 4), 'If'], [53, rational(1, 4), 'ye'],
  ]);
  assert.deepEqual(tenor.part.measures[5].events.map(e => e.duration), [rational(1, 4), rational(1, 4), rational(3, 8), rational(1, 8)]);
  assert.equal(tenor.part.measures[2].events[3].lyrics[0].syllabic, 'begin');
  assert.equal(tenor.part.measures[17].events[2].pitch.name, 'B');
  assert.equal(Math.min(...events.filter(e => e.pitch).map(e => e.pitch.midi)), 53);
  assert.equal(Math.max(...events.filter(e => e.pitch).map(e => e.pitch.midi)), 67);
  for (const measure of tenor.part.measures) {
    assert.ok(equalTime(measure.duration, rational(1)));
    let cursor = rational(0);
    for (const event of measure.events) {
      assert.deepEqual(event.onset, cursor);
      cursor = addTime(cursor, event.duration);
    }
    assert.deepEqual(cursor, measure.duration);
  }
  assert.equal(tenor.transcription.beatUnit, null);
  assert.deepEqual(importMuseScore(native, '3'), tenor);
});

test('ties, slurs, top-staff rehearsal letters, and repeats survive tenor selection', () => {
  assert.equal(tenor.part.spans.filter(s => s.kind === 'tie').length, 4);
  assert.equal(tenor.part.spans.filter(s => s.kind === 'slur').length, 2);
  assert.deepEqual(tenor.part.spans[0], { kind: 'tie', from: 's3-v1-m2-e2', to: 's3-v1-m3-e1' });
  assert.deepEqual(tenor.part.measures.flatMap(m => m.directions.map(d => [m.number, d.text])), [[5, 'A'], [9, 'B'], [14, 'C'], [20, 'D']]);
  assert.equal(tenor.part.measures[13].startRepeat, true);
  assert.equal(tenor.part.measures[25].repeatCount, 2);
  assert.deepEqual(tenor.repeatEndings.map(e => [e.numbers, e.from.measure, e.to.measure, e.to.onset]), [
    [[1], 26, 27, rational(0)], [[2], 27, 27, rational(1)],
  ]);
  assert.equal(tenor.part.measures.at(-1).endBarline, 'end');
});

function fixture(body, version = '3.01') {
  return `<museScore version="${version}"><Score><Part><Staff id="1"/><trackName>Tenor</trackName></Part><Staff id="1"><Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig>${body}</voice></Measure></Staff></Score></museScore>`;
}
const chord = '<Chord><durationType>whole</durationType><Note><pitch>60</pitch><tpc>14</tpc></Note></Chord>';

test('native archive manifest selects the main XML; ambiguous music fails explicitly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'acn-native-'));
  try {
    const archive = join(dir, 'test.mscz');
    await writeFile(archive, zipSync({
      'wrong.mscx': strToU8('<bad/>'),
      'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="score/main.mscx"/></rootfiles></container>'),
      'score/main.mscx': strToU8(fixture(chord)),
    }));
    assert.equal(importMuseScore(await readMuseScore(archive), 'Tenor').part.measures[0].events[0].pitch.midi, 60);
    const xmlPath = join(dir, 'test.mscx');
    for (const [body, message] of [
      [chord.replace('</Chord>', '<Note><pitch>64</pitch></Note></Chord>'), /monophonic/],
      [chord.replace('<durationType>', '<Tuplet>1</Tuplet><durationType>'), /Unsupported Tuplet/],
      [chord.replace('whole', 'half'), /do not fill/],
      [chord.replace('<pitch>60</pitch>', '<pitch>200</pitch>'), /Pitch out of range/],
    ]) {
      await writeFile(xmlPath, fixture(body));
      const score = await readMuseScore(xmlPath);
      assert.throws(() => importMuseScore(score, 'Tenor'), message);
    }
    await writeFile(xmlPath, fixture(chord, '4.0'));
    await assert.rejects(readMuseScore(xmlPath), /MuseScore 3/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI imports music and a companion layout, preserves edited titles on reimport, and requires a part', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'acn-import-'));
  try {
    const output = join(dir, 'tenor.acn.json');
    const args = ['dist/cli.js', '-i', sourcePath];
    const missingPart = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(missingPart.status, 1);
    assert.match(missingPart.stderr, /Specify --part/);
    const result = spawnSync(process.execPath, [...args, '-p', 'Tenor', '-o', output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), tenor);
    const layoutPath = join(dir, 'tenor.acn-layout.json');
    assert.deepEqual(JSON.parse(await readFile(layoutPath, 'utf8')), importMuseScoreTitles(native, 'Tenor'));
    const editedLayout = { ...importMuseScoreTitles(native, 'Tenor'), centerTitle: 'Edited title', lyricSize: 16 };
    await writeFile(layoutPath, JSON.stringify(editedLayout));
    const withBeat = spawnSync(process.execPath, [...args, '-p', 'Tenor', '-u', '1/4', '-o', output], { encoding: 'utf8' });
    assert.equal(withBeat.status, 0, withBeat.stderr);
    assert.deepEqual(JSON.parse(await readFile(layoutPath, 'utf8')), editedLayout);
    const chosen = JSON.parse(await readFile(output, 'utf8'));
    assert.deepEqual(chosen.transcription.beatUnit, rational(1, 4));
    assert.deepEqual(chosen.part, tenor.part);
    for (const beat of ['0/1', 'bad', '-1/4']) {
      const invalid = spawnSync(process.execPath, [...args, '-p', 'Tenor', `--beat=${beat}`, '-o', output], { encoding: 'utf8' });
      assert.equal(invalid.status, 1);
      assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), chosen);
    }
    const inspect = spawnSync(process.execPath, [...args, '-s'], { encoding: 'utf8' });
    assert.equal(JSON.parse(inspect.stdout).parts.length, 4);
    const combined = spawnSync(process.execPath, [...args, '-b'], { encoding: 'utf8' });
    assert.equal(combined.status, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
