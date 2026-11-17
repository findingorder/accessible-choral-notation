import type { PageScene, Shape } from './layout.js';

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function renderShapeBody(s: Shape): string {
  switch (s.kind) {
    case 'path': return `<path d="${escapeXml(s.d)}" fill="${escapeXml(s.fill)}"/>`;
    case 'line': return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${escapeXml(s.color)}" stroke-width="${s.width}"/>`;
    case 'rect': return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${escapeXml(s.fill)}"${s.opacity === undefined ? '' : ` fill-opacity="${s.opacity}"`}${s.radius === undefined ? '' : ` rx="${s.radius}"`}${s.stroke === undefined ? '' : ` stroke="${escapeXml(s.stroke)}" stroke-width="${s.strokeWidth ?? 1}"`}/>`;
    case 'ellipse': return `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.rx}" ry="${s.ry}" fill="${escapeXml(s.fill ?? 'white')}" stroke="${escapeXml(s.stroke ?? '#666666')}" stroke-width="0.7"/>`;
    case 'text': return `<text x="${s.x}" y="${s.y + s.size * 0.35}" font-size="${s.size}" text-anchor="${s.anchor ?? 'middle'}"${s.italic ? ' font-style="italic"' : ''}${s.bold ? ' font-weight="bold"' : ''}${s.fontWeight === undefined ? '' : ` font-weight="${s.fontWeight}"`}${s.fontFamily === undefined ? '' : ` font-family="${escapeXml(s.fontFamily)}"`}>${escapeXml(s.text)}</text>`;
  }
}

function renderShape(s: Shape): string {
  const body = renderShapeBody(s);
  if (!s.role && !s.eventId) return body;
  return `<g${s.role ? ` data-role="${escapeXml(s.role)}"` : ''}${s.eventId ? ` data-event-id="${escapeXml(s.eventId)}"` : ''}>${body}</g>`;
}

export function renderSvg(page: PageScene, fontCss = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${page.width / 96}in" height="${page.height / 96}in" viewBox="0 0 ${page.width} ${page.height}" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(page.title ?? 'Blank ACN tenor staffs')} — page ${page.pageNumber}</title>
  <desc id="description">${escapeXml(page.description ?? `Blank chromatic staffs from C3 to G+4, ${page.hasPitchIndex ? "with a pitch index on the first staff" : "without a pitch index"}, measure divisions, and starting measure numbers above each staff. C lines are black, E lines red, G+ lines blue; other pitch lines are gray.`)}</desc>
  ${fontCss ? `<style>${fontCss}</style>` : ''}
  <rect width="${page.width}" height="${page.height}" fill="white"/>
  <g font-family="${escapeXml(page.fontFamily)}" fill="#202020">
${page.shapes.map(s => `    ${renderShape(s)}`).join('\n')}
  </g>
</svg>
`;
}
