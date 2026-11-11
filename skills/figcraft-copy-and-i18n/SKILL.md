---
name: figcraft-copy-and-i18n
description: Reads all the copy in a FigCraft file with extract_text, writes new or translated copy back as one undo step with apply_text, checks which strings no longer fit their boxes, and stress-tests layouts with pseudo-localization. Use when the user says "translate this design", "rewrite the copy", "export all the text", "does German fit", "localize", "pseudo-localize" or "fix the typos".
---

# Copy and localization

Read figcraft-use first for ids, `dryRun` and the verify loop, and figcraft-bulk-edits for checkpoints and `maxAffected`.

## Procedure

1. `checkpoint {"name":"before-copy"}`.
2. Read the copy: `extract_text {}` (open page), `{"page":"all"}` or `{"root":2}` for one frame. Results are in layer order, so the text of one screen is together.
3. Write the new copy per layer id.
4. Preview: `apply_text` with `dryRun: true`, and read `fit` for each layer.
5. Fix strings that do not fit (shorter copy, wider box), apply without `dryRun`.
6. `check_changes` and `screenshot` the frames (figcraft-bulk-edits).

## extract_text

```json
{"root":2,"limit":500}
```

Each entry is `{id, name, characters, path, frame, fontSize, maxWidth?, autoResize, styled, inInstance?}`:

- `path` is the names of the layers above it and `frame` the nearest frame id, so you can give a translator the context ("Screen A / Title").
- `maxWidth` appears when the box has a fixed width, `autoResize` says how it grows (`widthAndHeight`, `height`, `none`).
- `styled: true` means character runs with their own style or a link.
- `inInstance: true` marks text inside an instance; the component's own text is a separate entry.
- `limit` defaults to 500 (up to 5000); `total` counts all and `truncated` appears when some were cut.

## apply_text

```json
{"changes":[{"id":3,"characters":"Willkommen zurueck bei der Anwendung"},{"id":4,"characters":"Weiter"}],"dryRun":true}
```

Result: `{applied, unchanged, dryRun, results: [{id, name, changed, fit, was, lines, height, lost?}], refused: [...]}`.

- `fit` is `ok`, `overflow` or `truncated`, measured after the change in the real layout; `was` is the state before. A title in a fixed 100 by 30 box went from `ok` to `overflow` with 6 lines and a height of 174. A text that grows (`autoResize` `height` or `widthAndHeight`) reports `ok` and makes the box bigger, which can push other layers: check the frame afterwards.
- A layer with several character styles or links is refused unless `flatten: true`: `refused: [{id, reason: "mixed styled runs: pass flatten: true to drop them", lost: {runs, styledChars, properties, links}}]`. With `flatten: true` the whole layer takes the first style and the result's `lost` repeats what went. Do not flatten without telling the user.
- Text inside an instance can be written too (it ran on an instance's `Label`). The component's own text is a separate layer with its own id.
- An unknown id fails the call (`no layer 99`) and changes nothing. All changes are one undo step.
- `maxAffected` (default 200) and `confirm` apply as in figcraft-bulk-edits; `ifRev` guards against stale reads.
- Layer names are not renamed when the copy changes; `auto_name_layers` renames generic names only.

## Pseudo-localization

`run_command {"command":"text.pseudoLocalize","params":{"mode":"expand","root":2}}` rewrites every text under `root` (default the page) to find layouts that break. Modes: `accent`, `expand`, `both`, `restore`. In `expand` mode "Weiter" became `[Weiter lor]`: wrapped in brackets and padded with filler so the string is longer. The result lists `changed`, `overflow` (layers whose box no longer fits) and `skipped`. `restore` puts the original copy back (`restored: 2` in the test) and is the way out, so run it before you hand the file on; it is also covered by `undo`, and a checkpoint before it is cheap.

Use it before translating: fix the overflowing boxes first (fill sizing, auto layout, `wrap`), then the real translations fit more often.

## Pitfalls

- Translating a heading and its subtitle separately loses context; send `path` with the string.
- Length changes between languages by 30 percent or more; leave room or use auto layout. Check `fit` for every language, not once.
- Numbers, names and placeholders inside a string (`{name}`) must survive; compare `characters` before and after with `extract_text`.
- Variables of type string are not text layers. `extract_text` reads layers; change string variables with `variable.set` (figcraft-generate-library).
- Text on other pages needs `page: "all"`, or you will think the file has less copy than it does.
