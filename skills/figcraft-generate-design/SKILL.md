---
name: figcraft-generate-design
description: Build a screen, page, modal or dashboard in FigCraft from a description or from existing code, section by section, reusing components, variables and styles instead of hard-coded values. Use when the user says "design a login screen", "build this page in FigCraft", "turn this component into a design", "make a landing page", or "update the screen to match the code".
---

# figcraft-generate-design

Read figcraft-use first (coordinates, auto layout, `batch` with `$ref`, verify loop). The calls below were run against the real engine.

## Procedure

1. Read the brief or the code. List the sections (header, hero, form, footer) and the reusable parts (button, input, card).
2. Check what the file already has, before creating anything:
   - `search_design_system {"query":"button"}` returns components, variables and styles with a `score`. `types: ["variable"]` narrows it. It matches names, not meaning (`semantic: false`).
   - `find_nodes {"type":"COMPONENT","details":true}` lists local components.
   - `run_command {"command":"style.list","params":{}}` lists styles.
   - Team libraries: `library.list {"assets":true}`, then `library.place {library, component, x, y}`.
3. Create missing tokens once: collection, variables.
4. Create missing components once, from a frame.
5. Create the screen frame with a preset, then add sections one `batch` at a time.
6. Verify each section, then the whole screen.
7. Save (figcraft-files).

A starting point also exists: `run_command {"command":"template.list","params":{}}` lists templates (`mobile-app`, `landing-page`, `dashboard`, `design-system`, `wireframe-kit`, `social-posts`); `file.newFromTemplate {template}` opens one as a new document.

## Frames and presets

`run_command {"command":"frame.presets","params":{}}` lists names with sizes: phones (`iPhone 16` 393x852, `iPhone SE` 320x568, `Android Compact` 412x917), tablets (`iPad Pro 11"` 834x1194), desktops (`Desktop` 1440x1024, `MacBook Air` 1280x832) and slides. Then:

```json
{"command":"frame.create","params":{"preset":"iPhone 16","name":"Login","x":0,"y":0,
 "props":{"layout":{"mode":"vertical"},"gap":16,"padding":[64,24,24,24],"fill":"#FFFFFF"}}}
```

Without x/y a preset frame lands to the right of the page's existing frames, so several screens do not overlap. Put screens in a row with the same y.

## Tokens: variables first

```json
{"label":"Tokens","commands":[
 {"command":"variable.createCollection","params":{"name":"Brand","modes":["Light"]}},
 {"command":"variable.create","params":{"collection":"Brand","name":"color/primary","type":"color","value":"#2563EB"}},
 {"command":"variable.create","params":{"collection":"Brand","name":"color/text","type":"color","value":"#0F172A"}}]}
```

Variable ids look like `VariableID:1`. Bind by name: `{"command":"variable.bind","params":{"ids":[5],"field":"fill","variable":"color/text"}}`. `fill` means the first fill; `fills/0/color` and `strokes/0/color` are also valid. For more modes (Dark), pass `modes:["Light","Dark"]` and `values:{...}` per variable (see `list_commands {"filter":"variable."}`).

## Components: build once, instance everywhere

Confirmed batch for a button component, bound to the primary variable:

```json
{"label":"Button component","commands":[
 {"command":"node.create","as":"btn","params":{"type":"frame","name":"Button","x":-300,"y":0,
  "props":{"layout":{"mode":"horizontal"},"padding":[12,24,12,24],"mainAlign":"center","crossAlign":"center",
   "cornerRadius":8,"fill":"#2563EB","sizingH":"hug","sizingV":"hug"}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"btn"},"name":"Label","text":"Continue",
  "props":{"fontSize":16,"fontStyle":"Semi Bold","fill":"#FFFFFF"}}},
 {"command":"variable.bind","params":{"ids":[{"$ref":"btn"}],"field":"fill","variable":"color/primary"}},
 {"command":"component.create","params":{"ids":[{"$ref":"btn"}]}}]}
```

