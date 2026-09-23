() => {
  // Motion system: transition durations, easing curves, animated properties,
  // keyframe names, and whether the site honours prefers-reduced-motion.
  //
  // DESIGN.md has no fixed motion token group, but the spec allows any section —
  // so this output belongs in a free-form `## Motion` block. Record the easing
  // curves, not just the durations: the curve is what carries the personality
  // (a snappy cubic-bezier reads completely differently from a gentle ease-out).
  //
  // Returns: { durations, easings, properties, animations, keyframes,
  //            motionVariables, reducedMotion, stats }

  const MAX = 20;

  const durations = new Map();
  const easings = new Map();
  const properties = new Map();
  const animations = new Map();
  const delays = new Map();
  const motionVariables = new Map();

  const bump = (map, key, cap = 120) => {
    if (!key) return;
    const k = key.slice(0, cap);
    map.set(k, (map.get(k) || 0) + 1);
  };

  // A transition of `0s` is the implicit default, not a design decision.
  const isZero = (v) => /^0s?$/.test(String(v).trim()) || /^0s(,\s*0s)*$/.test(String(v).trim());

  for (const el of document.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const cs = getComputedStyle(el);

    if (cs.transitionDuration && !isZero(cs.transitionDuration)) {
      bump(durations, cs.transitionDuration);
      bump(easings, cs.transitionTimingFunction);
      bump(properties, cs.transitionProperty);
      if (cs.transitionDelay && !isZero(cs.transitionDelay)) bump(delays, cs.transitionDelay);
    }

    if (cs.animationName && cs.animationName !== 'none') {
      bump(animations, `${cs.animationName} ${cs.animationDuration} ${cs.animationTimingFunction}`);
    }
  }

  // Motion tokens the site declares itself, plus keyframes and the
  // reduced-motion contract — all of which live in stylesheets.
  const keyframes = new Set();
  const mediaConditions = new Set();
  let sheets = 0;
  let blocked = 0;

  // Match by dash-segment rather than by prefix: token names are namespaced
  // (`--acme-web-motion-ease-out`), so anchoring at the start misses them.
  const MOTION_SEGMENTS = new Set([
    'motion', 'ease', 'easing', 'duration', 'transition', 'timing',
    'animation', 'bezier', 'delay', 'speed',
  ]);
  const looksMotiony = (name) =>
    name.replace(/^--/, '').split('-').some((s) => MOTION_SEGMENTS.has(s.toLowerCase()));

  const walk = (list) => {
    if (!list) return;
    for (const rule of list) {
      // CSSKeyframesRule
      if (rule.name && rule.cssRules && !rule.selectorText) keyframes.add(rule.name);
      // CSSMediaRule / CSSSupportsRule / CSSConditionRule
      if (rule.conditionText) mediaConditions.add(rule.conditionText.slice(0, 80));

      const style = rule.style;
      if (style) {
        for (let i = 0; i < style.length; i++) {
          const name = style[i];
          if (typeof name !== 'string' || !name.startsWith('--')) continue;
          if (!looksMotiony(name)) continue;
          const value = style.getPropertyValue(name).trim();
          if (value) motionVariables.set(name, value.slice(0, 100));
        }
      }
      if (rule.cssRules) walk(rule.cssRules);
    }
  };

  for (const sheet of document.styleSheets) {
    sheets++;
    try {
      walk(sheet.cssRules);
    } catch {
      blocked++;
    }
  }

  // Runtime-injected motion variables on the root scope.
  const cs = getComputedStyle(document.documentElement);
  for (let i = 0; i < cs.length; i++) {
    const name = cs[i];
    if (typeof name !== 'string' || !name.startsWith('--')) continue;
    if (!looksMotiony(name)) continue;
    const value = cs.getPropertyValue(name).trim();
    if (value && !motionVariables.has(name)) motionVariables.set(name, value.slice(0, 100));
  }

  const ranked = (map, cap = MAX) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, cap).map(([value, count]) => ({ value, count }));

  const conditions = [...mediaConditions];
  const reducedMotion = conditions.filter((c) => /prefers-reduced-motion/.test(c));
  const darkMode = conditions.filter((c) => /prefers-color-scheme/.test(c));

  return {
    durations: ranked(durations),
    easings: ranked(easings),
    properties: ranked(properties, 12),
    delays: ranked(delays, 10),
    animations: ranked(animations, 12),
    keyframes: [...keyframes].slice(0, 40),
    motionVariables: Object.fromEntries([...motionVariables.entries()].slice(0, 40)),
    reducedMotion: {
      declared: reducedMotion.length > 0,
      conditions: reducedMotion.slice(0, 5),
    },
    darkMode: {
      declared: darkMode.length > 0,
      conditions: darkMode.slice(0, 5),
    },
    stats: { sheets, blocked, mediaConditions: conditions.length },
  };
}
