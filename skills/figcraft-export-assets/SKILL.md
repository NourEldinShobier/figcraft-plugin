---
name: figcraft-export-assets
description: Exports FigCraft layers as PNG, JPG, WebP, SVG, PDF or Android XML, whole icon sets in several scales, design tokens as CSS, DTCG or Tailwind, and the file as diffable text, and takes screenshots and contact sheets. Use when the user says "export these icons", "give me @2x PNGs", "export tokens", "save as PDF", "screenshot this", "preview all screens", or "hand off assets".
---

# Export assets

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

Pick the tool by what leaves FigCraft:

| Need | Tool |
|---|---|
| One layer or a composite, one format | `export` |
| Many layers x formats x scales | `export_many` |
| Whatever has export settings on the layers | `file.exportLayers` (via `run_command`) |
| Variables as tokens | `export_tokens` |
| Whole file as text for git | `export_source` |
| Look at a design | `screenshot`, `contact_sheet` |

## Procedure

1. Find the layers: `find_nodes` or `get_nodes`, and note their ids. Check names; export file names come from layer names.
2. Always pass `path` (single file) or `dir` (many files). Without them the bytes come back inside the tool result (an image block, SVG text, or base64) and large results fill the context.
3. Export, then check `bytes` and the list of `files` in the result.
4. Look at one result with `screenshot` or open the SVG text.

## Calls (all ran)

Raster at scale or size. `size` is `2x`, `512w` or `512h`; `scale` is a number (0.5 worked, 40 worked, 65 failed with `render failed (empty or too large)`, so the limit is 64):

```json
{"ids":[2],"scale":2,"path":"C:/out/home@2x.png"}
{"ids":[2],"size":"512w","path":"C:/out/home-512.webp"}
```

The format comes from `format` or the path extension (png, jpg, webp, svg, pdf, xml). `size` accepts only `Nx`, `Nw`, `Nh`; `"100000w"` is rejected with `size: 2x, 512w or 512h`.

SVG for an icon, returned as text, with the colour turned into `currentColor`:

```json
{"ids":[5],"format":"svg","iconPreset":true,"currentColor":"#111111"}
```

Result: `<svg width="24" height="24" viewBox="0 0 24 24" ...><path d="M4 12L20 12" ... stroke="currentColor" .../></svg>`. A new frame has a white fill, and the first SVG contained a white `<path d="M0 0L24 0L24 24L0 24Z" fill="#FFFFFF"/>`. Set `{"ids":[5],"props":{"fill":"none"}}` with `set_properties` first and the background path is gone. Other SVG options: `svgOutlineText` (default true; false keeps `<text>`), `svgIdAttribute`, `svgSimplifyStroke`.

Android Vector Drawable: `{"ids":[5],"format":"xml"}` returns the XML plus `{"bytes","format","warnings":[]}`; `vdCompat` is `bestEffort` (default), `exact` or `ignore`.

PDF of a layer: `{"ids":[2],"format":"pdf","path":"C:/out/home.pdf"}`. Print options: `bleed` ("3mm"), `cropMarks`, `bleedMarks`, `cmyk`. All top-level frames as one multi-page PDF:

```json
{"command":"file.exportFramesPdf","params":{"path":"C:/out/all-frames.pdf"}}
```

It returned `pages: 4` for four frames, one page per frame.

Several ids in one `export` call are composited into one image. Use `export_many` for one file per layer.

### Icon sets

```json
{"ids":[5,7],"formats":["svg","png"],"scales":[1,2],"dir":"C:/out/icons","iconPreset":true}
```

Result `files: [{name, id, format, scale, bytes, path}]`. Names: `icon/search.svg`, `icon/search@1x.png`, `icon/search@2x.png`. A `/` in a layer name makes a folder (`icons/icon/search.svg`); pass `"naming":"{name}.{ext}"` to change the template (`{name}`, `{id}`, `{scale}`, `{format}`, `{ext}`); the command `file.exportMany` also takes `"flatten":true` to turn `/` into `_`. SVG ignores `scales`. Without `dir`, the result holds `data: {name: base64}`.

### Export settings on layers

When a layer should always export in set ways (design handoff), add settings and export them together:

```json
{"command":"export.add","params":{"ids":[2],"setting":{"size":"2x","suffix":"@2x","format":"png"}}}
{"command":"export.add","params":{"ids":[2],"setting":{"format":"svg"}}}
{"command":"inspect.assets","params":{"ids":[2,5,7]}}
{"command":"file.exportLayers","params":{"ids":[2],"dir":"C:/out/settings"}}
```

`inspect.assets` listed `Home` as `kind: export` (`PNG 2x`, `SVG 1x`) and the two vector frames as `kind: icon`. `file.exportLayers` wrote `Home@2x.png` and `Home.svg`. `"assets":true` exports icons and images too; `"zip":true` without `dir` returns one base64 zip.

