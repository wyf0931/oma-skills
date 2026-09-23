---
name: design-to-daisyui
description: >
  Convert a DESIGN.md file into a daisyUI 5 custom theme CSS file.
  Use this skill whenever the user wants to export, convert, generate, or create
  a daisyUI theme from a DESIGN.md — or mentions "DESIGN.md to daisyUI",
  "design tokens to theme", "export design tokens", "generate theme CSS",
  "design-to-daisyui", "daisyui custom theme", or wants to use daisyUI
  components with an existing design system described in DESIGN.md.
  The skill ships a zero-dependency script that reads the DESIGN.md YAML
  frontmatter, maps tokens to daisyUI's semantic variables, and writes
  `themes/<name>.css` plus usage instructions. It does NOT generate or scrape
  DESIGN.md itself — that is a separate concern.
compatibility: >-
  Requires Node 18+. The bundled `scripts/design-to-daisyui.mjs` is zero-dependency:
  it uses `Bun.YAML` when running under Bun and a minimal built-in frontmatter parser
  otherwise. Validation is optional but recommended — `npx @google/design.md lint` on
  the source DESIGN.md before conversion.
---

# design-to-daisyui

Turn a DESIGN.md design system into a daisyUI 5 custom theme.

## Quick start

Run the bundled script from the project root:

```bash
node <skill-dir>/scripts/design-to-daisyui.mjs DESIGN.md
```

This writes `themes/<kebab-name>.css` and prints how to apply it. Useful flags:

| Flag | Purpose |
|------|---------|
| `-o, --out <path>` | Write somewhere other than `themes/<name>.css` |
| `-n, --name <name>` | Override the theme name (keep it short, e.g. `bailian`) |
| `--stdout` | Print the CSS instead of writing a file |

If the shell's working directory is not the project root, pass an explicit
output path so the theme lands in the right place:

```bash
node <skill-dir>/scripts/design-to-daisyui.mjs path/to/DESIGN.md -o themes/bailian.css -n bailian
```

The script has no dependencies (it uses `Bun.YAML` when running under Bun and a
minimal frontmatter parser otherwise), so it works in any Node 18+ project.

## What the script produces

A single CSS file containing:

1. A `@plugin "daisyui/theme"` block with all required daisyUI color variables,
   radius, size, border, depth, and noise settings.
2. A `:root` block with the tokens daisyUI's theme system does not cover —
   extra palette colors, font families, and the spacing scale. These are
   emitted with `--color-*`, `--font-family-*`, and `--spacing-*` prefixes so
   Tailwind v4 surfaces them as utilities (`bg-teal-container`, `p-md`, ...).
3. A usage comment with copy-paste import and `data-theme` instructions.

Example output (abridged):

```css
@plugin "daisyui/theme" {
  name: "bailian";
  default: true;
  color-scheme: light;

  --color-primary: #2564F8;
  --color-primary-content: #ffffff;
  --color-base-100: #FFFFFF;
  --color-base-content: #14151C;
  /* ...all remaining required variables... */

  --radius-selector: 0.125rem;
  --radius-field: 0.75rem;
  --radius-box: 1rem;

  --border: 1px;
  --depth: 0;
  --noise: 0;
}

:root {
  --color-teal-container: #E6FFFB;
  --font-family-sans: 'PingFang SC';
  --spacing-md: 8px;
}
```

## Applying the theme

The generated file goes **after** Tailwind and daisyUI in the CSS entry point:

```css
@import "tailwindcss";
@plugin "daisyui";
@import "./themes/bailian.css";
```

Then set the theme on the root element:

```html
<html data-theme="bailian">
```

daisyUI components now inherit the design system automatically — no per-component
styling:

```html
<button class="btn btn-primary">Save</button>
<div class="card bg-base-100 text-base-content">…</div>
```

## How the mapping works

The script resolves tokens in a deliberate order so status colors are never
mistaken for brand colors:

1. **Primary** — the `primary` token.
2. **Surface roles** — `neutral`, `base-100/200/300`, `base-content`, matched
   against names like `surface`, `canvas`, `background`, `ink`, `on-surface`,
   `border`, `outline`. Patterns are tried in priority order, so
   `surface-container-highest` wins over `surface-bright`.
3. **Semantic roles** — `info`, `success`, `warning`, `error` by exact name,
   then by hue inference over the remaining palette.
4. **Secondary / accent** — an explicit `secondary`/`tertiary`/`accent` first,
   then a lighter/darker primary variant, then the best remaining brand color.

Several heuristics keep the result coherent:

- **`*-content` derivation** — when DESIGN.md has no explicit `on-primary`-style
  token, the script picks between near-black and near-white by WCAG contrast
  ratio against the base color.
- **Brand-color scoring** — translucent, muted (`*-muted`, `*-ghost`),
  structural (`*-border`, `*-outline`), and container (`*-container`, `*-fixed`)
  names are penalized so they cannot occupy `secondary`/`accent`.
- **Hue inference** — leftover saturated, mid-lightness colors fill missing
  semantic slots (green→success, amber→warning, red→error, cyan→info).
- **Radius ordering guard** — `--radius-box` is forced ≥ `--radius-field` ≥
  `--radius-selector` even when the DESIGN.md scale is unusual.
- **`color-scheme`** — derived from the lightness of `base-100`, so dark design
  systems produce `color-scheme: dark`.

Everything that cannot map to a fixed daisyUI variable is preserved under
`:root` rather than dropped.

## Manual fallback

If the script cannot run (for example, the DESIGN.md uses YAML the minimal
parser does not understand), do the conversion by hand following the same order
above. The full daisyUI variable set is:

`primary`, `primary-content`, `secondary`, `secondary-content`, `accent`,
`accent-content`, `neutral`, `neutral-content`, `base-100`, `base-200`,
`base-300`, `base-content`, `info`, `info-content`, `success`,
`success-content`, `warning`, `warning-content`, `error`, `error-content`.

Plus `--radius-selector`, `--radius-field`, `--radius-box`, `--size-selector`,
`--size-field`, `--border`, `--depth`, `--noise`. Every one must be present —
daisyUI expects a complete theme.

## Verification

After generating a theme, confirm the source is still valid and inspect the
result:

```bash
npx @google/design.md lint DESIGN.md          # source tokens are well-formed
node <skill-dir>/scripts/design-to-daisyui.mjs DESIGN.md --stdout | head -40
```

A quick sanity check on any generated theme is that every `--color-*-content`
value has a contrast ratio of at least 4.5:1 against its base color. The script
derives these automatically; flag it to the user if a DESIGN.md pins an explicit
`on-*` token that fails that bar.

## Edge cases

| Situation | Behaviour |
|---|---|
| No `colors` section | Exits with an error — a theme needs colors. |
| Only one brand color | `secondary`/`accent` fall back to it; the theme is monochrome. |
| No `rounded` | Defaults to `0.25rem` for all three radius variables. |
| `oklch()` / `rgba()` values | Passed through untouched; no color conversion. |
| Dark palette | `color-scheme: dark` detected from `base-100` lightness. |
| More than ~20 colors | Semantic slots are filled first; the rest land in `:root`. |
| No `on-*` tokens | Content colors are derived by contrast. |

## Scope

This skill only converts an existing DESIGN.md into a daisyUI theme. It does not
extract a DESIGN.md from a website, lint DESIGN.md, or modify the design system
itself. When the user has no DESIGN.md yet, point them at that separate workflow
first, then return here.
