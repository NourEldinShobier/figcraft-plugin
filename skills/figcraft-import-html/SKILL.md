---
name: figcraft-import-html
description: Turns static HTML and CSS into editable FigCraft layers with import_html, mapping flow and flexbox to auto layout, and reading the warnings for what was dropped. Use when the user has a web page or snippet and says "import this HTML", "bring this page into FigCraft", "turn this markup into a design" or "convert this landing page".
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
- Sizes: width, height, min and max in px, % and em. Margins become padding frames; `margin: auto` centres.
- Paint: background colour, simple `linear-gradient`, borders, border radius, `box-shadow`, opacity, overflow.
- `<style>` blocks and `style` attributes apply, with tag, `.class`, `#id` and descendant selectors, specificity, `!important` and custom properties with `var()`.
- `<img>` with a `data:` URI becomes an image; inline `<svg>` becomes vector layers.

## What does not

Each unsupported feature is listed once in `warnings`. A page with a media query, a remote image and a grid returned:

```
at-rule @media is not supported (skipped)
<img> without a data: URI is not fetched (drawn as a placeholder rectangle)
property `grid-template-columns` is not supported (ignored)
display: grid is not supported (laid out as a block)
```

Also unsupported: positioning, transforms, `calc`, pseudo-selectors, remote stylesheets and list markers. Video, canvas, iframes and form controls become grey rectangles.

Limits: 5000 layers (then `truncated: true`), 2 MB, 100 distinct warnings. Flex items stretch to equal height only when the container has a fixed height.

## Procedure

1. Run with `dryRun: true` when the source is large, and read `warnings`.
2. Import, then `screenshot` the `rootId` and compare with the page in a browser.
3. Rebuild grid areas by hand as auto layout frames (figcraft-generate-design).
4. Replace placeholders with the real images.
5. If the file has variables, run `audit_tokens` and bind literal colours (figcraft-audit-design).
6. `undo` removes the whole import.

## Pitfalls

- Do not expect pixel parity; check sizes with `get_nodes`.
- It reads markup, not a rendered page: content added by scripts is missing.
