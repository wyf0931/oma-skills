() => {
  // Component-level style extraction: buttons, form controls, surfaces, and
  // badges, each deduplicated by a style signature so you get one row per
  // distinct variant rather than one row per element.
  //
  // Each row carries the full recipe (background, text, border, radius, padding,
  // height, shadow, type) because component tokens in DESIGN.md need all of it.
  //
  // Returns: { buttons: [...], inputs: [...], surfaces: [...], badges: [...] }

  const MAX = 20;

  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      bg: cs.backgroundColor,
      color: cs.color,
      fontFamily: cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      radius: cs.borderRadius,
      padding: cs.padding,
      borderWidth: cs.borderWidth,
      borderStyle: cs.borderStyle,
      borderColor: cs.borderTopColor,
      shadow: cs.boxShadow === 'none' ? null : cs.boxShadow,
      display: cs.display,
      transition: cs.transitionDuration,
    };
  };

  const dedupe = (nodes, cap = MAX) => {
    const seen = new Map();
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (Number(cs.opacity) === 0) continue;

      const s = styleOf(el);
      const key = [s.bg, s.color, s.radius, s.fontSize, s.fontWeight, s.h, s.padding].join('|');
      if (seen.has(key)) continue;

      seen.set(key, {
        sample: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32),
        disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
        ...s,
      });
      if (seen.size >= cap) break;
    }
    return [...seen.values()];
  };

  const buttons = dedupe(document.querySelectorAll('button, a.btn, [role="button"], input[type="submit"], input[type="button"]'));

  const inputs = dedupe(
    document.querySelectorAll('input:not([type="hidden"]), textarea, select, [role="combobox"], [role="textbox"]'),
    15,
  );

  // Surfaces: elements that are visually a card/panel — rounded, bounded, and
  // large enough to hold content.
  const surfaceCandidates = document.querySelectorAll(
    'article, section > div, [class*="card"], [class*="Card"], [class*="panel"], [class*="Panel"], [class*="modal"], [class*="Modal"], [class*="dialog"], [class*="tile"], [class*="surface"]',
  );
  const surfaces = dedupe(surfaceCandidates, 15);

  const badges = dedupe(
    document.querySelectorAll('[class*="badge"], [class*="Badge"], [class*="tag"], [class*="Tag"], [class*="pill"], [class*="Pill"], [class*="chip"], [class*="Chip"], [class*="label"]'),
    15,
  );

  return { buttons, inputs, surfaces, badges };
}
