// Distinct family aliases preserve intermediate weights through SVG-to-PDF's
// regular/bold-only callback. Each alias names a real bundled static font.
export const bundledFaces = [
  { weight: 400, family: 'Roboto', file: 'Roboto-Regular.ttf' },
  { weight: 500, family: 'ACN Roboto Medium', file: 'Roboto-Medium.ttf' },
  { weight: 600, family: 'ACN Roboto SemiBold', file: 'Roboto-SemiBold.ttf' },
  { weight: 700, family: 'ACN Roboto Bold', file: 'Roboto-Bold.ttf' },
] as const;
export function bundledFace(family: string) {
  const first = family.split(',')[0].trim().replace(/^["']|["']$/g, '');
  return bundledFaces.find(face => face.family === first);
}
export function weightedFamily(family: string, weight = 400): string {
  if (!bundledFace(family)) return family;
  return bundledFaces.find(face => face.weight === weight)?.family ?? family;
}
