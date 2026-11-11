---
name: figcraft-import-html
description: Turns static HTML and CSS into editable FigCraft layers with import_html, mapping flow, flexbox, grid and absolute positioning to layout, and reading the warnings for what was dropped. Use when the user has a web page or snippet and says "import this HTML", "bring this page into FigCraft", "turn this markup into a design" or "convert this landing page".
---

# Import HTML

Read figcraft-use first for ids vs selection and the verify loop.

`import_html` converts a static page or fragment into layers as one undo step. It is best effort and bounded: it runs no scripts and fetches nothing. Treat the result as a starting point and read `warnings`.

## Call

```json
{"html":"<style>.nav{display:flex;justify-content:space-between;padding:16px;background:#0f172a;color:#fff} .btn{background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px}</style><div class='nav'><b>Acme</b><a class='btn'>Sign up</a></div><h1>Build faster</h1>","width":480}
```

Pass `html` (up to 2 MB) or `path` (an `.html` file inside the allowed read roots), not both: both returned `pass html or path, not both`, and a missing file returned the operating system's error. Other arguments: `width` (viewport width in px), `parent` (a frame or the page), `dryRun`.

Result: `{rootId, created, warnings, truncated?}`. The root is a frame as wide as `width`, named after the page title. Layers are named after the markup (`div.nav`, `a.btn`); text layers after their text.

## What maps

- Block flow becomes a vertical auto layout frame. `display: flex` becomes auto layout with `flex-direction`, `gap`, `justify-content`, `align-items`, `flex-wrap` and `flex-grow`. In the call above `div.nav` came out horizontal with `mainAlign: spaceBetween` and padding 16, and `a.btn` vertical with padding 10/16.
- Text becomes text layers; inline bold, italic, colour, size and underline become ranges.
- `display: grid` becomes a grid layout frame. Columns and rows take px, em, rem, `fr`, `auto` and `repeat(n, ...)`; `gap` carries over. `grid-template-columns: repeat(3,1fr)` came out as `mode: grid` with three `fill` column tracks.
- `position: absolute` becomes an absolute child with constraints from `top`, `right`, `bottom` and `left`: a badge at `top:8px; right:8px` came out `absolute: true` with constraints right and top.
- A flex row stretches its items to equal height: two `flex:1` cards with different text both came out 73 high with `sizing.vertical: fill`.
- `@media` blocks with `min-width` and `max-width` apply against the `width` you pass: a `max-width:600px` rule changed a three-column grid to two columns at `width: 480`, and did nothing at `800`.
- `:first-child`, `:last-child` and `:nth-child(n)` selectors work. Siblings include a `<style>` element in the same parent, as in a browser.
- Sizes: width, height, min and max in px, % and em. Margins become padding frames; `margin: auto` centres.
- Paint: background colour, simple `linear-gradient`, borders, border radius, `box-shadow`, opacity, overflow.
- `<style>` blocks and `style` attributes apply, with tag, `.class`, `#id` and descendant selectors, specificity, `!important` and custom properties with `var()`.
- `<img>` with a `data:` URI becomes an image; inline `<svg>` becomes vector layers.

## What does not

Each unsupported feature is listed once in `warnings`. A page with a print media query, named grid areas, a transform, a `calc` width and a remote image returned:

```
media query `print` is not supported (skipped; only min-width and max-width work)
property `grid-template-areas` is not supported (ignored)
property `transform` is not supported (ignored)
`width: calc(100% - 10px)` is not supported (ignored)
<img> without a data: URI is not fetched (drawn as a placeholder rectangle)
```

Selectors other than tag, `.class`, `#id`, descendant, `:first-child`, `:last-child` and `:nth-child(n)` skip the rule with a warning (`:hover`, `::before` and `:not()` did). `minmax()` tracks use their maximum, also warned. Remote stylesheets and list markers are not supported. Video, canvas, iframes and form controls become grey rectangles.

Limits: 5000 layers (then `truncated: true`), 2 MB, 100 distinct warnings.

## Procedure

1. Run with `dryRun: true` when the source is large, and read `warnings`.
2. Import, then `screenshot` the `rootId` and compare with the page in a browser.
3. Rebuild what the warnings list as dropped by hand, for example named grid areas as nested auto layout or grid frames (figcraft-generate-design).
4. Replace placeholders with the real images.
5. If the file has variables, run `audit_tokens` and bind literal colours (figcraft-audit-design).
6. `undo` removes the whole import.

## Pitfalls

- Do not expect pixel parity; check sizes with `get_nodes`.
- It reads markup, not a rendered page: content added by scripts is missing.
