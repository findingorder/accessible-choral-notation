import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bundledFace } from './font-families.js';
import type { PageScene } from './layout.js';

export function bundledFontPath(family: string): string | undefined {
  const face = bundledFace(family);
  return face && fileURLToPath(new URL(`../assets/fonts/${face.file}`, import.meta.url));
}
/** Embed only faces used by this page so SVGs do not depend on installed fonts. */
export function embeddedFontCss(page: PageScene): string {
  const families = new Set([page.fontFamily, ...page.shapes.flatMap(s => s.kind === 'text' && s.fontFamily ? [s.fontFamily] : [])]);
  const embedded = new Set<string>();
  return [...families].flatMap(family => {
    const face = bundledFace(family), path = bundledFontPath(family);
    if (!face || !path || embedded.has(face.family)) return [];
    embedded.add(face.family);
    return [`@font-face { font-family: '${face.family}'; font-style: normal; font-weight: ${face.weight}; src: url(data:font/ttf;base64,${readFileSync(path).toString('base64')}) format('truetype'); }`];
  }).join('\n');
}
