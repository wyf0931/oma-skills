#!/usr/bin/env node
/**
 * design-to-daisyui — convert a DESIGN.md file into a daisyUI 5 custom theme CSS file.
 *
 * Zero dependencies for parsing (uses Bun.YAML when available, otherwise a
 * minimal frontmatter parser tailored to the DESIGN.md token shape).
 *
 * Usage:
 *   node design-to-daisyui.mjs <DESIGN.md> [--out themes/<name>.css] [--name <theme-name>]
 *
 * Exit codes: 0 ok · 1 usage/input error
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

// ── CLI ────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { file: null, out: null, name: null, stdout: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' || a === '-o') args.out = argv[++i];
    else if (a === '--name' || a === '-n') args.name = argv[++i];
    else if (a === '--stdout') args.stdout = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('-')) args.file = a;
  }
  return args;
}

// ── Frontmatter extraction ─────────────────────────────────────────

function extractFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return null;
  return lines.slice(1, end).join('\n');
}

// ── Minimal YAML parser (DESIGN.md frontmatter shape) ───────────────

function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      // YAML: '#' starts a comment when preceded by whitespace or at line start
      if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
    }
  }
  return line;
}

function unquote(value) {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
  }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}

function coerce(value) {
  const v = unquote(value);
  if (v !== '' && !Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

/**
 * Parse the constrained YAML used by DESIGN.md frontmatter: nested maps of
 * scalars, with folded (`>`) block scalars for descriptions.
 */
function parseYaml(source) {
  const rawLines = source.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  let i = 0;

  while (i < rawLines.length) {
    const raw = rawLines[i];
    if (raw.trim() === '' || /^\s*#/.test(raw)) {
      i++;
      continue;
    }
    const indent = raw.length - raw.replace(/^\s+/, '').length;
    const content = stripComment(raw).trim();
    if (content === '') {
      i++;
      continue;
    }

    const colon = content.indexOf(':');
    if (colon === -1) {
      i++;
      continue;
    }
    const key = unquote(content.slice(0, colon).trim());
    let rest = content.slice(colon + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;

    if (rest === '>' || rest === '|' || rest === '>-' || rest === '|-') {
      const folded = rest.startsWith('>');
      const blockIndent = indent + 2;
      const collected = [];
      i++;
      while (i < rawLines.length) {
        const line = rawLines[i];
        if (line.trim() !== '' && line.length - line.replace(/^\s+/, '').length < blockIndent) break;
        collected.push(line.length >= blockIndent ? line.slice(blockIndent) : '');
        i++;
      }
      parent[key] = folded ? collected.join(' ').trim() : collected.join('\n').trim();
      continue;
    }

    if (rest === '') {
      const child = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
      i++;
      continue;
    }

    if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1).trim();
      parent[key] = inner === '' ? [] : inner.split(',').map(s => coerce(s));
      i++;
      continue;
    }

    parent[key] = coerce(rest);
    i++;
  }

  return root;
}

function parseFrontmatterObject(frontmatterText) {
  if (typeof Bun !== 'undefined' && Bun?.YAML?.parse) {
    try {
      return Bun.YAML.parse(frontmatterText);
    } catch {
      // fall through to the minimal parser
    }
  }
  return parseYaml(frontmatterText);
}

// ── Color utilities ────────────────────────────────────────────────

function parseColorToRgb(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();

  // #rgb / #rgba / #rrggbb / #rrggbbaa
  const hex = v.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
        a: h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1,
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
  }

  const rgb = v.match(/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (rgb) {
    const chan = s => (s.endsWith('%') ? (parseFloat(s) / 100) * 255 : parseFloat(s));
    const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return { r: chan(rgb[1]), g: chan(rgb[2]), b: chan(rgb[3]), a: alpha };
  }

  // oklch(L% C H) — approximate lightness from the L channel
  const oklch = v.match(/^oklch\(\s*([\d.]+%?)/);
  if (oklch) {
    const l = oklch[1].endsWith('%') ? parseFloat(oklch[1]) / 100 : parseFloat(oklch[1]);
    return { oklchL: l };
  }

  // hsl(H S% L%)
  const hsl = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/);
  if (hsl) return hslToRgb(parseFloat(hsl[1]), parseFloat(hsl[2]) / 100, parseFloat(hsl[3]) / 100);

  const named = { white: { r: 255, g: 255, b: 255 }, black: { r: 0, g: 0, b: 0 }, transparent: { r: 0, g: 0, b: 0, a: 0 } };
  if (named[v]) return named[v];

  return null;
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = 60 * (((gn - bn) / d) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / d + 2);
  else h = 60 * ((rn - gn) / d + 4);
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a: 1 };
}

