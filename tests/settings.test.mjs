import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { defaultLayout, parseLayout } from '../dist/settings.js';

test('layout file is valid, omitted settings use defaults, and invalid settings are rejected', async () => {
  parseLayout(JSON.parse(await readFile('layout.json', 'utf8')));
  assert.deepEqual(parseLayout({}), defaultLayout);
  for (const value of [null, [], { systems: 1.5 }, { systems: 0 }, { width: 100 },
    { systems: 20 }, { systemStep: 10 }, { serifFont: '' }, { typo: 1 }, { pages: 0 }, { pages: 1.5 }, { pitchIndexPages: 'never' }]) {
    assert.throws(() => parseLayout(value));
  }
});

test('CLI reads custom layout, preserves output on bad JSON, and overwrites both outputs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'acn-layout-'));
  try {
    const config = join(dir, 'custom layout.json');
    const svg = join(dir, 'blank.svg');
    const pdf = join(dir, 'blank.pdf');
    const run = (short = false) => spawnSync(process.execPath, ['dist/cli.js', ...(short ? ['-b', '-l', config, '-o', svg] : ['--blank', '--layout', config, '--output', svg])], { encoding: 'utf8' });
    await writeFile(config, JSON.stringify({ systems: 2, measuresPerSystem: 3, serifFont: 'Georgia, serif', measureNumberGap: 8 }));
    assert.equal(run().status, 0);
    const result = await readFile(svg, 'utf8');
    assert.equal(run(true).status, 0);
    assert.equal(await readFile(svg, 'utf8'), result);
    assert.match(result, /font-family="Georgia, serif"/);
    assert.match(result, />4<\/text>/);
    assert.doesNotMatch(result, />5<\/text>/);
    assert.equal((result.match(/<line /g) ?? []).length, 31);
    await writeFile(config, '{bad json');
    const invalid = run();
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /Cannot load layout/);
    assert.equal(await readFile(svg, 'utf8'), result);
    await writeFile(config, '{}');
    await writeFile(svg, 'stale');
    await writeFile(pdf, 'stale');
    assert.equal(run().status, 0);
    assert.match(await readFile(svg, 'utf8'), /<svg/);
    assert.equal((await readFile(pdf)).subarray(0, 5).toString(), '%PDF-');
    assert.ok(!(await readdir(dir)).some(name => name.endsWith('.png')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

 test('CLI requires named options and supports help aliases', () => {
  for (const flag of ['--help', '-h']) {
    const result = spawnSync(process.execPath, ['dist/cli.js', flag], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /--blank/);
  }
  for (const args of [[], ['blank'], ['--blank', 'output.svg'], ['--unknown'], ['--layout']]) {
    const result = spawnSync(process.execPath, ['dist/cli.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.trim());
  }
});

test('multiple-page CLI writes the configured pages with odd-page indexes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'acn-pages-'));
  try {
    const config = join(dir, 'layout.json');
    await writeFile(config, JSON.stringify({ pages: 4, pitchIndexPages: 'odd' }));
    const result = spawnSync(process.execPath, ['dist/cli.js', '-b', '-l', config, '-o', join(dir, 'score.svg')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const pdf = await readFile(join(dir, 'score.pdf'), 'latin1');
    assert.ok(pdf.startsWith('%PDF-'));
    assert.match(pdf, /\/Count 4\b/);
    assert.match(pdf, /\/MediaBox \[0 0 612 792\]/);
    assert.doesNotMatch(pdf, /\/Subtype \/Image\b/);
    for (let page = 1; page <= 4; page++) {
      const base = join(dir, page === 1 ? 'score' : `score-page-${page}`);
      const svg = await readFile(base + '.svg', 'utf8');
      assert.equal(svg.includes('>Middle C</text>'), page % 2 === 1);
      assert.ok(svg.includes(`>${(page - 1) * 20 + 1}</text>`));
      assert.ok(!(await readdir(dir)).some(name => name.endsWith('.png')));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
