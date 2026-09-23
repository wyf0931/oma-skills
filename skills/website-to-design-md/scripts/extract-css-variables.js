() => {
  // Extract the site's OWN design tokens from its stylesheets and root scope.
  //
  // This is the highest-signal source available, and the stylesheet walk is the
  // important half: sites built on a token system declare variables like
  // `--acme-color-primary` or `--acme-space-md` with real values. Those names
  // state the intended semantic roles, which computed styles alone cannot tell
  // you. Root enumeration is kept as a secondary source because it also picks up
  // runtime-injected variables, but it is noisier (framework internals, empty
  // declarations).
  //
  // Returns: { tokenCount, groups, tokens, root, themes, stats }

  const MAX_TOKENS = 200;
  const MAX_GROUPS = 25;
  const SKIP = /^--tw-/; // Tailwind's internal machinery, not design tokens
  const SEMANTIC_HINT = /color|bg|background|text|foreground|ink|font|space|spacing|size|radius|round|shadow|elevation|motion|ease|duration|border|stroke|opacity|z-|breakpoint|screen/i;

  const tokens = new Map(); // name -> first non-empty value
  const counts = new Map(); // name -> declaration count
  let sheets = 0;
  let blocked = 0;
  let rules = 0;

  for (const sheet of document.styleSheets) {
    sheets++;
    let cssRules;
    try {
      cssRules = sheet.cssRules;
    } catch {
      blocked++;
      continue;
    }
    walk(cssRules);
  }

  function walk(list) {
    if (!list) return;
    for (const rule of list) {
      rules++;
      const style = rule.style;
      if (style) {
        for (let i = 0; i < style.length; i++) {
          const name = style[i];
          if (typeof name !== 'string' || !name.startsWith('--') || SKIP.test(name)) continue;
          const value = style.getPropertyValue(name).trim();
          if (!value) continue;
          counts.set(name, (counts.get(name) || 0) + 1);
          if (!tokens.has(name)) tokens.set(name, value.slice(0, 120));
        }
      }
      if (rule.cssRules) walk(rule.cssRules);
    }
  }

  // Namespace groups tell you at a glance whether a real token system exists.
  const groups = new Map();
  for (const name of tokens.keys()) {
    const parts = name.replace(/^--/, '').split('-').filter(Boolean);
    const key = parts.slice(0, Math.min(2, parts.length)).join('-') || '(unnamed)';
    groups.set(key, (groups.get(key) || 0) + 1);
  }

  const allNames = [...tokens.keys()];
  const semantic = allNames.filter((n) => SEMANTIC_HINT.test(n));
  const other = allNames.filter((n) => !SEMANTIC_HINT.test(n));
  const ranked = [...semantic, ...other]
    .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0))
    .slice(0, MAX_TOKENS);

  // Root scope, excluding noise.
  const rootVars = {};
  const cs = getComputedStyle(document.documentElement);
  for (let i = 0; i < cs.length; i++) {
    const name = cs[i];
    if (typeof name !== 'string' || !name.startsWith('--') || SKIP.test(name)) continue;
    const value = cs.getPropertyValue(name).trim();
    if (value) rootVars[name] = value.slice(0, 120);
  }

  const themes = {};
  document.querySelectorAll('[data-theme]').forEach((el, i) => {
    const scope = `${el.tagName.toLowerCase()}[data-theme="${el.getAttribute('data-theme')}"]${
      el === document.documentElement ? '' : ` #${i}`
    }`;
    const vars = {};
    const elCs = getComputedStyle(el);
    for (let j = 0; j < elCs.length; j++) {
      const n = elCs[j];
      if (typeof n !== 'string' || !n.startsWith('--') || SKIP.test(n)) continue;
      const v = elCs.getPropertyValue(n).trim();
      if (v) vars[n] = v.slice(0, 120);
    }
    if (Object.keys(vars).length) themes[scope] = vars;
  });

  return {
    tokenCount: allNames.length,
    semanticTokenCount: semantic.length,
    groups: Object.fromEntries(
      [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_GROUPS),
    ),
    tokens: Object.fromEntries(ranked.map((n) => [n, tokens.get(n)])),
    truncated: allNames.length > MAX_TOKENS,
    root: rootVars,
    themes,
    stats: { sheets, blocked, rules },
  };
}
