() => {
  // Census of text styles, grouped by semantic role.
  //
  // Instead of dumping every element, this samples headings, paragraphs, links,
  // labels, and buttons, then deduplicates by (size, weight, line-height,
  // letter-spacing) signature and keeps a real text sample for each. That gives
  // you a ready-made type scale with evidence for which token is a headline and
  // which is a caption.
  //
  // Returns: { headings: [...], body: [...], links: [...], buttons: [...], mono: [...] }

  const MAX = 24;

  const sig = (cs) =>
    [cs.fontSize, cs.fontWeight, cs.lineHeight, cs.letterSpacing].join('|');

  const collect = (nodes, cap = MAX) => {
    const seen = new Map();
    for (const el of nodes) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;

      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!text) continue;

      const key = sig(cs);
      if (seen.has(key)) continue;

      seen.set(key, {
        tag: el.tagName.toLowerCase(),
        sample: text.slice(0, 48),
        fontFamily: cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
        textTransform: cs.textTransform,
        fontFeature: cs.fontFeatureSettings,
        count: 1,
      });
      if (seen.size >= cap) break;
    }
    return [...seen.values()];
  };

  const headings = collect(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const body = collect(
    document.querySelectorAll('p, li, dd, blockquote, figcaption, td, .prose p'),
    20,
  );
  const links = collect(document.querySelectorAll('a[href]'), 12);
  const buttons = collect(document.querySelectorAll('button, [role="button"], .btn'), 12);
  const mono = collect(document.querySelectorAll('code, pre, kbd, samp, [class*="mono"]'), 10);

  // The single most common body font is almost always the primary typeface.
  const familyCount = new Map();
  for (const el of document.querySelectorAll('p, span, li, div')) {
    const cs = getComputedStyle(el);
    if (!(el.textContent || '').trim()) continue;
    const f = cs.fontFamily.split(',')[0].trim();
    familyCount.set(f, (familyCount.get(f) || 0) + 1);
  }
  const primaryFamily = [...familyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { primaryFamily, headings, body, links, buttons, mono };
}
