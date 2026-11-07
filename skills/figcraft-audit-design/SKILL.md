---
name: figcraft-audit-design
description: Audits a FigCraft file for token use, contrast, tap targets, alt text, overlaps and misalignment, overflow, icon consistency and layer names, then fixes what it can with a dry run first. Use when the user says "audit this design", "design QA", "check contrast", "find hardcoded colors", "is this accessible", "are things aligned" or "lint the icons".
---

# Audit a design

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

Every check is read-only and returns machine-readable fixes. Run all of them, write one report, fix in small batches, run the checks again.

## Procedure

1. `checkpoint` with a `name` such as `before-audit`.
2. Run the checks below on the page (or on one frame with `root` / `ids`).
3. Write the report (format at the end).
4. Fix in this order: tokens, contrast, accessibility, layout, overflow, icons, names. Use `dryRun` on each fix, then apply it inside one `batch` with a `label`.
5. Re-run the same checks. Done when each reports zero, or only items you accepted.

## Checks and exact calls

All of these were run on a scene with a hardcoded blue, a `#BBBBBB` caption on white, an overflowing rectangle, a fixed-height text box and an icon with a wrong stroke.

### Tokens: audit_tokens

```json
{}
```

Optional: `page` (id, name or "all"), `root` (a layer), `limit`. Result: `hardcoded` (id, name, field, color, candidate `variables`), `fixes`, `bound`. Each `fixes` entry is one `variable.bind`:

```json
{"command":"variable.bind","params":{"ids":[3],"field":"fills/0/color","variable":"VariableID:1","dryRun":true}}
```

`dryRun` returns `wouldChange: [3]`. Apply all fixes in one step:

```json
{"label":"bind tokens","commands":[
 {"command":"variable.bind","params":{"ids":[3],"field":"fills/0/color","variable":"VariableID:1"}},
 {"command":"variable.bind","params":{"ids":[5],"field":"fills/0/color","variable":"VariableID:2"}}]}
```

After that `audit_tokens` returned `bound: 2, hardcoded: []`. Text layers are included, not only shapes. Only entries with exactly one matching variable appear in `fixes`; when several variables hold the same colour, choose one from `variables` yourself. The match is against the default mode's value only.

### Contrast: check_contrast

Whole page, or `ids` of text layers; `level` "AA" (default) or "AAA"; `all: true` also lists passing text:

```json
{"level":"AA"}
```

A failure has `ratio`, `requiredRatio`, `apcaLc`, `fg`, `bg`, `fixable`, `suggestion: {textColor, ratio}` (for example `#767676`, 4.54 on white). Text bound to a colour variable gets one entry per mode (`"mode":"Colors/Mode 1"`) and `boundVariable`.

- Bound text: fix the variable, not the layer. `variable.set` with `{"variable":"VariableID:2","value":"#595959"}` made the caption pass AAA (7.0) everywhere it is used.
- Unbound text: `set_properties` with `{"ids":[5],"props":{"fill":"#767676"}}`.
- `unknown` lists text over gradients, images or blended fills. Check those by eye or with a pair.
- One pair: `{"fg":"#767676","bg":"#FFFFFF","fontSize":16}` gives `aa`, `aaa`, `ratio`, `apcaLc`.
- A text that passes AA can fail AAA (white on `#1D4ED8` is 6.7). Ask which level the user needs; AA is the default.

### Layout: lint_layout

```json
{"checks":["overlap","misaligned","uneven-gap","tiny-target"]}
```

Optional `root`, `page` ("all" for every page), `grid` and `limit`; read-only. Result: `{total, listed, truncated?, findings: [{check, ids, message, fix?}]}`. Checks: `overlap` (siblings that intersect, no fix; auto layout children and absolute-positioned layers are skipped), `misaligned` (edges or centres 0.01 to 4 px from a shared line), `uneven-gap` (3 or more layers in a row or column with gaps differing by up to 4 px), `tiny-target` (button-like names or layers with interactions under 24x24, or 44x44 in frames up to 500 wide), `off-grid` (x/y not a multiple of `grid`, default 4). `off-grid` runs only when named, because it flags most free-form designs.

A `fix` is a command you can run as is. Run on two rectangles 2 px apart on the left edge, `{"command":"align.left","params":{"ids":[4,5]}}` cleared the finding. For a tiny target the fix is a `node.set` with width and height 44. Check a fix before applying: a misaligned centre and a misaligned left edge are separate findings for the same pair, and you want only one of them.

### Accessibility: check_accessibility

```json
{"limit":50}
```

