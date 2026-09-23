() => {
  // Census of every visual primitive in use on the page: colors, font
  // families/sizes/weights, line heights, letter spacings, radii, paddings,
  // margins, gaps, border widths, and background images.
  //
  // Everything is deduplicated at the source so the payload stays small — this
  // is the single most important defence against the 50KB MCP output limit.
  // Values are sorted by frequency, so the head of each list is the core system
  // and the tail is almost always one-off noise.
  //
  // Returns: { elementCount, colors: [{value,count}], fontFamilies: [...], ... }

  const MAX_PER_LIST = 60;
  const MAX_DEEP = 40;

  const bump = (map, key) => {
    if (!key || key === 'none' || key === 'normal' || key === 'auto') return;
    if (key === 'rgba(0, 0, 0, 0)' || key === 'transparent') return;
    map.set(key, (map.get(key) || 0) + 1);
  };

  const colors = new Map();
  const fonts = new Map();
  const sizes = new Map();
  const weights = new Map();
  const lineHeights = new Map();
  const letterSpacings = new Map();
  const radii = new Map();
  const paddings = new Map();
  const margins = new Map();
  const gaps = new Map();
  const borders = new Map();
  const shadows = new Map();
  const bgImages = new Map();

  const els = document.querySelectorAll('*');

  // `rgb(0, 0, 0)` is the untouched browser default, inherited by thousands of
  // layout wrappers. A real design system sets its text colour explicitly (and
  // if it truly uses pure black, the token scan will have captured it), so
  // dropping it keeps the ranking about design decisions rather than defaults.
  const DEFAULTS = new Set(['rgb(0, 0, 0)', 'rgba(0, 0, 0, 0)', 'transparent', 'black']);

  for (const el of els) {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    if (!DEFAULTS.has(cs.color)) bump(colors, cs.color);
    bump(colors, cs.backgroundColor);
    bump(colors, cs.borderTopColor);
    if (cs.fill && cs.fill !== 'none' && !DEFAULTS.has(cs.fill)) bump(colors, cs.fill);

    bump(fonts, cs.fontFamily);
    bump(sizes, cs.fontSize);
    bump(weights, cs.fontWeight);
    bump(lineHeights, cs.lineHeight);
    bump(letterSpacings, cs.letterSpacing);

    bump(radii, cs.borderRadius);
    bump(paddings, cs.padding);
    bump(margins, cs.margin);
    bump(gaps, cs.gap);
    bump(borders, cs.borderWidth);
    bump(shadows, cs.boxShadow);
    if (cs.backgroundImage !== 'none') bump(bgImages, cs.backgroundImage.slice(0, 160));
  }

  const ranked = (map, cap = MAX_PER_LIST) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([value, count]) => ({ value, count }));

  return {
    elementCount: els.length,
    colors: ranked(colors),
    colorCount: colors.size,
    fontFamilies: ranked(fonts, 12),
    fontSizes: ranked(sizes, MAX_DEEP),
    fontWeights: ranked(weights, 12),
    lineHeights: ranked(lineHeights, MAX_DEEP),
    letterSpacings: ranked(letterSpacings, 20),
    borderRadiuses: ranked(radii, MAX_DEEP),
    paddings: ranked(paddings, MAX_DEEP),
    margins: ranked(margins, MAX_DEEP),
    gaps: ranked(gaps, 20),
    borderWidths: ranked(borders, 12),
    boxShadows: ranked(shadows, 20),
    backgroundImages: ranked(bgImages, 12),
    counts: {
      uniqueColors: colors.size,
      uniqueFontSizes: sizes.size,
      uniqueRadii: radii.size,
      uniqueGaps: gaps.size,
    },
  };
}
