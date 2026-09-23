# Extraction pitfalls

Hard-won lessons from running this workflow against real production sites.
Read this before starting; each item below cost real time to diagnose.

## The 50KB output ceiling

MCP text output is truncated at 50KB. Once truncated, the payload is unusable —
you cannot parse a half-written JSON array. A naive `querySelectorAll('*')` dump
easily produces 90KB+.

**Defences, in order of importance:**

1. **Deduplicate inside the page.** Collect into a `Map` keyed by a style
   signature, then return `[...seen.values()]`. This alone removes most volume.
2. **Split by concern.** Run one extraction per component family (palette,
   typography, components, layout) instead of one mega-query. The bundled
   scripts are already split this way.
3. **Return only the fields you need.** Skip `transform`, `filter`, `willChange`,
   `animation`, a11y properties — unless the design system actually uses them.
4. **Cap every list.** Sort by frequency and `slice(0, N)`. The head of a
   frequency-sorted list is the real system; the tail is one-off noise.
5. **Truncate long strings.** `textContent.slice(0, 32)`, `boxShadow.slice(0, 60)`.

If a result still feels large, add a `capped: true` flag so you know you are
looking at a prefix rather than the whole picture.

## File writes may be blocked by workspace roots

`take_screenshot` and `take_snapshot` accept a `filePath`, but the path must sit
inside a configured workspace root. Writing to the project directory can fail
with:

```text
Error: Access denied: path ... is not within any of the configured workspace roots.
```

**What to do:** omit `filePath` and take the inline result instead. Do not spend
time guessing allowed paths. If you genuinely need a screenshot on disk, use the
Playwright CLI, which writes wherever you tell it to.

## Screenshots are not always consumable

If the model in use does not accept images, a screenshot comes back as
`(tool image omitted: model does not support images)`. This is not a failure of
your approach — computed styles are the better source anyway. Reach for
`evaluate_script` first and treat screenshots as a bonus.

`take_snapshot` is different: it returns a **text** accessibility tree, which is
always consumable and is the fastest way to understand the page's structure
before extracting styles.

## JavaScript runs with no type checking

A typo in a returned object key fails only at runtime, e.g. `borderRadii is not
defined`. Keep extraction functions small and build them incrementally: start
with a two-line probe (`() => document.title`), confirm it works, then grow the
function. Do not write a 60-line script and hope.

## SPA and async content

`browser_navigate` returning does not mean the app has rendered. Signs that you
are reading a skeleton: very few DOM elements, uniform placeholder colors, no
headings.

**What to do:**

- Call `take_snapshot` first and check that real headings and labels exist.
- If empty, wait for a selector that only exists when loaded:
  `evaluate_script` with a function that resolves on an `MutationObserver` or a
  polling loop with a bounded timeout.
- For route changes, navigate and wait again rather than reusing the old DOM.

## Cross-origin stylesheets

Reading `document.styleSheets[i].cssRules` throws a `SecurityError` for
cross-origin sheets (fonts, CDN'd resets, third-party widgets). Always wrap in
`try/catch` and count the failures — a high `blocked` count means the
stylesheet-based variable scan is incomplete, so lean on computed styles
instead.

## Root variable enumeration is noisy; stylesheets are the goldmine

The obvious way to find a site's tokens is to enumerate custom properties on
`:root`. On a Tailwind or component-library site this is disappointing: you get
`--tw-translate-x`, `--tw-ring-shadow`, `--tw-backdrop-blur`, and dozens more
framework internals, most of them empty strings.

**Walk the stylesheets instead.** Recursing through `cssRules` (including nested
`@media` and `@supports` rules) and reading each rule's declared custom
properties surfaces the site's real token system. On one production console this
found 560 semantic tokens under a single namespace — colour roles, a text
hierarchy ramp, radius scale, motion curves, z-index layers — where the root scan
had shown almost nothing useful.

Two rules make the stylesheet walk pay off:

- **Skip framework internals.** Filter names like `--tw-*` or you will drown in
  Tailwind machinery.
- **Group by namespace prefix** (e.g. `acme-web-color-*`) and report group
  counts. The namespaces alone tell you whether a token system exists and how it
  is organised, before you read a single value.

Watch for repeated namespaces that mean the same thing — a site may carry both
`--acme-web-color-primary` and `--legacy-color-primary`. Prefer the namespace
that appears on the live root scope.

## Pure black is a default, not a design decision

When ranking text colours by frequency, `rgb(0, 0, 0)` will top the list on
almost any page — it is the browser default inherited by thousands of layout
wrappers that never set a colour. Filter it out, along with `transparent` and
`rgba(0, 0, 0, 0)`. The real text palette then surfaces: on one page, filtering
pure black revealed an ink colour with a clean 0.9 / 0.6 / 0.4 / 0.24 alpha
ramp that matched the site's own tokens exactly.

## Colour values need clustering, not listing

A real page yields 30–60 distinct colour strings, but only 4–8 are meaningful
design colours. Most of the tail is alpha variants, anti-aliasing artefacts, and
one-off states.

**How to cluster:**

- Treat `rgb(20, 21, 28)` and `rgba(20, 21, 28, 0.6)` as the same hue with
  different opacity — a text-hierarchy ramp, not three colours.
- Group by hue family and roughness, then check frequency. A colour used 400
  times is structural; one used twice is incidental.
- Prefer the site's own CSS variables when present: they are already clustered
  by the design team.

## Do not invent tokens to match a template

It is tempting to fill `secondary`, `tertiary`, and a full spreading scale
because the spec mentions them. A design with one accent colour and two radii is
a complete design. Inventing tokens produces a document that describes a system
the site does not have.

If a role genuinely does not exist, either omit the section (declaring it in
`omitted`) or say so in prose.

## Respect intentional low contrast

Disabled controls and translucent "ghost" surfaces legitimately fail WCAG
contrast checks. The linter will flag them. Record them; do not "fix" them by
changing the extracted value. Your job is a faithful description, and the
finding itself is useful information for whoever reads the DESIGN.md.

## Verify the source, not just the output

Always run the linter on the generated file:

```bash
npx @google/design.md lint DESIGN.md
```

Structural findings (`broken-ref`, `redundant-omission`, duplicate headings) are
yours to fix. Design findings (`contrast-ratio`, `orphaned-tokens`) are yours to
report. An export smoke test confirms the YAML actually parses end to end:

```bash
npx @google/design.md export DESIGN.md --format css-vars
```