Optional `root`, `page`. It returns `{issues, checks, details}`: `contrast` (as check_contrast), `targets` (24 px, or 44 px in frames up to 500 wide, for layers with interactions and frames, components or instances named like a button, link, tab, toggle or input), `nonText` (3:1 for a control's boundary and icons; gradients and images count as `unknown`), `alt` and a reading-order count. Each target failure carries a `node.set` fix. Single checks: `a11y.checkTargets`, `a11y.checkNonText`, `a11y.checkAlt`, `a11y.readingOrder` via `run_command`.

Alt text: `set_properties {"ids":[5],"props":{"alt":"Search"}}` stores it (`""` marks decorative, `null` clears) and `get_node` shows `alt`. `a11y.checkAlt` lists images (childless layers with an image fill), vectors and groups whose name says icon, logo, image, photo, illustration or avatar and that have no alt: a group named `icon/search` was listed as missing until alt was set. A plain rectangle named Photo with a solid fill was not checked. `a11y.readingOrder` gives the order a screen reader would use: auto layout order inside auto layout frames, otherwise rows top to bottom, left to right.

### Colour-blind preview: a11y.simulate

`run_command` `a11y.simulate` with `{"cvd":"deuteranopia","ids":[2],"scale":0.5}` (also protanopia, tritanopia, achromatopsia). Without `path` it returns the PNG as base64 in `data`; pass `path` to write a file.

### Overflow: inspect.overflow

```json
{"command":"inspect.overflow","params":{}}
```

Optional `root`, `page` ("all" for every page), `limit`. Items have `kind` (`outside-parent-clipped`, `effect-clipped`, `outside-parent`, `text-overflow`) and `detail` ("50 past right, 30 past bottom", "text is 90 tall, the box 16").

- Shape out of its frame: move or resize with `set_properties`. After `{"x":200,"y":120,"width":80,"height":60}` the item was gone.
- Fixed-size text too long: widen it and use `"textAutoResize":"height"`. Setting only `textAutoResize` made the text grow past the frame bottom (`20 past bottom`, a new item); `{"width":260,"textAutoResize":"height"}` cleared it.
- `effect-clipped` means a shadow, blur or outside stroke is cut by a clipping parent.

### Icons: lint_icons

Pass the icon-set frame:

```json
{"ids":[8],"strokeWeight":2,"grid":24}
```

Rules in the result: size, stroke-width, stroke-cap, stroke-join, corner-radius, color, pixel-grid, padding, naming. Each issue has `fix: {command:"node.set", params}` you can run as-is in a `batch`. Expected values default to the most common ones in the set, so a set of one icon is always its own baseline: pass `strokeWeight`. In this build the tool schema lists `cap`, `join` and `color`, but the engine rejected them (`unknown parameters cap, color`); only `ids`, `grid`, `strokeWeight`, `padding`, `tolerance` worked. To enforce a colour or cap, set it on the icons with `node.set`, then lint.

### Layer names

- `auto_name_layers` with `{"dryRun":true,"scope":"page"}` returns `renames: [{id, from, to}]`. It renamed the "Frame 2" holding one text to the text ("Buy now") but left "Rectangle 5" alone, so always read the dry run; do not assume every generic name is covered. Apply by calling without `dryRun`. One undo step.
- Find the rest: `find_nodes` with `{"nameRegex":"^(Rectangle|Frame|Group|Vector|Ellipse) [0-9]+$"}`.
- Rename in bulk with `run_command` `object.batchRename`: `{"where":{"nameRegex":"^Rectangle [0-9]+$"},"name":"shape/$nn","dryRun":true}` gives `shape/01`. `$n` counts up, `$N` down, `$nn` is padded.
- Choose names by role (`card/title`, `icon/search`), not by shape.

### Notes on the layer

`run_command` `annotation.add` with `{"id":5,"label":"Raise text/muted to 4.5:1"}` attaches a note to a layer; `annotation.list` reads them back.

## What FigCraft does not check

Focus order and heading structure have no check; judge them from `a11y.readingOrder` and the largest text in `summarize_document`. Tap targets are found by name or interaction only: an unnamed 30 px frame that acts as a button is not flagged, so also query sizes with `find_nodes` `{"type":"FRAME","height":{"max":43},"nameGlob":"button*"}`. Say in the report which checks were not available.

## Pitfalls

- A check that returns nothing may mean the wrong page. Pass `page: "all"` (`audit_tokens`, `inspect.overflow`) when the file has several.
- Fix ids come from the audit run. After a batch of renames or deletes, re-run the audit before reusing them; a batch with a stale id rolls back whole (`no such node 10`).

## Report format

```
Audit: <file / page>, <date>
Checkpoint: before-audit
Tokens:   N hardcoded -> N bound            (ids ...)
A11y:     N issues -> 0                     (targets, non-text, alt)
Layout:   N findings -> 0                   (check, ids)
Contrast: N failing AA -> 0                 (id, ratio, fix)
Overflow: N items -> 0                      (id, kind, detail)
Icons:    N issues -> 0                     (rule, id)
Names:    N generic -> N                    (renamed list)
Not checked: focus order, heading structure
Left for the user: <items with reason>
```

## Verify

Run `audit_tokens`, `check_contrast`, `check_accessibility`, `lint_layout`, `inspect.overflow`, `lint_icons` again and `screenshot` the changed frames. `undo` steps back one batch; `restore_version` with the checkpoint id and `"confirm":true` returns to the start.
