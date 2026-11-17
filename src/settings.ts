// Lengths are SVG units: 96 units = one inch. These are presentation defaults.
export const defaultLayout = {
  pages: 1, pitchIndexPages: 'odd' as 'every' | 'even' | 'odd',
  leftTitle: '', centerTitle: '', rightTitle: '', centerSubtitle: '',
  width: 816, height: 1056, margin: 48, top: 64, firstPageTop: 88,
  systems: 5, systemStep: 190, semitoneStep: 7, guideWidth: 128,
  measuresPerSystem: 4, musicMeasuresPerSystem: 'auto' as 'auto' | number, measureStartPadding: 12, measureEndPadding: 12,
  staffLineWidth: 0.8, barLineWidth: 0.8,
  measureNumberSize: 12, measureNumberGap: 10, measureNumberInset: 12,
  pitchLabelSize: 9,
  lyricSize: 14, lyricFontWeight: 500, lyricGap: 14, lyricBackgroundOpacity: 0.85, lyricContinuationMinLength: 28,
  dotRadius: 3.8, capsuleHeight: 14, capsuleEndPadding: 10, beatSpacing: 18, wordDividerPadding: 4,
  sansSerifFont: 'Roboto, sans-serif',
  serifFont: 'Times New Roman, Times, serif',
};
export type LayoutSettings = typeof defaultLayout;

export function parseLayout(value: unknown, defaults: LayoutSettings = defaultLayout): LayoutSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Layout must be a JSON object.');
  }
  const result = { ...defaults };
  for (const [key, item] of Object.entries(value)) {
    if (!Object.hasOwn(defaultLayout, key)) throw new Error(`Unknown layout setting: ${key}`);
    const field = key as keyof LayoutSettings;
    if (typeof defaultLayout[field] === 'number') {
      if (typeof item !== 'number' || !Number.isFinite(item) || item <= 0) {
        throw new Error(`Layout setting ${key} must be a positive finite number.`);
      }
    } else if (key === 'musicMeasuresPerSystem') {
      if (item !== 'auto' && !(typeof item === 'number' && Number.isSafeInteger(item) && item > 0)) {
        throw new Error('Layout setting musicMeasuresPerSystem must be auto or a positive whole number.');
      }
    } else if (key === 'pitchIndexPages') {
      if (!['every', 'even', 'odd'].includes(item as string)) {
        throw new Error('Layout setting pitchIndexPages must be every, even, or odd.');
      }
    } else if (['leftTitle', 'centerTitle', 'rightTitle', 'centerSubtitle'].includes(key)) {
      if (typeof item !== 'string' || /[\r\n]/.test(item)) {
        throw new Error(`Layout setting ${key} must be a single-line string (or empty).`);
      }
    } else if (typeof item !== 'string' || !item.trim()) {
      throw new Error(`Layout setting ${key} must be a nonempty font-family string.`);
    }
    Object.assign(result, { [key]: item });
  }
  for (const key of ['pages', 'systems', 'measuresPerSystem'] as const) {
    if (!Number.isInteger(result[key])) throw new Error(`Layout setting ${key} must be a whole number.`);
  }
  if (![400, 500, 600, 700].includes(result.lyricFontWeight)) throw new Error('lyricFontWeight must be 400, 500, 600, or 700.');
  if (result.lyricBackgroundOpacity > 1) throw new Error('lyricBackgroundOpacity must be at most 1.');
  if (result.capsuleHeight < 2 * result.dotRadius + 2) throw new Error('Capsule height must leave room around dots.');
  const hasTitles = [result.leftTitle, result.centerTitle, result.rightTitle, result.centerSubtitle].some(Boolean);
  const firstTop = hasTitles ? result.firstPageTop : result.top;
  if (hasTitles &&
      firstTop - result.measureNumberGap - result.measureNumberSize - 32 < 0) {
    throw new Error('Not enough space above the staff for titles. Increase firstPageTop.');
  }
  const staffHeight = 20 * result.semitoneStep;
  if (result.guideWidth < 120 || result.width - 2 * result.margin <= result.guideWidth) {
    throw new Error('Pitch index needs guideWidth >= 120 and space for measures inside the page margins.');
  }
  if (result.top - result.measureNumberGap - result.measureNumberSize < 0 ||
      Math.max(result.top, firstTop) + (result.systems - 1) * result.systemStep + staffHeight + 7 > result.height - result.margin) {
    throw new Error('Staffs or labels do not fit vertically on the page. Adjust height, top, firstPageTop, margin, systems, or systemStep.');
  }
  if (result.systems > 1 && result.systemStep <= staffHeight + result.measureNumberGap + result.measureNumberSize) {
    throw new Error('Systems overlap. Increase systemStep or decrease semitoneStep.');
  }
  return result;
}
