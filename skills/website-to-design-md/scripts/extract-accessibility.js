() => {
  // Accessibility audit: text contrast, focus-visible affordance, target size,
  // and accessible names.
  //
  // DESIGN.md can carry an explicit accessibility contract in its prose and
  // Do's/Don'ts. These are the numbers that make that contract honest: which
  // text actually fails WCAG, whether focus is visible, and which controls are
  // too small to hit.
  //
  // Contrast is computed with alpha compositing — most "muted text" is a solid
  // colour at partial opacity over a surface, and ignoring the alpha produces
  // the wrong ratio. The effective background is found by walking ancestors
  // until an opaque layer is reached.
  //
  // Returns: { contrast: {...}, targetSize: {...}, focus: {...}, names: {...} }

  const MAX_FAILURES = 25;
  const MAX_SAMPLE = 900;

  // ── colour helpers ───────────────────────────────────────────────

  const parseRgb = (s) => {
    const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/.exec(s);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  };

  const lum = ({ r, g, b }) => {
    const f = (c) => {
      const x = c / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const contrast = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  const WHITE = { r: 255, g: 255, b: 255, a: 1 };

  // Resolve the painted background behind an element, and report whether an
  // image sits anywhere in that chain. Contrast against a photograph is not
  // computable from computed styles, so the caller must skip those rather than
  // compare against the fallback colour and invent a failure.
  const effectiveBg = (el) => {
    const layers = [];
    let node = el;
    let hasImage = false;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') hasImage = true;
      const bg = parseRgb(cs.backgroundColor);
      if (bg && bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 0.95) break;
      }
      node = node.parentElement;
    }
    let acc = WHITE;
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return { color: acc, hasImage };
  };

  const rendersOwnText = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  };

  // Media that sits *behind* text is a second blind spot. A hero video or an
  // absolutely-positioned <img> paints under the copy but never shows up as a
  // CSS background-image, so the ancestor walk reports the page colour and
  // white-on-photo text looks like white-on-white. Collect those rects once —
  // scanning per element would make this quadratic.
  const mediaRects = [];
  for (const m of document.querySelectorAll('video, canvas, picture, img')) {
    const cs = getComputedStyle(m);
    if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
    const r = m.getBoundingClientRect();
    if (r.width > 40 && r.height > 40) mediaRects.push({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  }
  const overlapsMedia = (l, t, r, b) =>
    mediaRects.some((m) => m.l < r && m.r > l && m.t < b && m.b > t);

  // ── contrast audit ───────────────────────────────────────────────

  const failures = [];
  let sampled = 0;
  let passing = 0;
  let skippedTransparent = 0;
  let skippedImageBg = 0;

  const textEls = document.querySelectorAll('p, span, a, li, td, th, h1, h2, h3, h4, h5, h6, label, button, div');
  for (const el of textEls) {
    if (sampled >= MAX_SAMPLE) break;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (Number(cs.opacity) === 0) continue;
    if (!rendersOwnText(el)) continue;

    const fg = parseRgb(cs.color);
    if (!fg) continue;

    // `color: transparent` is usually an icon font or gradient-clipped text;
    // it has no contrast to measure. Chromium exposes the real fill via
    // -webkit-text-fill-color, which gradient text sets to transparent.
    if (fg.a === 0 || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)') {
      skippedTransparent++;
      continue;
    }

    const bgInfo = effectiveBg(el);
    if (bgInfo.hasImage || overlapsMedia(rect.left, rect.top, rect.right, rect.bottom)) {
      skippedImageBg++;
      continue;
    }

    sampled++;

    const bg = bgInfo.color;
    const fgSolid = fg.a >= 1 ? fg : over(fg, bg);
    const ratio = contrast(fgSolid, bg);

    const sizePx = parseFloat(cs.fontSize) || 16;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const isLarge = sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
    const required = isLarge ? 3 : 4.5;

    if (ratio + 0.01 < required) {
      if (failures.length < MAX_FAILURES) {
        failures.push({
          sample: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 36),
          tag: el.tagName.toLowerCase(),
          fontSize: cs.fontSize,
          fontWeight: weight,
          textColor: cs.color,
          background: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          ratio: Math.round(ratio * 100) / 100,
          required,
          isLarge,
        });
      }
    } else {
      passing++;
    }
  }

  // ── target size (WCAG 2.2 AA 2.5.8 = 24x24 CSS px) ───────────────

  const interactive = document.querySelectorAll(
    'a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  let below24 = 0;
  let below44 = 0;
  let measured = 0;
  const smallest = [];

  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    measured++;
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (w < 24 || h < 24) {
      below24++;
      if (smallest.length < 12) {
        smallest.push({
          tag: el.tagName.toLowerCase(),
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24),
          w,
          h,
        });
      }
    } else if (w < 44 || h < 44) {
      below44++;
    }
  }

  // ── focus visibility ─────────────────────────────────────────────

  const focusRules = [];
  let removesOutline = 0;
  let focusRuleCount = 0;

  const walkFocus = (list) => {
    if (!list) return;
    for (const rule of list) {
      if (rule.selectorText && /:focus/.test(rule.selectorText)) {
        const s = rule.style;
        focusRuleCount++;
        const outlineNone = /outline\s*:\s*(none|0(px)?)\b/.test(s.cssText || '') || s.outlineStyle === 'none';
        if (outlineNone) removesOutline++;
        if (focusRules.length < 15) {
          focusRules.push({
            selector: rule.selectorText.slice(0, 70),
            outline: (s.outline || `${s.outlineWidth || ''} ${s.outlineStyle || ''} ${s.outlineColor || ''}`).trim() || null,
            outlineOffset: s.outlineOffset || null,
            boxShadow: s.boxShadow ? s.boxShadow.slice(0, 60) : null,
            removesOutline: outlineNone,
          });
        }
      }
      if (rule.cssRules) walkFocus(rule.cssRules);
    }
  };

  for (const sheet of document.styleSheets) {
    try {
      walkFocus(sheet.cssRules);
    } catch {
      /* cross-origin */
    }
  }

  // ── accessible names ─────────────────────────────────────────────

  const hasName = (el) => {
    if (el.getAttribute('aria-label')?.trim()) return true;
    if (el.getAttribute('title')?.trim()) return true;
    if (el.textContent?.trim()) return true;
    if (el.querySelector('img[alt]:not([alt=""])')) return true;
    if (el.getAttribute('aria-labelledby')) return true;
    return false;
  };

  const unnamedButtons = [];
  for (const b of document.querySelectorAll('button, [role="button"], a[href]')) {
    if (!hasName(b) && unnamedButtons.length < 10) {
      unnamedButtons.push({ tag: b.tagName.toLowerCase(), html: b.outerHTML.slice(0, 70) });
    }
  }

  const images = [...document.querySelectorAll('img')];
  const imagesMissingAlt = images.filter((i) => !i.hasAttribute('alt')).length;
  const imagesEmptyAlt = images.filter((i) => i.getAttribute('alt') === '').length;

  const htmlLang = document.documentElement.getAttribute('lang') || null;
  const structure = {
    hasMain: !!document.querySelector('main, [role="main"]'),
    hasNav: !!document.querySelector('nav, [role="navigation"]'),
    headingOrder: (() => {
      const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => +h.tagName[1]);
      let skips = 0;
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i - 1] > 1) skips++;
      }
      return { levels: levels.slice(0, 12), skips, h1Count: levels.filter((l) => l === 1).length };
    })(),
  };

  return {
    contrast: {
      sampled,
      passing,
      failing: failures.length,
      failRate: sampled ? Math.round((failures.length / sampled) * 1000) / 10 : 0,
      skippedTransparent,
      skippedImageBackground: skippedImageBg,
      failures,
      capped: failures.length >= MAX_FAILURES,
    },
    targetSize: {
      measured,
      below24x24: below24,
      below44x44: below44,
      smallest,
    },
    focus: {
      focusRuleCount,
      removesOutline,
      rules: focusRules,
    },
    names: {
      imagesTotal: images.length,
      imagesMissingAlt,
      imagesEmptyAlt,
      unnamedInteractive: unnamedButtons,
    },
    document: { lang: htmlLang, ...structure },
  };
}
