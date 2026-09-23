() => {
  // Page-shell extraction: the structural frame that DESIGN.md's Layout section
  // needs. Captures container widths, the nav/sidebar geometry, the main
  // content measure, and the observed spacing rhythm.
  //
  // Returns: { viewport, body, containers: [...], nav, sidebar, main, sections: [...] }

  const box = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      className: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
      width: Math.round(r.width),
      height: Math.round(r.height),
      top: Math.round(r.top),
      bg: cs.backgroundColor,
      color: cs.color,
      padding: cs.padding,
      margin: cs.margin,
      maxWidth: cs.maxWidth,
      gap: cs.gap,
      display: cs.display,
      flexDirection: cs.flexDirection,
      gridTemplateColumns: cs.gridTemplateColumns.slice(0, 120),
      position: cs.position,
      zIndex: cs.zIndex,
    };
  };

  // Containers: elements that constrain the content measure.
  const containers = [];
  const seenWidths = new Set();
  for (const el of document.querySelectorAll('main, main *, [class*="container"], [class*="wrapper"], [class*="Container"]')) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 320) continue;
    const mw = cs.maxWidth;
    if (mw === 'none' && !/container|wrapper/i.test(String(el.className))) continue;
    const key = `${mw}|${Math.round(r.width)}`;
    if (seenWidths.has(key)) continue;
    seenWidths.add(key);
    containers.push({ maxWidth: mw, width: Math.round(r.width), className: String(el.className).slice(0, 50) });
    if (containers.length >= 12) break;
  }

  const nav = box(document.querySelector('header, nav, [role="banner"], [class*="navbar"]'));
  const sidebar = box(
    document.querySelector('aside, [role="complementary"], [class*="sidebar"], [class*="Sidebar"]'),
  );
  const main = box(document.querySelector('main, [role="main"]'));

  // Top-level sections, in document order — the spine of the page.
  const sections = [];
  const root = document.querySelector('main') || document.body;
  for (const child of root.children) {
    const r = child.getBoundingClientRect();
    if (r.height < 60) continue;
    const cs = getComputedStyle(child);
    sections.push({
      tag: child.tagName.toLowerCase(),
      className: String(child.className).slice(0, 50),
      top: Math.round(r.top + scrollY),
      height: Math.round(r.height),
      padding: cs.padding,
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage === 'none' ? null : cs.backgroundImage.slice(0, 80),
      heading: (child.querySelector('h1, h2, h3')?.textContent || '').trim().slice(0, 40),
    });
    if (sections.length >= 14) break;
  }

  // Observed vertical rhythm between top-level sections, computed from real
  // geometry rather than guessed from a spacing scale.
  const rhythm = [];
  for (let i = 1; i < sections.length; i++) {
    const delta = sections[i].top - (sections[i - 1].top + sections[i - 1].height);
    if (delta > 0) rhythm.push(delta);
  }

  return {
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    body: box(document.body),
    containers,
    nav,
    sidebar,
    main,
    sections,
    sectionRhythm: rhythm,
    scrollHeight: document.documentElement.scrollHeight,
  };
}