### Tokens

`export_tokens` with `format`:

- `css`: custom properties, default mode on `:root`, other modes on `[data-theme="Dark"]`. Ran: `--brand-primary: #1D4ED8;` and the dark value.
- `dtcg` (default): `{files: [{name: "Colors.Light.tokens.json", collection, mode, tokens}]}`, colours as `{colorSpace, components, hex}`. With `path` it writes a folder, one file per mode.
- `tailwind`: `{theme: {extend: {colors, ...}}, text}`. `text` is an `@theme static` stylesheet that defines the same `--color-*` names the `theme` values read (an older build defined `--brand-primary` while the theme read `--color-primary`; update FigCraft if you still see that).
- `json`: the local variables JSON.
- `dtcg-styles`: text styles as `typography`, effect styles as `shadow`, paint styles as `color`, `gradient` or (under `Border/`, `Stroke/`) `border`, with FigCraft data in `$extensions["com.figcraft"]`; `skipped` lists styles with no DTCG type.
- `style-dictionary`: a v4 scaffold in `files`: a config and a token file per collection and mode (hex colours, `16px`), plus the styles. `resolver`: `tokens.resolver.json` with modes as modifier contexts, plus the token files.
- `swift`, `kotlin` (text) and `android` (`values/colors.xml`, `values/dimens.xml`, `values-night/colors.xml`): native constants; the default mode uses the variables' iOS / ANDROID code syntax names. With `path` the multi-file formats write a folder.

`collection` and `modes` narrow the output. `variable.importTokens` reads DTCG back.

### File as text

```json
{"path":"C:/out/source"}
```

A path with no extension is a folder: `design.jsonl` (one sorted JSON object per line, 12 lines for the sample) plus `images/<hash>`. A path with an extension writes that one file. Export twice, get identical bytes; one fill change is one changed line, so commit it. Read it back with `run_command` `file.importSource`.

### Looking at results

- `screenshot` `{"ids":[2],"scale":3,"maxSize":400}` returned a 400x267 image: `scale` is reduced to fit `maxSize` (default 1600). No `ids` renders the current page.
- `screenshot` with `marks` draws numbered badges on layers and returns the legend, so you can refer to parts of a screen by number: `{"ids":[2],"marks":true,"markDepth":1}` gave `marks: {style, badges: [{badge, id, name}]}` with one badge for the frame and one per direct child. `marks` can be `{ids, style, limit}`: `style: "id"` prints layer ids instead of 1, 2, 3; `limit` defaults to 60 (max 200) and a `truncated` note says how many were marked. `markDepth` is 0 to 5 (default 1; 0 marks only the layers themselves). Hidden layers and layers outside the picture get no badge, and `marks` is ignored with `window: true`. The badge number is not the layer id unless `style` is `id`.
- `contact_sheet` `{"ids":[2,4,5,7],"columns":2}` renders each layer on its own into one PNG with numbers, plus a legend `{frames: [{index, id, name, width, height}]}`. At most 64 layers; `scale` defaults to 0.25 and `maxSize` to 2400, and the scale is lowered when the sheet would pass `maxSize`. Use it to review every screen in one image.
- `cvd` on `screenshot` or `export` (PNG only) shows deuteranopia, protanopia, tritanopia or achromatopsia.

## Write root

The server may be started with `--automation-write-root DIR`. Then writes outside DIR fail with `automation path rejected: <path> is outside the folders that may be written: <DIR>`, for `export {path}` and `export_many {dir}` (both confirmed); the docs list `save_file` and `open_file` too. Read the folder from the error or the server's `initialize` instructions and write there. Without that flag any path is allowed. With only a read root nothing can be written; export without `path` instead.

## When a result is too large

- Pass `path` / `dir` so bytes go to disk, not into the reply.
- Export fewer layers per call, or lower `scale`/`size`. A 300x200 frame at scale 40 (12000x8000) wrote a 1.9 MB PNG; scale 65 failed.
- For the page overview use `contact_sheet` at its default 0.25 instead of full-size screenshots.
- For outlines of many layers use `get_nodes` with `fields`, not full `get_node` trees.

## Pitfalls

- `export` with no `ids` uses the selection, else every top-level layer of the page. Always pass `ids`.
- Windows paths: forward slashes work. `export_many` results print `dir\icon/search.svg`, mixed separators, all valid.
- `iconPreset` bakes transforms and uses the layer's box as `viewBox`; a frame with extra padding gives an SVG with that padding.
- Export settings on layers (`export.add`) do not apply to `export` and `export_many`; they apply to `file.exportLayers`.

## Verify

List the output folder, check `bytes` is non-zero, and `screenshot` the source layer to compare. For SVG read the text for `currentColor` or the expected colours.
