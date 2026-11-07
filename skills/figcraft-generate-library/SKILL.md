---
name: figcraft-generate-library
description: Builds a design system in FigCraft - variable collections with Light/Dark modes, colour/number/string variables, text and effect styles, a component with variant and text properties, variable bindings and a docs frame - then audits it. Use when the user says "create a design system", "set up tokens", "add dark mode variables", "build a button component with variants" or "make a component library".
---

# Build a design system in FigCraft

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

Find a command's parameters with `list_commands {"filter": "variable."}`.

## When to use

Creating tokens, styles or components from nothing, or adding to an existing system. For a single screen use the design tools directly; for linking components to code use `figcraft-code-connect`.

## Procedure

1. **Look first.** `search_design_system {"query": ""}` lists every component, variable and style. `run_command {"command": "variable.list", "params": {}}` shows collections, modes and values. Reuse what exists; do not create a second `Color` collection.
2. **Checkpoint.** `checkpoint {"name": "before library"}`. `restore_version {"id": "<id>", "confirm": true}` goes back.
3. **Variables, one batch.** Collections first, then variables. A variable's `value` is for the default mode, `values` is `{modeName: value}`. An alias is `{"alias": "<variable name or id>"}` and may point at a variable created earlier in the same batch.
4. **Base layers** with `node.create`, naming each step with `as` and passing `{"$ref": "name"}` to later steps. Colours bind with `{"$var": "Collection/group/name"}` in `props.fill` or `props.stroke`.
5. **Bind everything else** (`cornerRadius`, `gap`, `paddingHorizontal`, `width`, `opacity`, `characters`, ...) with `variable.bind {ids, field, variable}`.
6. **Styles.** Text styles and effect styles with `style.create`. Use variables, not paint styles, for colour (see pitfalls).
7. **Component.** `component.create`, then `component.addProperty` for text, boolean or instance-swap properties, then `component.addVariant`.
8. **Docs frame.** An auto-layout frame holding instances, set to each mode with `variable.setMode`, so both themes are visible.
9. **Verify** (below).

## Tokens, styles and the base component

Run as one session; ids returned by earlier calls are not fixed numbers, so the batch uses `as`/`$ref`.

```json
["batch", {"label": "Tokens", "quiet": true, "commands": [
 {"command": "variable.createCollection", "params": {"name": "Color", "modes": ["Light", "Dark"]}},
 {"command": "variable.create", "params": {"collection": "Color", "name": "surface/default", "type": "color", "values": {"Light": "#FFFFFF", "Dark": "#111111"}}},
 {"command": "variable.create", "params": {"collection": "Color", "name": "brand/blue", "type": "color", "values": {"Light": "#2563EB", "Dark": "#60A5FA"}}},
 {"command": "variable.create", "params": {"collection": "Color", "name": "action/primary", "type": "color", "value": {"alias": "brand/blue"}}},
 {"command": "variable.create", "params": {"collection": "Color", "name": "text/on-action", "type": "color", "values": {"Light": "#FFFFFF", "Dark": "#0B1220"}}},
 {"command": "variable.createCollection", "params": {"name": "Size"}},
 {"command": "variable.create", "params": {"collection": "Size", "name": "radius/md", "type": "number", "value": 8}},
 {"command": "variable.create", "params": {"collection": "Size", "name": "font/family", "type": "string", "value": "Inter"}}
]}]
```

```json
["batch", {"label": "Button", "commands": [
 {"command": "node.create", "as": "btn", "params": {"type": "frame", "name": "Button", "x": 0, "y": 0,
   "props": {"fill": {"$var": "Color/action/primary"}, "layout": "horizontal", "padding": 12, "gap": 8, "sizingH": "hug", "sizingV": "hug"}}},
 {"command": "node.create", "as": "label", "params": {"type": "text", "parent": {"$ref": "btn"}, "text": "Button", "name": "Label",
   "props": {"fontSize": 14, "fontStyle": "Medium", "fill": {"$var": "Color/text/on-action"}}}},
 {"command": "variable.bind", "params": {"ids": [{"$ref": "btn"}], "field": "cornerRadius", "variable": "radius/md"}},
 {"command": "style.create", "params": {"type": "text", "name": "Label/Medium", "from": {"$ref": "label"}}},
 {"command": "component.create", "as": "main", "params": {"ids": [{"$ref": "btn"}]}},
 {"command": "component.addProperty", "params": {"id": {"$ref": "main"}, "name": "Label", "type": "text", "layer": {"$ref": "label"}}},
 {"command": "component.addVariant", "params": {"id": {"$ref": "main"}}}
]}]
```

`component.create` turns the frame into a component in place. `component.addProperty` with `type: "text"` and `layer` links the text layer to a property named `Label`, default `Button`.

