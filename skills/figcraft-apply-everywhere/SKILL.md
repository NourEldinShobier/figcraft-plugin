---
name: figcraft-apply-everywhere
description: Carries one design change to the same element on every other screen or file in FigCraft, with a preview before anything is written. Use when the user says "apply this to all screens", "update every header", "make the other cards match", "change it everywhere", "sync this across files", or has just edited one layer that is repeated.
---

# Apply a change everywhere

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

FigCraft groups repeated elements into families. You change one layer, ask which layers are its twins, preview the copy, then confirm. Nothing is written until `confirm: true`.

## When to use

- A header, card, button or nav bar exists on several frames and one copy was just changed.
- The same edit must reach several files.
- Not for creating variants. If the element should be a shared component, make it a component instead; propagation copies looks, it does not link layers.

## Procedure

1. Change the source layer with `set_properties`. Its result carries `similarOn`: `{from, hint, total, twins}` when the layer has twins. That is the same data `find_similar` returns, so you often do not need a second call.
2. Review the twins. Each has `score`, `reasons` ("same structure", "same name", "same size", "same family tag"), `frame` and `sameFrame`.
3. Drop the false twins (see below) by passing only the real ones as `ids`.
4. Preview: `propagate_change` without `confirm`. It returns `changed` (id and prop names per twin) and `skipped`.
5. Apply: the same call with `"confirm": true`. One undo step.
6. Verify with `get_node` on one twin, and `screenshot` of two screens.

## Calls (all run on a fresh headless session)

Change the source. `set_properties` takes its values inside `props`, not at top level:

```json
{"ids":[3],"props":{"fill":"#DC2626","cornerRadius":12}}
```

Find twins (default `minScore` 0.6):

```json
{"id":3}
```

Preview, then apply. Without `ids` the twins are the layers scoring at least 0.8:

```json
{"from":3}
{"from":3,"confirm":true}
```

Preview result for two twins:

```json
{"preview":true,"result":{"wouldChange":[6,9],"result":{"changed":[{"id":6,"props":["cornerRadius","fills"]},{"id":9,"props":["cornerRadius","fills"]}],"skipped":[],"twins":2}}}
```

Copy only some properties (names as `get_node` shows them, for example `fills`, `cornerRadius`, `fontSize`):

```json
{"from":3,"props":["fills"],"deep":false,"confirm":true}
```

Force specific layers regardless of score:

```json
{"from":3,"ids":[11],"confirm":true}
```

## What propagation copies and does not copy

- Default: every look property that differs: fills, strokes, effects, corner radius, opacity, type style.
- Never by default: name, text content, position, size.
- Text content only when you name it: `"props":["characters"]`. Confirmed: text 7 became the source's text and then showed `"overrides":["characters"]`.
- `deep` (default true) pairs children by position when both layers have the same child types and copies their looks too. Confirmed: a header's title text received the source title's fill and font size. Use `"deep":false` when only the frame itself should change.
- A twin that has an extra or different child scores below 0.8 and is left out of the default twin list (a header with an added rectangle scored 0.77, reasons "same name", "same size"). Pass its id in `ids` if it should still receive the change.
- Layout, auto-layout, constraints and component structure are not what this tool is for. Change those with `set_properties` on `where`/`ids`.
- A `skipped` entry such as `{"prop":"overrides","why":"invalid parameters for node.set ..."}` can appear on text children. It means that one property was not copied; the rest was.

## Deciding which twins are real

`find_similar` scores by family tag, shared component, structure, name and size. Name plus size plus structure gave 1.0 for three headers on three screens. Check before confirming:

- `sameFrame: true` means the twin sits in the same frame as the source. That is usually a second element, not another screen. Remove it from `ids` unless you meant it.
- A different name with the same size scored 0.3 ("same size" only), below the default 0.8, so a banner built like a header is not touched. Do not lower `minScore` to catch it; tag it instead.
- Tag layers that are the same element but look different: `run_command` `family.set` with `{"ids":[3,6,9,11],"family":"app-header"}`. Tagged layers score 1.0 ("same family tag") whatever their name or size, so tagging a banner makes it a twin. Tag only layers you want changed together.
- `run_command` `family.list` returns `families` (tagged) and `suggested` (untagged layers with one name, type and structure on two or more frames). Use `suggested` to find repeated elements before an edit.
- The tag is stored in the layer's `pluginData` as `figcraft.family`.

## Several files

- `set_properties`, `find_nodes`, `get_nodes` and `run_command` accept `"documents":"all"` (or a list). The result is one entry per open file. Always add `"dryRun":true` first; "all" means every open file, including ones the user did not mention.

```json
{"where":{"name":"Header","type":"FRAME"},"documents":"all","props":{"fill":"#0F766E"},"dryRun":true}
```

- `find_similar` and `propagate_change` do not take `documents`. Call them once per file with `document` (an id from `run_command` `doc.list`, or a path).
- `copy_between_documents` copies layers from one open file to another: `{"from":"<path or id>","to":"<path or id>","where":{"name":"Header"},"x":0,"y":400}` (use exactly one of `ids` or `where`). It copies, the originals stay, and the new layers have new ids (`newIds`) with no link to the originals.
- Headless sessions hold several files only if they have different paths. Opening the same path twice reuses the same document; `copy_between_documents` with an id that is not open fails with `no open document 2`. `open_file` the second file first.

## Pitfalls

- A misspelled name in `props` is ignored: `{"props":["nope"]}` returned `changed: []`, not an error. An empty `changed` with `twins > 0` means the twins already match or the property name is wrong.
- `propagate_change` with a `from` that does not exist is an error (`no such node 9999`). With no twins it returns `twins: 0` and changes nothing.
- Explicit `ids` skip the score check entirely.
- The preview is `dryRun`; the real call is a separate one. If the layers changed between them, preview again.

## Undo

- `propagate_change` with `confirm` is one undo step: `undo` reverts all twins at once (confirmed: twin 9 went back to its old fill).
- `undo` takes `document` for multi-file edits. Undoing in one file leaves the other changed.
- Before a large multi-screen edit call `checkpoint` with a `name`; `restore_version` with the returned `id` and `"confirm":true` goes back, and is itself undoable.

## Verify

1. `find_nodes` with `fill` or `name` to count how many layers now have the new value.
2. `get_node` with `depth` 1 on one twin to confirm children.
3. `contact_sheet` of the affected frames to compare screens in one image.

The `apply_everywhere` prompt (`scope` "file" or "all") runs this same workflow.
