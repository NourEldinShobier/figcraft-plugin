---
name: figcraft-diagram
description: Draw flowcharts, sequence-style diagrams, ERDs and architecture diagrams in FigCraft as board shapes joined by connectors, laid out left to right and checked with a screenshot. Use when the user says "draw a flowchart", "diagram this flow", "sequence diagram", "ERD", "architecture diagram", "boxes and arrows", or has Mermaid and wants it in FigCraft.
---

# FigCraft diagrams

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

FigCraft has no Mermaid, PlantUML or draw.io import (`list_commands {"filter":"mermaid"}` finds nothing) and no auto-layout for diagrams. You place every node at a computed x/y and join them with `board.connector`; the connectors then follow the nodes when they move. Shape and connector commands exist only on boards, so create a board first (`file.newBoard`). `file.import` takes SVG if the user already has a drawing.

## Procedure

1. Translate the source (Mermaid text, a description, code) into a node list and an edge list. Give every node a short label.
2. Pick a grid. Nodes 160 x 80, 120 apart horizontally and 100 vertically: column x = `col * 280`, row y = `row * 180`. Flow goes left to right; branches fan out up and down from the decision's right side.
3. Choose shapes: `roundedRectangle` for start/end and screens, `rectangle` for a process, `diamond` for a decision (make it 180 x 120), `database` for storage, `parallelogramRight` for input/output, `document`, `hexagon`, `ellipse` for an actor. Set `color` (names yellow orange red pink violet blue green gray, or hex); the default shape fill is yellow, so color anything that should read differently.
4. Send everything in one `batch` with `as` names: shapes first, then connectors that use `{"$ref": name}`:

```json
{"label":"Login flow","commands":[
 {"command":"board.shape","as":"start","params":{"shape":"roundedRectangle","x":0,"y":0,"width":160,"height":80,"text":"Open app","color":"#DDEBFF"}},
 {"command":"board.shape","as":"form","params":{"shape":"rectangle","x":280,"y":0,"width":160,"height":80,"text":"Login form"}},
 {"command":"board.shape","as":"ok","params":{"shape":"diamond","x":560,"y":-20,"width":180,"height":120,"text":"Valid?"}},
 {"command":"board.shape","as":"home","params":{"shape":"roundedRectangle","x":860,"y":-100,"width":160,"height":80,"text":"Home","color":"green"}},
 {"command":"board.shape","as":"err","params":{"shape":"roundedRectangle","x":860,"y":100,"width":160,"height":80,"text":"Show error","color":"red"}},
 {"command":"board.shape","as":"db","params":{"shape":"database","x":590,"y":-240,"width":120,"height":100,"text":"Users"}},
 {"command":"board.connector","params":{"from":{"$ref":"start"},"to":{"$ref":"form"},"style":"straight"}},
 {"command":"board.connector","params":{"from":{"$ref":"form"},"to":{"$ref":"ok"},"style":"straight"}},
 {"command":"board.connector","params":{"from":{"$ref":"ok"},"to":{"$ref":"home"},"style":"elbow","label":"yes"}},
 {"command":"board.connector","params":{"from":{"$ref":"ok"},"to":{"$ref":"err"},"style":"elbow","label":"no"}},
 {"command":"board.connector","params":{"from":{"$ref":"ok"},"to":{"$ref":"db"},"fromSide":"top","toSide":"bottom","style":"straight","startCap":"none","endCap":"none"}},
 {"command":"board.connector","params":{"from":{"$ref":"err"},"to":{"$ref":"form"},"fromSide":"bottom","toSide":"bottom","style":"elbow","label":"retry"}}]}
```

5. Verify: `export {"ids":[1],"format":"png","path":"flow.png"}` and open the PNG, or `screenshot {"scale":0.5}`. Look for crossing lines, labels sitting on a line end, and slanted lines (see below).

## Connector rules

- `from` / `to`: a layer id (the frame the shape command returned) or a free point `{x, y}` in page coordinates.
- `style`: `straight`, `elbow` (routes around the boxes it joins) or `curved`. `fromSide` / `toSide`: `auto` (the facing side), top, right, bottom, left. The default end cap is an arrowhead; `startCap` / `endCap` take `none`, `lineArrow`, `triangleArrow`, `circleFilled`, `diamondFilled` and others (`list_commands {"filter":"board.connector"}`). `fromAt` / `toAt` `[fx, fy]` pin an end to a spot on the box.
- `label` writes text at the middle of the route; `board.label {id, text}` edits it later.
- A connector re-routes when either end moves: `node.set {"id": 5, "props": {"x": 300}}` and the line follows. Rewire with `board.reattach {id, end: from|to, target, side?}`.
- Ends attach at the middle of a side. A straight line between boxes whose centres are not aligned is slanted, so match centres (same y for left to right, same x for top to bottom) or use `elbow`.

## Sequence-style diagram

There is no sequence-diagram object. Use boxes for participants, one lifeline connector per participant (no arrowheads) and one connector per message, from free points at the same y:

```json
{"label":"Sequence","commands":[
 {"command":"board.shape","as":"c","params":{"shape":"rectangle","x":0,"y":0,"width":140,"height":60,"text":"Client"}},
 {"command":"board.shape","as":"s","params":{"shape":"rectangle","x":300,"y":0,"width":140,"height":60,"text":"Server"}},
 {"command":"board.connector","params":{"from":{"$ref":"c"},"to":{"x":70,"y":420},"fromSide":"bottom","style":"straight","startCap":"none","endCap":"none"}},
 {"command":"board.connector","params":{"from":{"$ref":"s"},"to":{"x":370,"y":420},"fromSide":"bottom","style":"straight","startCap":"none","endCap":"none"}},
 {"command":"board.connector","params":{"from":{"x":70,"y":140},"to":{"x":370,"y":140},"style":"straight","label":"POST /login"}},
 {"command":"board.connector","params":{"from":{"x":370,"y":300},"to":{"x":70,"y":300},"style":"straight","label":"200 token"}}]}
```

Lifeline x is the participant's centre (x + width / 2); keep message rows 80 apart. Messages on free points do not follow a participant you move later, so finish the layout first.

## ERD and architecture

- ERD: one `board.table` per entity (`cells`: first row the entity name, then `["column","type"]` rows). A table is 160 wide per column. Join entities with `board.connector` between the table ids, with `fromSide: "right"`, `toSide: "left"`, end caps for the cardinality you want and a label such as `1 : N`. Put related tables on the same y with at least 120 between them.
- Architecture: one `section` per tier or boundary (`create_node {"type":"section",...}`), shapes inside it via `parent`, `database` for stores, labelled connectors for protocols.
- With 15 or more nodes, generate the batch JSON with a small script from your node and edge lists instead of writing it by hand, and keep one color per kind of node.

## Pitfalls

- `export` needs `ids`; `[1]` is the page.
- A shape's `text` wraps inside the outline; a long label overflows a small shape. Widen the shape or shorten the label.
- Two connectors leaving one side overlap. Use different sides, or `fromAt` to spread them.
- On a design file the `board.*` commands refuse. Make a board for diagrams.
