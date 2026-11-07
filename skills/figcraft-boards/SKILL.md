---
name: figcraft-boards
description: Build and read whiteboard boards in FigCraft: sections, sticky notes, shapes, connectors, tables, stamps, marker strokes, templates, a timer and voting sessions. Use when the user says "make a board", "retro board", "brainstorm with stickies", "add sticky notes", "run a vote", "start a timer", "what is on this board", or wants a FigJam-style whiteboard.
---

# FigCraft boards

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

A board is a file of its own kind (`inspect_document` shows `kind: "board"`). Board objects are ordinary layers with a `board` field, so `node.set`, `select`, `undo`, copy and export work on them. The `board.*` commands only run on a board; on a design file they fail with "this is for boards". Prototyping and Dev Mode commands refuse on boards.

## Procedure

1. Open a board: `run_command {"command":"file.newBoard","params":{"name":"Retro"}}`. It becomes the active document. To start from a layout instead, `board.templates` lists `retrospective`, `brainstorm`, `weeklyPlanner`, `flowChart`, `kanban`; `board.template {name, x, y}` places one as sections, stickies, shapes and connectors in one undo step.
2. Make sections first with `create_node {"type":"section","name":"Went well","x":0,"y":0,"width":520,"height":300}`. It returns the section id. Pass that id as `parent` to the board commands below, and give x/y relative to the section.
3. Add content in one `batch`, so it is one undo step and you can refer to earlier results with `as` and `$ref`:

```json
{"label":"Retro cards","commands":[
 {"command":"board.sticky","as":"a","params":{"x":20,"y":40,"text":"Fast deploys","color":"green","parent":2,"author":false}},
 {"command":"board.nextSticky","as":"b","params":{"id":{"$ref":"a"},"side":"right"}},
 {"command":"board.stamp","params":{"x":120,"y":40,"stamp":"plusOne"}},
 {"command":"board.ink","params":{"points":[[0,320],[260,330],[520,320]],"highlighter":true,"color":"orange"}}]}
```

4. Read back and check (below), then screenshot.

## Commands that create things

| Command | Notes |
|---|---|
| `board.sticky {x, y, text?, color?, author?, parent?}` | 200 x 200 frame, grows taller with text. Colors: yellow orange red pink violet blue green gray, or a hex. `author: false` hides the name. Returns `{id, text}`: `id` is the sticky frame, `text` is its text layer. |
| `board.nextSticky {id?, side?}` | A sticky of the same color beside `id` (right, below, left, above), 24 units apart. Text starts as "Text". On a shape it calls `board.addConnected`. |
| `board.shape {shape, x, y, width?, height?, text?, color?, parent?}` | 23 outlines, for example rectangle, roundedRectangle, ellipse, diamond, hexagon, star, speechBubble, database, document. `list_commands {"filter":"board.shape"}` has the full list. |
| `board.addConnected {id?, side?, edit?}` | Next shape of the same kind, 80 units away, already joined by a connector. Returns `{id, text, connector}`. |
| `board.connector {from, to, style?, label?, fromSide?, toSide?, startCap?, endCap?}` | `from` and `to` are layer ids or `{x, y}` page points. Details in the figcraft-diagram skill. |
| `board.table {cells, x, y}` | `cells` is rows of strings, at most 50 x 20. Each column is 160 wide. Returns the text-layer ids per cell. `board.tableEdit {id, action: addRow\|addColumn\|removeRow\|removeColumn, index?}` resizes it. |
| `board.stamp {x, y, stamp}` | thumbsUp, heart, plusOne, star, question, check. Centred on x, y. |
| `board.ink {points \| path, highlighter?, color?}` | A marker or highlighter stroke. |
| `board.setColor {ids \| where, color}` | Fill for stickies and shapes, line for connectors and ink. Errors on other layers (a section id fails). |
| `board.setStyle {ids?, shape?, fontSize?, style?, startCap?, endCap?}` | Change a shape's outline and text size, or a connector's routing and caps. |

To change a note's text after creating it: `node.set {"id": <text id>, "props": {"characters": "New text"}}`.

## Timer and voting

```json
{"command":"board.timer","params":{"action":"start","minutes":10}}
{"command":"board.vote","params":{"action":"start","votes":2,"on":"stickies"}}
{"command":"board.vote","params":{"action":"cast","id":3}}
{"command":"board.vote","params":{"action":"end"}}
{"command":"board.voteResults","params":{}}
```

- One timer per board. `action` is start, pause, resume, add or stop; `board.timerState` reads `{state, left, text}`. Neither the timer nor votes are undo steps.
- A vote takes `on`: all, stickies or selection. `cast` and `retract` take the object's frame id (the sticky id, not its text id). `voter` lets a script vote as someone else, so you can test with several voters.
- After `end`, `voteResults` returns `results` ranked by votes with each voter's name, and keeps the last 20 sessions in `sessions`.

## Read a board back

FigCraft has no dedicated board export; use the generic readers.

- `get_metadata {}` gives an outline: sections, `Sticky` frames with their text as a child, connectors named `Connector`, labels named `Label`. It does not show colors or the `board` field.
- `get_nodes {"where":{"name":"Sticky"},"fields":["name","board","x","y","width","height"],"depth":2}` returns each sticky with its text layer. Use `{"name":"Connector"}` for connectors: `board.from` and `board.to` give the joined ids, sides and routing.
- `find_nodes {"text":"deploys","details":true}` finds notes by content.
- `screenshot {"scale":0.5}` shows the page. To write a PNG of the whole board use `export {"ids":[1],"format":"png","path":"board.png"}` (page id 1; `export` needs ids).

## Pitfalls

- The id a command returns is the frame (sticky, shape) or the line (connector); the text is a separate child id. Votes, connectors and `board.setColor` want the frame id.
- `parent` coordinates are relative to the parent, otherwise page coordinates. A sticky created without `parent` inside a section's area stays a page-level layer and does not move with the section.
- Tables are 160 per column wide; leave room before placing the next object.
- FigCraft has no sticky size presets, stacks, mind maps, widgets on boards, or AI summaries. Boards are clustered by hand: lay out a grid with x/y, or use a template.
- `.jam` import opens as design-style frames, not native board objects.

## Verify

After the batch: `get_metadata {}` should list the section with the stickies inside it, and `board.voteResults` after `end` should show `state: "ended"`. Take a screenshot and look at it before reporting the board done.