/** Relative luminance (WCAG). */
function luminance({ r, g, b }) {
  const lin = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function isLight(color) {
  if (!color) return true;
  if (color.oklchL !== undefined) return color.oklchL > 0.55;
  return luminance(color) > 0.45;
}

/**
 * Pick a readable content color for a given background.
 * Uses WCAG contrast ratio and keeps the better of the two candidates.
 */
function contrastOn(baseHex, darkCandidate = '#14151c', lightCandidate = '#ffffff') {
  const base = parseColorToRgb(baseHex);
  if (!base) return lightCandidate;

  const ratio = (a, b) => {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  const dark = parseColorToRgb(darkCandidate) ?? { r: 20, g: 21, b: 28 };
  const light = parseColorToRgb(lightCandidate) ?? { r: 255, g: 255, b: 255 };
  const baseRgb = base.oklchL !== undefined
    ? (base.oklchL > 0.55 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 })
    : base;

  return ratio(baseRgb, dark) >= ratio(baseRgb, light) ? darkCandidate : lightCandidate;
}

/** Choose a content color by hue-aware reasoning when no explicit token exists. */
function inferSemanticColor(entries, role) {
  const target = {
    success: [95, 190],   // green → teal
    warning: [30, 75],    // amber
    error: [330, 30],     // red
    info: [190, 265],     // cyan → indigo
  }[role];
  if (!target) return null;

  const [lo, hi] = target;
  const inRange = h => (lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi);

  for (const [name, value] of entries) {
    if (!isOpaque(value)) continue;
    if (isMutedName(name) || isContainerName(name)) continue;
    const color = parseColorToRgb(value);
    if (!color || color.oklchL !== undefined) continue;

    // A status color must be saturated and mid-lightness. This keeps surface
    // tones and near-black brand inks from being mistaken for status colors.
    const { h, s, l } = rgbToHsl(color);
    if (s < 0.3 || l < 0.25 || l > 0.85) continue;
    if (inRange(h)) return { name, value };
  }
  return null;
}

// ── Mapping rules ──────────────────────────────────────────────────

const COLOR_PATTERNS = {
  primary: [/^primary$/],
  secondary: [/^secondary$/],
  tertiary: [/^tertiary$/, /^accent$/],
  neutral: [/^neutral$/, /^border$/, /^outline$/, /^hairline$/],
  base100: [/^surface$/, /^canvas$/, /^background$/, /^bg$/, /^base$/],
  base200: [/^surface-elevated$/, /^canvas-soft$/, /^surface-container-low$/, /^surface-container$/, /^surface-low$/, /^surface-raised$/],
  base300: [/^surface-container-highest$/, /^surface-container-high$/, /^surface-subtle$/, /^surface-variant$/, /^surface-bright$/, /^surface-high$/, /^surface-highest$/],
  baseContent: [/^ink$/, /^on-surface$/, /^on-background$/, /^text$/, /^text-primary$/, /^foreground$/],
  info: [/^info$/, /^primary-dark$/],
  success: [/^success$/, /^teal$/, /^green$/],
  warning: [/^warning$/, /^yellow$/, /^amber$/, /^teal-yellow$/],
  error: [/^error$/, /^red$/, /^danger$/, /^destructive$/, /^signal-orange$/],
};

const CONTENT_PATTERNS = {
  primaryContent: [/^on-primary$/, /^primary-content$/],
  secondaryContent: [/^on-secondary$/, /^secondary-content$/],
  accentContent: [/^on-tertiary$/, /^on-accent$/, /^accent-content$/],
  neutralContent: [/^on-neutral$/, /^neutral-content$/],
  infoContent: [/^on-info$/, /^info-content$/],
  successContent: [/^on-success$/, /^success-content$/],
  warningContent: [/^on-warning$/, /^warning-content$/],
  errorContent: [/^on-error$/, /^error-content$/],
};

const SECONDARY_PATTERNS = [/^secondary$/, /^tertiary$/, /^accent$/];
const ACCENT_PATTERNS = [/^accent$/, /^tertiary$/, /^primary-light$/, /^secondary-light$/];

/** Variant names that can stand in for a missing secondary role. */
const SECONDARY_VARIANT_PATTERNS = [
  /^primary-light$/, /^primary-soft$/, /^primary-deep$/, /^primary-dark$/, /^primary-press$/, /^primary-bright$/,
];

/** A color is a primary variant if its name extends `primary` rather than naming a new role. */
const isPrimaryVariant = name => /^primary[-_]/.test(name) || /[-_]primary$/.test(name);

/** Names that describe a muted/text/structural color rather than a brand color. */
const isMutedName = name =>
  /muted|ghost|faint|disabled|subtle|placeholder|hairline|outline|shade|tint|shadow|border|divider|disabled/i.test(name);

/** Container/state suffixes from MD3-style palettes that are not brand roles. */
const isContainerName = name =>
  /container|fixed|variant|hover|active|pressed|dim|bright|lowest|highest|soft|subdued|disabled/i.test(name);

function isOpaque(value) {
  const c = parseColorToRgb(value);
  return !!c && (c.a === undefined || c.a >= 0.99);
}

/**
 * Rank how plausible a color is as a brand color (secondary/accent).
 * Opaque, saturated, mid-lightness colors win; muted/named-structural and
 * translucent colors are pushed down so they never masquerade as a brand role.
 */
function brandScore(name, value) {
  const c = parseColorToRgb(value);
  if (!c) return -Infinity;
  let score = 0;
  score += isOpaque(value) ? 3 : -8;
  if (isMutedName(name)) score -= 6;
  if (isPrimaryVariant(name)) score -= 4;
  if (isContainerName(name)) score -= 5;

  const { s, l } = c.oklchL !== undefined ? { s: 0.6, l: c.oklchL } : rgbToHsl(c);
  score += s * 4;
  score += 1 - Math.abs(l - 0.45) * 2;
  return score;
}

/** Best brand color from entries, or null when nothing qualifies. */
function bestBrandColor(entries) {
  let best = null;
  for (const entry of entries) {
    const s = brandScore(entry[0], entry[1]);
    if (s === -Infinity) continue;
    if (!best || s > best.score) best = { entry, score: s };
  }
  return best ? best.entry : null;
}

const NAMED_DARKS = ['on-surface', 'on-background', 'ink', 'text', 'foreground'];
const NAMED_LIGHTS = ['on-primary', 'on-secondary', 'on-tertiary', 'on-error', 'white'];

/**
 * Find the first color whose name matches a pattern.
 * Patterns are authoritative: earlier patterns win over earlier colors, so the
 * caller controls priority (e.g. `surface-container-highest` before `surface-bright`).
 */
function findColor(colors, patterns) {
  const entries = Object.entries(colors);
  for (const pattern of patterns) {
    for (const [name, value] of entries) {
      if (pattern.test(name)) return { name, value: String(value) };
    }
  }
  return null;
}

function pickContrastColor(colors, preferredNames) {
  for (const n of preferredNames) {
    if (colors[n] !== undefined) return String(colors[n]);
  }
  for (const [name, value] of Object.entries(colors)) {
    if (NAMED_DARKS.includes(name) || NAMED_LIGHTS.includes(name)) return String(value);
  }
  return null;
}

function buildColorMap(colors) {
  const out = {};
  const used = new Set();

  const take = (key, patterns, { exclude } = {}) => {
    const entries = Object.entries(colors).filter(([n]) => !exclude || !exclude(n));
    const hit = findColor(Object.fromEntries(entries), patterns);
    if (hit) {
      out[key] = hit.value;
      used.add(hit.name);
      return hit;
    }
    return null;
  };

  take('primary', COLOR_PATTERNS.primary);

  // Surface roles and semantic roles resolve first so a status color (e.g. teal)
  // is never mistaken for the brand secondary.
  take('neutral', COLOR_PATTERNS.neutral);
  take('base-100', COLOR_PATTERNS.base100);
  take('base-200', COLOR_PATTERNS.base200);
  take('base-300', COLOR_PATTERNS.base300);
  take('base-content', COLOR_PATTERNS.baseContent);
  take('info', COLOR_PATTERNS.info);
  take('success', COLOR_PATTERNS.success);
  take('warning', COLOR_PATTERNS.warning);
  take('error', COLOR_PATTERNS.error);

  // Secondary prefers an explicit role name, then a lighter/darker variant of the
  // primary, and only then an unrelated remaining color.
  take('secondary', SECONDARY_PATTERNS, { exclude: isPrimaryVariant });
  if (!out.secondary) take('secondary', SECONDARY_VARIANT_PATTERNS);
  take('accent', ACCENT_PATTERNS, { exclude: isPrimaryVariant });

  // Fill gaps from the remaining palette so the theme is always complete.
  const remaining = Object.entries(colors).filter(([n]) => !used.has(n));

  if (!out.primary) {
    const pick = bestBrandColor(remaining) ?? remaining[0];
    if (pick) {
      out.primary = pick[1];
      used.add(pick[0]);
    }
  }

  if (!out.secondary) {
    const pick = bestBrandColor(remaining.filter(([n]) => !isPrimaryVariant(n) && !isMutedName(n)));
    if (pick) {
      out.secondary = pick[1];
      used.add(pick[0]);
    } else {
      out.secondary = out.primary;
    }
  }
  if (!out.accent) out.accent = out.secondary;
  if (!out.neutral) out.neutral = out['base-300'] || out['base-200'] || '#e5e5e5';
  if (!out['base-100']) out['base-100'] = out.neutral;
  if (!out['base-200']) out['base-200'] = out['base-100'];
  if (!out['base-300']) out['base-300'] = out['base-200'];
  if (!out['base-content']) {
    out['base-content'] = isLight(parseColorToRgb(out['base-100']))
      ? pickContrastColor(colors, NAMED_DARKS) || '#14151c'
      : pickContrastColor(colors, NAMED_LIGHTS) || '#ffffff';
  }

  // Semantic slots resolve before brand fallbacks: green beats cyan for success.
  if (!out.success) out.success = inferSemanticColor(remaining, 'success')?.value || out.secondary;
  if (!out.info) out.info = inferSemanticColor(remaining, 'info')?.value || out.primary;
  if (!out.warning) out.warning = inferSemanticColor(remaining, 'warning')?.value || '#f5c518';
  if (!out.error) out.error = inferSemanticColor(remaining, 'error')?.value || '#e5484d';

  const darkRef = out['base-content'];
  const lightRef = '#ffffff';

  const content = (key, patterns, fallbackBase) => {
    const hit = findColor(colors, patterns);
    if (hit) {
      out[key] = hit.value;
      used.add(hit.name);
    } else {
      out[key] = contrastOn(fallbackBase, darkRef, lightRef);
    }
  };

  content('primary-content', CONTENT_PATTERNS.primaryContent, out.primary);
  content('secondary-content', CONTENT_PATTERNS.secondaryContent, out.secondary);
  content('accent-content', CONTENT_PATTERNS.accentContent, out.accent);
  content('neutral-content', CONTENT_PATTERNS.neutralContent, out.neutral);
  content('info-content', CONTENT_PATTERNS.infoContent, out.info);
  content('success-content', CONTENT_PATTERNS.successContent, out.success);
  content('warning-content', CONTENT_PATTERNS.warningContent, out.warning);
  content('error-content', CONTENT_PATTERNS.errorContent, out.error);

  return { mapped: out, used, remaining };
}

const pxToRem = (dimension) => {
  const s = String(dimension).trim();
  const m = s.match(/^(-?[\d.]+)px$/);
  if (m) {
    const rem = parseFloat(m[1]) / 16;
    return `${parseFloat(rem.toFixed(4))}rem`;
  }
  return s;
};

function pickRounded(rounded) {
  const by = (...names) => {
    for (const n of names) if (rounded[n] !== undefined) return rounded[n];
    return undefined;
  };

  const selector = by('sm', 'xs', 'none') ?? '0.25rem';
  let field = by('md', 'DEFAULT', 'default', 'lg');
  let box = by('xl', 'lg', '2xl', '3xl', 'pill', 'full');

  // If there is no mid/large token, reuse the largest small value.
  if (field === undefined) field = selector;
  if (box === undefined) box = field;

  // Guard against inverted ordering (box must be >= field >= selector).
  const toPx = v => {
    const m = String(v).match(/^([\d.]+)rem$/);
    if (m) return parseFloat(m[1]) * 16;
    const p = String(v).match(/^([\d.]+)px$/);
    if (p) return parseFloat(p[1]);
    return 0;
  };
  if (toPx(box) < toPx(field)) box = field;
  if (toPx(field) < toPx(selector)) field = selector;

  return {
    selector: pxToRem(selector),
    field: pxToRem(field),
    box: pxToRem(box),
  };
}

function kebab(name) {
  return String(name)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function collectFontFamilies(typography) {
  const families = [];
  for (const t of Object.values(typography ?? {})) {
    if (t && typeof t === 'object' && t.fontFamily) {
      const f = String(t.fontFamily);
      if (!families.includes(f)) families.push(f);
    }
  }
  return families;
}

/** Quote font family names that contain spaces; leave generic families bare. */
function cssFontFamily(value) {
  const generics = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-\w+|inherit|initial|unset)$/i;
  return String(value)
    .split(',')
    .map(part => {
      const p = part.trim();
      if (p === '') return p;
      if (/^['"]/.test(p)) return p;
      if (generics.test(p)) return p;
      return /\s/.test(p) ? `'${p}'` : p;
    })
    .filter(Boolean)
    .join(', ');
}

// ── Render ─────────────────────────────────────────────────────────

function renderTheme({ name, colors, rounded, typography, spacing, description }) {
  const themeName = kebab(name);
  const { mapped, remaining } = buildColorMap(colors);
  const radii = pickRounded(rounded ?? {});

  const lines = [];
  lines.push('/*');
  lines.push(` * Theme: ${themeName}`);
  lines.push(' * Generated from DESIGN.md by the design-to-daisyui skill.');
  lines.push(' * daisyUI 5 · Tailwind CSS 4');
  if (description) {
    const oneLine = String(description).replace(/\s+/g, ' ').trim();
    lines.push(` * ${oneLine.length > 120 ? oneLine.slice(0, 117) + '...' : oneLine}`);
  }
  lines.push(' */');
  lines.push('');
  lines.push('@plugin "daisyui/theme" {');
  lines.push(`  name: "${themeName}";`);
  lines.push('  default: true;');
  lines.push(`  color-scheme: ${isLight(parseColorToRgb(mapped['base-100'])) ? 'light' : 'dark'};`);
  lines.push('');
  lines.push('  /* Colors */');
  for (const key of [
    'primary', 'primary-content',
    'secondary', 'secondary-content',
    'accent', 'accent-content',
    'neutral', 'neutral-content',
    'base-100', 'base-200', 'base-300', 'base-content',
    'info', 'info-content',
    'success', 'success-content',
    'warning', 'warning-content',
    'error', 'error-content',
  ]) {
    lines.push(`  --color-${key}: ${mapped[key]};`);
  }
  lines.push('');
  lines.push('  /* Radius */');
  lines.push(`  --radius-selector: ${radii.selector};`);
  lines.push(`  --radius-field: ${radii.field};`);
  lines.push(`  --radius-box: ${radii.box};`);
  lines.push('');
  lines.push('  /* Size & borders */');
  lines.push('  --size-selector: 0.25rem;');
  lines.push('  --size-field: 0.25rem;');
  lines.push('  --border: 1px;');
  lines.push('  --depth: 0;');
  lines.push('  --noise: 0;');
  lines.push('}');

  const extras = remaining.filter(([n]) => !n.startsWith('on-'));
  const families = collectFontFamilies(typography);
  const spacings = Object.entries(spacing ?? {});

  if (extras.length || families.length || spacings.length) {
    lines.push('');
    lines.push('/* Design tokens beyond daisyUI theme variables */');
    lines.push(':root {');

    if (extras.length) {
      lines.push('  /* Extra palette colors */');
      for (const [n, v] of extras) lines.push(`  --color-${kebab(n)}: ${v};`);
      lines.push('');
    }
    if (families.length) {
      lines.push('  /* Typography */');
      families.forEach((f, i) => {
        const key = i === 0 ? 'sans' : /mono|code|geist/i.test(f) ? 'mono' : `alt-${i}`;
        lines.push(`  --font-family-${key}: ${cssFontFamily(f)};`);
      });
      lines.push('');
    }
    if (spacings.length) {
      lines.push('  /* Spacing */');
      for (const [n, v] of spacings) lines.push(`  --spacing-${kebab(n)}: ${v};`);
      lines.push('');
    }
    if (lines[lines.length - 1] === '') lines.pop();
    lines.push('}');
  }

  lines.push('');
  lines.push('/*');
  lines.push(' * Usage');
  lines.push(' *');
  lines.push(' * 1. Import after Tailwind + daisyUI in your CSS entry file:');
  lines.push(' *');
  lines.push(' *      @import "tailwindcss";');
  lines.push(' *      @plugin "daisyui";');
  lines.push(` *      @import "./themes/${themeName}.css";`);
  lines.push(' *');
  lines.push(' * 2. Set the theme on the root element:');
  lines.push(' *');
  lines.push(` *      <html data-theme="${themeName}">`);
  lines.push(' *');
  lines.push(' * 3. Use daisyUI semantic classes — they inherit this theme automatically:');
  lines.push(' *');
  lines.push(' *      <button class="btn btn-primary">Save</button>');
  lines.push(' *      <div class="card bg-base-100 text-base-content">...</div>');
  lines.push(' */');

  return lines.join('\n') + '\n';
}

// ── Main ───────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.file) {
    console.log(`design-to-daisyui — DESIGN.md → daisyUI 5 theme

Usage:
  node design-to-daisyui.mjs <DESIGN.md> [options]

Options:
  -o, --out <path>    Output CSS path (default: themes/<name>.css)
  -n, --name <name>   Override the theme name
      --stdout        Print the CSS to stdout instead of writing a file
  -h, --help          Show this help
`);
    process.exit(args.help ? 0 : 1);
  }

  const designPath = resolve(args.file);
  if (!existsSync(designPath)) {
    console.error(`Error: DESIGN.md not found at ${designPath}`);
    process.exit(1);
  }

  const text = readFileSync(designPath, 'utf8');
  const frontmatter = extractFrontmatter(text);
  if (frontmatter === null) {
    console.error('Error: no YAML frontmatter found (expected a leading --- block).');
    process.exit(1);
  }

  let tokens;
  try {
    tokens = parseFrontmatterObject(frontmatter);
  } catch (e) {
    console.error(`Error: could not parse frontmatter — ${e.message}`);
    process.exit(1);
  }

  const colors = tokens.colors;
  if (!colors || Object.keys(colors).length === 0) {
    console.error('Error: DESIGN.md has no `colors` tokens; a theme cannot be generated.');
    process.exit(1);
  }

  const themeName = args.name || kebab(tokens.name || 'design');

  const css = renderTheme({
    name: themeName,
    colors,
    rounded: tokens.rounded,
    typography: tokens.typography,
    spacing: tokens.spacing,
    description: tokens.description,
  });

  if (args.stdout) {
    process.stdout.write(css);
    return;
  }

  const outPath = args.out ? resolve(args.out) : join(process.cwd(), 'themes', `${themeName}.css`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, css, 'utf8');

  console.error(`✔ Wrote ${outPath}`);
  console.error(`  Theme name: ${themeName}`);
  console.error(`  Apply with: <html data-theme="${themeName}">`);
}

main();