`component.create` keeps the frame's id (here 2) and turns it into a `COMPONENT`. Leave out `sizingH`/`sizingV: "hug"` and the button comes out 100 px tall; that was the first mistake in testing. Place components off to the side (x -300) and keep screens clear of them.

Use it with `instance.create {component, parent, x?, y?}`. In an auto layout parent the instance is placed by the layout; set `sizingH: "fill"` with `node.set` to stretch it. `instance.place {component, x, y}` drops one at a page point instead.

## Styles

```json
{"command":"style.create","params":{"type":"text","name":"Heading/H1","from":5}}
{"command":"style.apply","params":{"ids":[6],"style":"Heading/H1"}}
```

`style.create` returns `{id:"S:1"}`; `type` is `paint`, `text`, `effect` or `grid`. Apply by name or id. Applying a text style replaces the layer's font size and weight, so apply it before fine-tuning.

## Screen build, one section per batch

Confirmed screen (button component id 2, variables above):

```json
{"label":"Login screen","commands":[
 {"command":"frame.create","as":"scr","params":{"preset":"iPhone 16","name":"Login","x":0,"y":0,
  "props":{"layout":{"mode":"vertical"},"gap":16,"padding":[64,24,24,24],"fill":"#FFFFFF"}}},
 {"command":"node.create","as":"h","params":{"type":"text","parent":{"$ref":"scr"},"name":"Heading","text":"Welcome back",
  "props":{"fontSize":32,"fontStyle":"Bold","fill":"#0F172A"}}},
 {"command":"variable.bind","params":{"ids":[{"$ref":"h"}],"field":"fill","variable":"color/text"}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"scr"},"name":"Subtitle","text":"Sign in to continue to your account.",
  "props":{"fontSize":16,"fill":"#475569","sizingH":"fill"}}},
 {"command":"instance.create","as":"inst","params":{"component":2,"parent":{"$ref":"scr"}}},
 {"command":"node.set","params":{"ids":[{"$ref":"inst"}],"props":{"sizingH":"fill"}}}]}
```

Result in the run: Login 393x852; Heading at y 64; Subtitle 345 wide; the Button instance 345x43 at x 24. One batch per section is one undo step, and a failed section rolls back alone. For a later section, find its parent with `find_nodes {"name":"Login"}` and use that id as `parent`.

Text rules:
- Use the real copy from the brief or code, not "Lorem ipsum" or "Text".
- Give text `sizingH: "fill"` in a vertical auto layout frame so long lines wrap; leave it `hug` for labels.
- Name every layer for what it is (`Heading`, `Submit`). `auto_name_layers {"scope":"page","dryRun":true}` renames generic names such as `Frame 5`; run it with `dryRun` and read `renames`.

## Verify

1. `get_nodes {"where":{"name":"Login"},"depth":3,"fields":["name","type","x","y","width","height"]}`: check every child sits inside the frame and has the expected size.
2. `run_command {"command":"inspect.overflow","params":{}}` must return `total: 0`.
3. `check_contrast {}` returned `checked 4, passed 4, failures []` for the screen above. Fix failures before showing the design.
4. `audit_tokens {}` lists literal colours that equal a variable (`hardcoded`) with a `variable.bind` fix for each. Bound layers count under `bound`.
5. `screenshot {"ids":[4],"scale":0.5}` of the screen. Several screens at once: `contact_sheet {"where":{"type":"FRAME"}}`.
6. `get_variable_defs {"nodeId":4}` returns `{name: value}` for the variables the screen uses.

## From code to design

Read the code for structure, not styling details: sections, repeated items, states, real strings. Map each component in code to a local component (`search_design_system`) or build it once. Map colours and spacing to variables. For a repeated list, build one row as a component and call `instance.create` per item. To go the other way, `get_design_context {nodeId}` returns HTML and CSS for a layer (the Login screen came back as flex columns with `--color-primary` and `--color-text` custom properties). To link components to code, see figcraft-code-connect.

## Pitfalls

- Hard-coded hex values instead of variables break theming; bind them (step 3 of the procedure).
- To change a shared look, edit the component, not each instance.
- Use a named rectangle (`Image / hero`) with a neutral fill as an image placeholder and say so in your report.
