import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseLayout, type LayoutSettings } from './settings.js';

export type ScoreTitles = Pick<LayoutSettings, 'leftTitle' | 'centerTitle' | 'rightTitle' | 'centerSubtitle'>;
const titleKeys = ['leftTitle', 'centerTitle', 'rightTitle', 'centerSubtitle'] as const;

export function scoreLayoutPath(scorePath: string): string {
  if (!/\.acn\.json$/i.test(scorePath)) throw new Error('Score path must end in .acn.json');
  return scorePath.replace(/\.acn\.json$/i, '.acn-layout.json');
}

async function readSettings(path: string): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Layout must be a JSON object.');
    return value as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Cannot load layout ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readScoreSettings(path: string): Promise<Record<string, unknown>> {
  const settings = await readSettings(path);
  if (!titleKeys.every(key => typeof settings[key] === 'string')) {
    throw new Error(`Score layout ${path} must contain leftTitle, centerTitle, rightTitle, and centerSubtitle strings; use empty strings to omit titles.`);
  }
  return settings;
}

/** Initialize a companion during import, preserving an existing score layout. */
export async function ensureScoreLayout(scorePath: string, titles: ScoreTitles): Promise<string> {
  const path = scoreLayoutPath(scorePath);
  try {
    await writeFile(path, JSON.stringify(titles, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    await readScoreSettings(path);
  }
  return path;
}

/** Shared defaults, required score companion, then optional explicit overrides. */
export async function loadLayout(overridePath?: string, scorePath?: string): Promise<LayoutSettings> {
  const defaultsPath = resolve('default-layout.json');
  const settings = { ...await readSettings(defaultsPath) };
  const companion = scorePath ? resolve(scoreLayoutPath(scorePath)) : undefined;
  if (companion) Object.assign(settings, await readScoreSettings(companion));
  const selected = overridePath ? resolve(overridePath) : undefined;
  if (selected && selected !== companion) Object.assign(settings, await readSettings(selected));
  try { return parseLayout(settings); }
  catch (error) { throw new Error(`Cannot load layout ${selected ?? companion ?? defaultsPath}: ${error instanceof Error ? error.message : String(error)}`); }
}