`component.addVariant` on a lone component wraps it in a component set and adds a copy. Both are named with the placeholder property `Property 1` (`Property 1=Default`, `Property 1=Variant2`). Read the ids with `run_command {"command": "component.list", "params": {}}`: in a fresh file the main is 2, the set 4 and the new variant 5. Rename the property and its values:

```json
["batch", {"label": "State variant", "commands": [
 {"command": "component.editProperty", "params": {"id": 4, "name": "Property 1", "newName": "State"}},
 {"command": "component.editProperty", "params": {"id": 4, "name": "State", "value": "Default", "newValue": "Rest"}},
 {"command": "component.editProperty", "params": {"id": 4, "name": "State", "value": "Variant2", "newValue": "Hover"}},
 {"command": "variable.create", "params": {"collection": "Color", "name": "action/primary-hover", "type": "color", "values": {"Light": "#1D4ED8", "Dark": "#93C5FD"}}},
 {"command": "variable.bind", "params": {"ids": [5], "field": "fill", "variable": "action/primary-hover"}}
]}]
```

The variants are now `State=Rest` and `State=Hover`. `component.properties {"id": 4}` lists `State` (variant, options Rest and Hover) and `Label` (text). More variant properties: `component.addProperty {id: <set>, name, type: "variant"}`. Other variant sets from existing components: `component.combineVariants {ids}` with names already written as `Prop=Value`.

## Styles and docs

```json
["run_command", {"command": "style.create", "params": {"type": "effect", "name": "Elevation/1", "value": [{"type": "dropShadow", "color": "#00000026", "offset": [0, 2], "radius": 8}]}}]
["create_node", {"type": "text", "text": "Heading", "x": 0, "y": 300, "props": {"textStyle": "Label/Medium"}}]
```

A docs frame in Dark mode:

```json
["batch", {"label": "Docs", "commands": [
 {"command": "node.create", "as": "doc", "params": {"type": "frame", "name": "Docs/Dark", "x": 300, "y": 0,
   "props": {"fill": {"$var": "Color/surface/default"}, "layout": "vertical", "padding": 16, "gap": 8, "sizingH": "hug", "sizingV": "hug"}}},
 {"command": "instance.create", "params": {"component": 4, "parent": {"$ref": "doc"}}},
 {"command": "variable.setMode", "params": {"ids": [{"$ref": "doc"}], "collection": "Color", "mode": "Dark"}}
]}]
```

Everything under the frame, instances included, now resolves in Dark. `mode: null` goes back to Auto (inherited).

## Code syntax and scopes

`variable.update {"variable": "action/primary", "codeSyntax": {"WEB": "var(--action-primary)", "iOS": "Theme.actionPrimary", "ANDROID": "AppTheme.colors.actionPrimary"}}` sets the names that code generation writes for that variable (see `figcraft-native-code`). `scopes: []` hides a variable from pickers; `description` documents it.

## Verify

- `get_variable_defs {"nodeId": <doc frame>}` returns the values as resolved in the frame's mode: in the Dark docs frame `surface/default` is `#111111`.
- `audit_tokens {}` returns `hardcoded: []` when every colour that equals a variable's default value is bound. A hit lists a `fixes` entry that is a ready `variable.bind`.
- `check_contrast {}` checks every text layer against what is behind it, once per mode when the colours are variables; `failures: []` means AA passes in Light and Dark.
- `search_design_system {"query": "hover"}` finds the set through its variant name.
- `variable.exportTokens {"format": "css"}` (also `dtcg`, `tailwind`, `json`) and `variable.export {"format": "dart"}` show what code will see.
- `screenshot {"ids": [<doc frame>]}` and look at it.

## Pitfalls

- **Layer ids are not stable between files.** Use `as`/`$ref` inside a batch, and `component.list` or `find_nodes` between batches.
- **A failing step rolls back the whole batch.** Fix the step and rerun the batch; nothing was half-applied.
- **A style and a variable on the same property exclude each other.** `style.create {type: "paint", from: <layer>}` replaced the layer's fill variable with the style. Bind variables for colour and keep styles for text and effects.
- **A literal edit unbinds.** `set_properties {"ids": [5], "props": {"fill": "#1D4ED8"}}` removed the fill variable from the variant. Rebind with `variable.bind` after any literal edit.
- **`addVariant` copies bindings.** The new variant keeps the main's bound variables; change them with `variable.bind`, not literals.
- **Tailwind export names drop the first group.** `surface/default` exports as `--color-default`, `action/primary` as `--color-primary`. Keep the part after the first `/` unique across the file.
- **Variable names for `variable.bind` and aliases:** the bare name (`radius/md`) or the id worked; `Size/radius/md` did not for `variable.bind`. `$var` in `props.fill` takes `Collection/name`.
- To use variables from another published library file, see `library.importVariable` and `library.bindVariable` in `list_commands {"filter": "library."}`.
