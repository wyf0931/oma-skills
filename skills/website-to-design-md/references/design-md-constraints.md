# DESIGN.md constraints while generating

The rules that most often break a freshly generated DESIGN.md. Read this before
writing the file, not after the linter complains.

## Frontmatter shape

```yaml
---
version: alpha            # optional
name: <string>            # required
description: <string>     # optional, supports folded `>`
colors:
  <token-name>: <Color>
typography:
  <token-name>: <Typography>
rounded:
  <scale-level>: <Dimension>
spacing:
  <scale-level>: <Dimension | number>
components:
  <component-name>:
    <property>: <value | "{token.reference}">
omitted:                  # optional
  - spacing
  - section: rounded
    reason: "..."
---
```

Frontmatter must open with a line containing exactly `---` and close with one.

## What a component may contain

This is the most common failure. Component objects accept **only** these
properties:

`backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`,
`height`, `width`

Anything else — `borderColor`, `boxShadow`, `border`, `opacity`, `transition`,
`fontSize` — triggers a `broken-ref` warning. Put that information in the prose
instead. A border or shadow is described in the Elevation or Components section,
not encoded as a component token.

## Value formats

| Kind | Rule | Example |
|---|---|---|
| Color | Any valid CSS color string. Hex is the safe default. | `"#1A1C1E"`, `"rgba(20,21,28,0.6)"`, `"oklch(55% 0.3 240)"` |
| Dimension | String with a unit suffix. Valid units: `px`, `em`, `rem`. | `12px`, `1.5rem` |
| `fontWeight` | Number, bare or quoted. Never `bold`/`normal`. | `400`, `"600"` |
| `lineHeight` | Dimension **or** unitless multiplier. | `24px`, `1.5` |
| Token reference | Braces around a dotted path. | `"{colors.primary}"`, `"{rounded.md}"` |

Token references must point at a **primitive**, not a group: `{colors.primary-60}`
is valid, `{colors}` is not. The one exception is inside `components`, where a
composite reference such as `{typography.label-md}` is allowed.

## Section order

Headings are `##` (`<h2>`). An optional single `<h1>` may title the document but
is not parsed as a section. Present sections must appear in this order:

1. Overview (also "Brand & Style")
2. Colors
3. Typography
4. Layout (also "Layout & Spacing")
5. Elevation & Depth (also "Elevation")
6. Shapes
7. Components
8. Do's and Don'ts

Sections may be omitted when irrelevant — but if you omit `colors`, `typography`,
`spacing`, `rounded`, or `components` while the design clearly has them, the
linter flags the omission. Declare genuine omissions explicitly:
```yaml
omitted:
  - section: rounded
    reason: "No rounded corners in the brand book"
```

Do not list a section in `omitted` **and** define its tokens — that is a
`redundant-omission` warning.

Duplicate `##` headings are fatal: the file is rejected.

## Beyond the canonical sections

The eight canonical sections are the spine, not the whole vocabulary. The format
accepts any additional `##` heading — unknown sections are preserved rather than
rejected — so categories the spec does not standardise still belong in the
document:

- **Motion** — durations grouped by role, and the easing curves quoted verbatim.
- **Iconography** — stroke weight, corner treatment, grid size.
- **Imagery** — art direction, aspect ratios, treatment.
- **Theming** — what changes between light and dark, and what does not.

Give these prose only (they have no standard token group) and place them after
the canonical sections rather than interleaved, so the normative order stays
intact. A design's motion is often its most distinctive trait, so omitting it
leaves real character on the table.

## Token naming

Recommended, non-normative names that downstream tooling recognises:

- **Colors:** `primary`, `secondary`, `tertiary`, `neutral`, `surface`, `on-surface`, `error`
- **Typography:** `headline-display`, `headline-lg`, `headline-md`, `body-lg`, `body-md`, `body-sm`, `label-lg`, `label-md`, `label-sm`
- **Rounded:** `none`, `sm`, `md`, `lg`, `xl`, `full`

Unknown names are accepted as long as the value is valid, so descriptive names
(`telemetry-data`, `surface-container-high`) are fine and often clearer.

## Which lint findings to fix

| Rule | Action |
|---|---|
| `broken-ref` (invalid component property, dangling reference) | **Fix** — structural error |
| `redundant-omission` | **Fix** — logical contradiction |
| Duplicate section heading | **Fix** — file is rejected |
| `contrast-ratio` | **Keep** — report it; the real site may genuinely fail WCAG |
| `orphaned-tokens` | **Keep** — palette entries referenced only by prose are normal |

The goal is to document the design as it is. Fixing the document's structure is
correct; "fixing" the design's contrast is not.

## Prose carries the intent

Tokens give exact values; prose explains why they exist. A DESIGN.md whose prose
just restates the tokens is worth much less than one that names the reference
world: "a 1970s graduate lecture handout" carries more usable direction than a
dozen metric values. Write the Overview as the design's premise, and let each
section explain the reasoning behind its choices.
