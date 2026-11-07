---
name: figcraft-use
description: Foundation for driving FigCraft through its MCP tools: which tool to pick, coordinates, auto layout, ids vs selection, where/list/dryRun, batch with $ref steps, undo, checkpoints, cheap reads and the verify loop. Use when the user asks to create, edit, inspect or fix anything in a FigCraft file, or before using any other figcraft skill.
---

# figcraft-use

FigCraft has no JavaScript execution tool like Figma's `use_figma`; for loops and conditions use `run_script` (Rhai, see figcraft-scripting). You work with about 54 tools; the generic ones are `create_node`, `set_properties`, `find_nodes`, `get_node`, `get_nodes`, `screenshot`, `batch` and `run_command`. Every menu item, panel action and shortcut is a command with an id (`node.set`, `layout.add`, `comment.reply`). Find ids with `list_commands`, run them with `run_command` or `batch`.

## When to use

Any read or write on a FigCraft document. The other figcraft skills assume you know this one.

## Picking a tool

| Need | Tool |
|---|---|
| Which commands exist | `list_commands {"filter": "layout.", "limit": 50, "offset": 0}` (default 400 per page; a note says how many are left) |
| Orient in an unfamiliar file | `summarize_document` (counts, frames per page, headings, repeated families, within `budgetTokens`) |
| One new layer | `create_node` |
| Change layers | `set_properties` with `ids`, `where` or `list` |
| Anything else (components, variables, styles, comments, pages) | `run_command {command, params}` |
| Loops, conditions, bulk edits in one undo step | `run_script` (figcraft-scripting) |
| Several steps as one undo step | `batch` |
| Find layers | `find_nodes` (ids; `details: true` adds geometry) |
| Outline of many layers | `get_nodes` |
| One layer in full | `get_node {id, depth, fields}` |
| Look at it | `screenshot {ids, scale}`; `contact_sheet` for many frames |
| Backend, open files, dirty state | `diagnostics` |

`find_nodes`, `get_nodes`, `contact_sheet`, `get_selection` and `diagnostics` never change the selection or the view. Prefer them for reads.

## Rules that cause most mistakes

1. Coordinates: x right, y down, page units. `create_node` and `set_properties` take x/y relative to the parent (page coordinates when there is no parent). `absoluteBounds` in results is in page coordinates. Confirmed: a chip at x 10, y 20 in a frame at 500, 300 reports `absoluteBounds` x 510, y 320.
2. Ids are integers and belong to one document. Anywhere an id is accepted you can also write `"#12"` or `"figcraft://node/12"` (both ran). Two open documents can both have a layer 2. Pass `document` whenever more than one is open.
3. Children of an auto layout frame are placed by the layout. Set `layout`, `gap`, `padding`, `mainAlign`, `crossAlign` (`min|center|max|baseline`) and `sizingH`/`sizingV` (`fixed|hug|fill`) instead of x/y. `crossAlign: "stretch"` is rejected; make the children `sizingH: "fill"`.
4. A frame created with `layout` and no size is a fixed 100 px frame. Pass `sizingH` and `sizingV` as `"hug"` to wrap content.
5. New layers become the selection, and commands without `ids` act on the selection, which may be the user's. Always pass `ids`, `where` or `list`. Add `keepSelection: true` to leave the user's selection alone.
6. Colours are `"#RRGGBB"` or `"#RRGGBBAA"`. `fill: "none"` removes a fill.

## Style props in create_node

Style keys can sit beside `type` or inside `props`. Confirmed call:

```json
{"type":"frame","name":"Card","x":100,"y":80,"width":320,"height":200,"fill":"#FFFFFF",
 "props":{"layout":{"mode":"vertical"},"gap":12,"padding":16}}
```

`layout.mode` is `vertical`, `horizontal` or `grid`. `padding` takes a number or `[top,right,bottom,left]`. Text:

```json
{"type":"text","parent":2,"text":"Hello","props":{"fontSize":24,"fontStyle":"Bold","fill":"#0F172A"}}
```

Default text is Inter 12 px black. `fontStyle` names are style names such as `Regular`, `Semi Bold`, `Bold`.

## where, list and dryRun

`where` takes the `node.find` filters: `root`, `name`, `nameRegex`, `nameGlob`, `type`, `text`, `component`, `fill`, `stroke`, `width`, `height`, `parent`, `variant`, `limit`. Types are upper case: `FRAME`, `TEXT`, `RECTANGLE`, `COMPONENT`, `INSTANCE`.

Preview every bulk edit:

```json
{"where":{"type":"TEXT"},"props":{"fontSize":24},"dryRun":true}
```

