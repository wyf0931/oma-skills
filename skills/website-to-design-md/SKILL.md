---
name: website-to-design-md
description: >
  Extract a DESIGN.md design-system specification from a live website using a
  browser (Chrome DevTools MCP or Playwright). Use this skill whenever the user
  gives a URL and wants a design system, design tokens, or a DESIGN.md extracted
  from it — or says "extract design md", "reverse-engineer this site's design",
  "capture the design system from this URL", "what colours/fonts does this site
  use", "turn this website into a DESIGN.md", or wants a design reference for
  rebuilding a site's look. Also use when asked to analyse a page's palette,
  type scale, spacing rhythm, or component styles for documentation. Produces a
  complete DESIGN.md (YAML tokens + prose rationale) validated with the
  design.md linter. It does NOT convert a DESIGN.md into a theme or framework
  config — that is a separate downstream concern.
compatibility: >-
  Requires a browser automation tool — Chrome DevTools MCP is the reference, with
  Playwright as fallback — for the extraction scripts (evaluate_script payloads).
  Requires `npx @google/design.md` on PATH for the final `lint` and `export`
  validation steps.
---

# website-to-design-md

Turn a live website into a DESIGN.md design system.

## Scope

Upstream only: **URL → DESIGN.md**. The output is a validated specification, not
a theme, not framework config, not code. Hand the result to a theme-generation
step (`design-to-daisyui` or `design.md export`) when the user wants that next.

## Prerequisites

- A browser automation tool. Chrome DevTools MCP is the reference; Playwright
  works if MCP is unavailable.
- The `design.md` CLI for validation: `npx @google/design.md lint DESIGN.md`.
- Read `references/design-md-constraints.md` before generating, and
  `references/pitfalls.md` before extracting. Both are short and both save
  rework.

## Workflow

### 1. Orient on the page

Navigate, then take a **text snapshot** (not a screenshot) to understand the
page's structure — headings, nav, key regions, component counts.

```text
browser_navigate(url)
browser_take_snapshot()          # accessibility tree, always readable
```

If the snapshot shows almost nothing, the app has not rendered. See the SPA
section of `references/pitfalls.md` before extracting.

### 2. Check for the site's own token system

This is the highest-value step and the easiest to skip. Run:

```text
scripts/extract-css-variables.js   →  evaluate_script
```

The script walks every stylesheet (not just `:root`) because that is where real
token systems live. Framework internals like `--tw-*` are filtered out, and the
result is grouped by namespace prefix.

Read `groups` first. Namespaces such as `acme-color`, `acme-space`, `acme-motion`
mean the site has a deliberate token architecture — use those names as the spine
of your DESIGN.md and treat computed styles only as confirmation. A high
`semanticTokenCount` with small `root` is the normal, healthy shape: tokens
declared in stylesheets, not inline on the root element.

If the site has no token system (`tokenCount` near zero), say so in the Overview
and lean entirely on the computed-style census.

### 3. Extract the primitives

Run each script as the `function` argument to `evaluate_script`. They are
self-contained arrow functions; read the file and pass its contents.

| Script | Returns | Feeds |
| --- | --- | --- |
| `scripts/extract-palette.js` | Frequency-ranked colours, fonts, sizes, radii, spacing, shadows | Colors, Typography, Shapes, Layout |
| `scripts/extract-typography.js` | Text styles grouped by role with real samples | Typography |
| `scripts/extract-components.js` | Deduped button / input / surface / badge variants | Components |
| `scripts/extract-layout.js` | Container widths, nav/sidebar geometry, section rhythm | Layout, Elevation |

Run them one at a time. If one comes back truncated or suspiciously thin,
narrow its selector and re-run rather than accepting the gap.

### 4. Analyse before writing

Raw output is a census, not a design system. Do the interpretive work first:

- **Cluster the palette.** Collapse opacity variants of one hue into a single
  colour with a text-hierarchy role. Keep 5–10 real colours and explain each
  one's job. Frequency tells you what is structural.
- **Build the type scale.** Sort by size, then assign roles: display → headline
  → body → label → caption. Note which weights are actually used; a scale with
  three weights is a deliberate system, not a gap.
- **Find the spacing unit.** Look for a common divisor across paddings and gaps
  (4px and 8px are the usual answers). Express the scale as multiples of it.
- **Read the shape language.** Is the radii set tight (2–6px) or generous
  (12–20px)? Note whether buttons are pills and cards are not.
- **Note the depth strategy.** Borders-only, soft shadows, or heavy elevation?
  Frequency of `box-shadow` values answers this quickly.

### 5. Write the DESIGN.md

Follow the structure and value rules in
`references/design-md-constraints.md`. Two things matter most:

- **Only legal component properties.** Components accept `backgroundColor`,
  `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width` —
  nothing else. Borders, shadows, and transitions belong in prose.
- **Prose carries the intent.** Describe the reference world the design belongs
  to, then let each section explain *why* its values are what they are. Restating
  tokens in sentences is not prose.

Write tokens that exist. If the site has one accent colour, document one accent
colour — do not manufacture a spreading scale to fill out a template.

### 6. Validate and classify

```bash
npx @google/design.md lint DESIGN.md
```

Then split the findings by kind:

- **Structural** (`broken-ref`, `redundant-omission`, duplicate headings) — fix
  these; they are mistakes in your document.
- **Design** (`contrast-ratio`, `orphaned-tokens`) — keep and report them; they
  are faithful observations about the site.

Confirm the YAML parses end to end:

```bash
npx @google/design.md export DESIGN.md --format css-vars
```

## Quality bar

Before you call it done:

- [ ] Every frontmatter section present is valid YAML with legal value formats.
- [ ] No component carries a property outside the allowed set.
- [ ] Colour tokens are clustered — no long tail of near-duplicate alphas.
- [ ] The type scale has a stated role for each level.
- [ ] Spacing is expressed as a scale with a named base unit.
- [ ] Sections appear in the canonical order.
- [ ] `lint` reports zero structural findings.
- [ ] Design findings are recorded, not silently removed.
- [ ] The Overview names a specific reference, not a list of adjectives.
- [ ] Coverage was sampled: if the page has a dark mode, a mobile layout, or a
      second major surface, say so or extract it.

## Known limits

- A single pass captures the current viewport, theme, and state. Dark mode,
  responsive breakpoints, and interactive states need separate passes — call
  them out in prose rather than pretending they were covered.
- Cross-origin stylesheets cannot be read; variable-based scans are partial.
- Computed styles describe what renders, not what was intended. Use the site's
  own token names and visible structure to recover intent where you can.
