---
name: figcraft-files
description: Create, open and save FigCraft files, work in several documents at once, copy layers between files, summarize a file, and use versions (checkpoint, compare, diff, restore). Explains headless vs attached and auto-save. Use when the user says "new file", "open this .figcraft", "save", "work in two files", "copy this screen to the other file", "make a checkpoint", "go back to the earlier version" or "what changed since".
---

# figcraft-files

Read figcraft-use first for the tool basics. This skill covers documents, saving and versions.

## Headless vs attached

`diagnostics` tells you which one you have.

- Attached (`attached: true`): the MCP server drives the open FigCraft window. Edits show live. On attach the server switches the app's auto-save on (unless `FIGCRAFT_MCP_NO_AUTOSAVE=1`), so changes reach files that already have a path.
- Headless (`attached: false`): no window. The server holds an in-process engine with one untitled document. Edits change that copy only and are lost when the server stops unless you save. If a window is open at the same time, tool results end with a `NOT LIVE` warning; saving the file lets the window reload it when its tab has no unsaved changes.

Auto-save only writes files that have a path. A new untitled document must be saved once with a path before anything is persisted.

## Create and save

```json
{"command":"file.new","params":{"name":"Second"}}
```
via `run_command` makes a new document and (in the headless run) makes it the active one. `file.newFromTemplate {template}` builds one from `template.list` (ids such as `mobile-app`, `landing-page`, `dashboard`, `design-system`, `wireframe-kit`, `social-posts`). `file.newBoard` makes a board.

```json
{"path":"C:/work/app.figcraft"}
```
as `save_file` arguments saves the document. Confirmed:
- `save_file {}` on a never-saved document fails: `the file has no path yet: pass path`.
- After the first save, `save_file {}` saves to the same path. The document's name becomes the file name (`l1`).
- `run_command {"command":"file.saveAs","params":{"path":"C:/work/copy"}}` adds `.figcraft` when the path has no extension and returns `{bytes, path}`.
- A `.fig` path writes an experimental export copy and returns `warnings`.
- If another program changed the file on disk, `file.save` is refused until you pass `overwrite: true` (docs); check `changedOnDisk` in `diagnostics` first.

## Open files

```json
{"path":"C:/work/app.figcraft"}
```
as `open_file` arguments opens `.figcraft`, `.json`, `.fig`, `.sketch`, `.svg` or an image. The result has an `opened` block: `{id, index, summary: {name, pages, layers, images}}`. Use that `id` as `document`.

Confirmed headless behaviour: `open_file` adds the file as a new document but did not switch the active one. The following `create_node` without `document` still went into the old untitled document. Always pass `document` (or call `use_document`) right after opening.

With an attached app, `open_file` opens the file in a background tab and makes it the target document, leaving the user's tab alone. `open_file {focus: true}` also switches the window to it (docs).

## Several documents

List them: `run_command {"command":"doc.list","params":{}}` returns `[{index, id, name, dirty, active}]`. Ids are per document and layer ids repeat across documents, so name the document in every call.

```json
{"document":2,"where":{"name":"Home"},"props":{"name":"Home v2"}}
```
for `set_properties`. These tools take `document`: `run_command`, `batch`, `create_node`, `set_properties`, `inspect_document`, `get_node`, `select`, `find_nodes`, `get_nodes`, `contact_sheet`, `export`, `screenshot`, `save_file`, `undo`, `redo`, and the version tools. A `document` is an id from `doc.list` or an open file's path.

Set a default: `use_document {"document":1}` makes later calls without `document` act on 1 (confirmed: `find_nodes` then found only layers of document 1). `use_document {"document":null}` clears it and calls go back to the file in front. `diagnostics` shows `target`.

Run one call in every file:

```json
{"type":"FRAME","documents":"all"}
```
for `find_nodes` returns `{documents:[{document,name,ok,result}], total}`. `set_properties`, `run_command` and `get_nodes` take `documents` too. Use `dryRun` first when you change many files.

Copy layers: 

```json
{"from":1,"to":2,"where":{"name":"Home"},"x":300,"y":0}
```
for `copy_between_documents` returns `{copied, newIds, from, to}`. `x` and `y` are page coordinates of the pasted top-left and must be given together. The originals stay; `parent` (a layer in `to`) pastes into a frame. More than 200 layers is an error. The copy buffer is shared, so do not run two copies at the same moment from different agents.

## Versions

Versions live inside the file and persist once the file is saved.

1. `checkpoint {"name":"before-restyle"}` returns `{id, name, time}`. The id is a hash string; keep it.
2. Make changes.
3. `compare_version {"id":"<id>"}` returns `changed: [{name, changes:[{properties:[{property,before,after,text}]}]}]`. Confirmed: a width change shows `width 200 → 400`. Pass `node` to compare one top-level frame. At most 50 frames.
4. `restore_version {"id":"<id>"}` is refused with `pass confirm: true`. With `confirm: true` it replaces the design, as one undo step. The engine first saves the replaced state as an `Autosave` version (`auto: true` in `list_versions`), so a restore can itself be undone with `undo` or by restoring the Autosave.
5. `list_versions {}` lists them oldest first (default 30).

A checkpoint does not write the file; call `save_file` for that.

## Orient and diff

`summarize_document {"budgetTokens":2000}` is the first read in an unfamiliar file. It returns `counts` (pages, layers, components, instances, styles, variables), per page the top-level frames with `w`, `h`, `kids`, `layers` (the current page first), the largest text as `headings`, repeated element `families`, and `drill`, a list of the next calls. It fits the budget (100 to 50000) by showing less: `level` rises (0 is the most detail), `moreFrames`, `morePages`, `moreHeadings` and `moreFamilies` count what was left out, and `overBudget` is set if even the smallest level does not fit. With `budgetTokens: 300`, a six-layer file still listed its frame and heading.

`diff_documents` compares structure across files or versions, read-only:

```json
{"version":"1a1b494164a"}
{"a":1,"b":2,"limit":50}
```

- `version` (an id from `list_versions`) against the current file: layers match by id. Result: `counts {added, removed, moved, changed}`, `changed: [{id, path, type, changes: [{prop, old, new}]}]` (a rename and a width change on one frame came back as `name` and `width` rows), `added`/`removed` (top layer of each subtree, with a `layers` count), `moved: [{from, to}]`, `identical`.
- `a` and `b` (document ids from `doc.list`; `b` defaults to the file in front) compare two files: layers match by page and name path. `changed` rows then carry `idInA`.
- At most 8 properties per layer (`moreProps`), values clipped to 80 characters, `limit` 50 by default (max 1000) with `truncated`. Z-order changes are not reported. For every property of one frame use `compare_version`.

## Procedure for a typical task

1. `diagnostics`: attached or headless, which documents are open, `dirty`.
2. Open or create, note the `id`.
3. `checkpoint` before a large edit.
4. Edit with `document` set. Verify with `get_nodes` and `screenshot` (figcraft-use).
5. `save_file` with a path. Check `diagnostics` shows `dirty: false`.

## Pitfalls

- Layer ids repeat across documents; a call without `document` hits the target or the active file.
- `doc.list` and `diagnostics` hide the file path from agents (`path: null`), so keep paths you opened yourself.
- `screenshot {window:true}`, `pointer`, `key` and `type_text` always use the file in front, not the target.
- The docs say headless `open_file` activates the file; the headless run did not. Do not rely on either.
- `restore_version` replaces the whole design, including work done after the checkpoint. Run `compare_version` first.