It returns `{dryRun, matched, ids, wouldChange}` and changes nothing. Send it again without `dryRun`. A `where` with no match is an error and nothing changes.

Save a set once and reuse it: `run_command {"command":"list.save","params":{"name":"labels","where":{"type":"TEXT"}}}` returns `{name, ids}`; then `set_properties {"list":"labels","props":{"fontSize":20},"quiet":true}`. Related commands: `list.get`, `list.delete`, `list.all`.

`node.adjust` changes by amounts: `{"command":"node.adjust","params":{"where":{"name":"Chip"},"dy":10}}` moved two chips from y 20 to y 30. Layers a property does not apply to are listed in `skipped`.

## batch and $ref

`batch` runs its steps as one undo step, all or nothing. Name a step with `as`, then write `{"$ref":"name"}` where a later step needs its id. This builds a tree without guessing ids:

```json
{"label":"Card","commands":[
 {"command":"node.create","as":"card","params":{"type":"frame","name":"Card","width":240,"props":{"layout":{"mode":"vertical"},"gap":8,"padding":16,"fill":"#FFFFFF"}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"card"},"text":"Ada","name":"Name"}},
 {"command":"node.create","as":"btn","params":{"type":"frame","name":"Button","parent":{"$ref":"card"},"props":{"layout":{"mode":"horizontal"},"padding":8,"fill":"#2563EB"}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"btn"},"text":"Follow","name":"Label"}}]}
```

The result is one `{id}` per step. In a batch the create command is `node.create`. `{"$ref":"copy","field":"ids/0"}` reads another key of a result, such as the first copy from `edit.duplicate`.

Rollback, confirmed: a batch whose second step targets a missing layer fails with `step 1 (node.set): no such node 99999 (the whole batch was rolled back: nothing changed)`, and the rectangle created in step 0 does not exist afterwards. With `"onError":"continue"` the failing step is reported with `ok:false` and the others stay applied. `quiet: true` returns only `{ok, count, failures?}`.

## Undo, history, checkpoints

- `undo` and `redo` step through history. One batch is one undo step.
- `history {limit}` lists steps with `label` and `changedIds`. `history {revertTo: n}` goes back several steps at once.
- `checkpoint {name}` saves a named version before a big change. `restore_version {id, confirm: true}` returns to it (see figcraft-files).

## Cheap reads

```json
{"type":"TEXT","details":true}
```
for `find_nodes`, and
```json
{"where":{"name":"Card"},"depth":2}
```
for `get_nodes`. `get_nodes` returns `name,type,x,y,width,height` and `childCount` per layer; `fields` changes the list. `get_metadata {nodeId}` returns a short XML outline. `get_node {id, fields:["name","width"]}` avoids the full dump. `contact_sheet {where:{type:"FRAME"}}` renders up to 64 frames on one numbered PNG. `find_similar {id}` lists layers that look like the same element.

## Verify loop

After every write:
1. `get_node` or `get_nodes` with `fields`: check sizes, parent and `sizing`.
2. `run_command {"command":"inspect.overflow","params":{}}`: `total: 0` means nothing overflows its frame.
3. `screenshot {"ids":[4],"scale":0.5}` of the frame you changed, not the whole page.
4. For text, `check_contrast {}` returns `{checked, passed, failures}`.

## Stale reads: rev and ifRev

`get_node`, `inspect_document`, `find_nodes` and `get_selection` put a `rev` at the top of their result. Pass it back as `ifRev` on `set_properties`, `run_command`, `batch`, `create_node`, `propagate_change` or `run_script`. If anything changed the document since (you, the user, another agent, even undo), nothing is applied and the error reads `stale: you read revision 1, the document is at 2 (1 command since); nothing was changed. latest undo steps ...`. Re-read and retry. A successful guarded `set_properties` returns the new `rev` to chain the next write. The counter also moves on selection and view commands, so a stale error can be a false alarm; it never lets a stale write through. `ifRev` cannot be combined with `documents`.

## Pitfalls

- `list_commands` pages: `limit` and `offset` walk past the first 400, and a `filter` narrows first.
- `diff_documents` and `compare_version` show what changed since a version (figcraft-files).
- `screenshot` takes `ids`, not `where`. Resolve ids with `find_nodes` first.
- A bad value fails the call and changes nothing: `node.set` with `x: "bad"` returns `x must be a number`.
- With no FigCraft window running the server is headless: `diagnostics` shows `attached: false` and edits live in memory until you save (figcraft-files).
- Loops and conditions need `run_script` (figcraft-scripting); a fixed list of steps is a `batch`. `batch` has no loops: repeat structure with `edit.duplicate` and `node.adjust`.
