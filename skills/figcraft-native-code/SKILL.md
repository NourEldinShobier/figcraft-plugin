---
name: figcraft-native-code
description: Moves UI between FigCraft and native code in both directions - generates SwiftUI, Jetpack Compose, Flutter (and ArkUI) from layers and components, sets iOS and Android variable names, exports Dart constants, and rebuilds an existing native view as FigCraft layers by hand. Use when the user says "SwiftUI from this design", "Compose code", "Flutter widget", "design this Swift view" or "match our Android theme".
---

# Native UI and FigCraft

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

Direction one: a layer or component becomes SwiftUI, Compose or Flutter with `inspect.code` and `inspect.componentCode`. Direction two: FigCraft has no importer for Swift, Kotlin or Dart source, so an existing native view is rebuilt as layers by reading the code and calling `create_node` / `batch` yourself.

## Design to native code

1. Find the layer: `find_nodes {"name": "ProfileCard"}`.
2. `get_node {"id": 2, "depth": 2}` or `get_metadata {"nodeId": 2}` to read the structure and see which children are instances.
3. `run_command {"command": "inspect.code", "params": {"id": 2, "language": "swiftui"}}`. `language` is `swiftui`, `compose`, `flutter` or `arkui`. The reply is `{code, connected, language}`. `get_design_context {"nodeId": 2, "language": "swiftui"}` returns the same code plus `properties`, `variables` and `assets`.
4. For a component or set, `inspect.componentCode {"id": <set>, "language": "swiftui"}` returns a reusable definition, the property list (`name`, `param`, `type`, `default`) and `usage` for instances.
5. Instances of components with a code link print the project's own call (see `figcraft-code-connect`). Without one they print `Button()` and the definition comes from step 4.
6. Move the output into the project, replacing literal colours and fonts with the project's theme.

## What each target emits

A vertical card, 320 wide, padding 24, gap 12, radius 16, a title and a row of two texts:

| Design | SwiftUI | Compose | Flutter |
|---|---|---|---|
| vertical / horizontal auto layout | `VStack(alignment: .leading, spacing: 12)` / `HStack` | `Column(... Arrangement.spacedBy(12.dp))` / `Row` | `Column(spacing: 12)` / `Row(spacing: 8)` |
| padding | `.padding(EdgeInsets(top: 24, leading: 24, ...))` | `Modifier.padding(start = 24.dp, ...)` | `padding: EdgeInsets.all(24)` |
| fill and radius | `.background(Color(red: 1, ...))` `.clipShape(RoundedRectangle(cornerRadius: 16))` | `.background(Color(0xFFFFFFFF), RoundedCornerShape(16.dp))` | `BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(16))` |
| text | `.font(.custom("Inter", size: 24).weight(.bold))` | `fontSize = 24.sp, fontWeight = FontWeight.W700` | `TextStyle(fontFamily: "Inter", fontSize: 24, fontWeight: FontWeight.w700)` |
| size | `.frame(width: 320, height: 106, alignment: .topLeading)` | `Modifier.size(320.dp, 106.dp)` | `Container(width: 320, height: 106)` |
| space between | not written | not written | `MainAxisAlignment.spaceBetween` |

ArkUI is `Column({ space: 12 })` with `.padding({...})`, `.backgroundColor('#FFFFFF')`, `.borderRadius(16)`.

Components become `struct Button: View` with `enum State: String, CaseIterable` (SwiftUI), `enum class ButtonState { Rest, Hover }` plus a `@Composable fun Button(state: ButtonState = ButtonState.Rest, label: String = "Button")` (Compose), and `class Button extends StatelessWidget` with `enum ButtonState { rest, hover }` (Flutter). Variant properties are enums, text properties strings, boolean properties flags, instance swaps views, slots optional content. Dart enum members are lowerCamel.

## Variables: iOS and Android names

Set the name that generated code should use for a variable with `codeSyntax`:

```json
["run_command", {"command": "variable.update", "params": {"variable": "action/primary",
  "codeSyntax": {"WEB": "var(--action-primary)", "iOS": "Theme.actionPrimary", "ANDROID": "AppTheme.colors.actionPrimary"}}}]
```

A fill bound to that variable then prints:

- SwiftUI: `.background(Theme.actionPrimary)`
- Compose: `.background(AppTheme.colors.actionPrimary, RoundedCornerShape(8.dp))`
- Flutter and ArkUI: the literal colour. `codeSyntax` has no Flutter key; use the Dart export below.

A variable without `codeSyntax` prints as its literal colour (`Color(0xFF2563EB)`). Set `codeSyntax` on every variable the code should reference, with the exact Swift or Kotlin expression the project defines. `""` clears a platform's name. Read the names back from the generated code, not from the variable list.

Dart constants: `variable.export {"format": "dart"}` returns a file with an `abstract final class` per collection and mode (`Color_`, `Color_Dark`, `Size`) holding `static const Color surfaceDefault = Color(0xFFFFFFFF);` and `static const double radiusMd = 8;`. Pass `path` to write it. Design tokens as JSON for other tools: `variable.exportTokens {"format": "dtcg"}`.

## Native code to design, by hand

Read the view, then build layers. Map:

| Native | FigCraft `create_node` props |
|---|---|
| `VStack` / `Column` | `type: frame`, `layout: "vertical"` |
| `HStack` / `Row` | `layout: "horizontal"` |
| `spacing: 12` / `spacedBy(12.dp)` / `spacing: 12` | `gap: 12` |
| `.padding(24)` | `padding: 24` |
| `alignment: .leading` / `Alignment.Start` | `crossAlign: "min"`; center is `"center"`, trailing `"max"` |
| `Spacer()` between items / `spaceBetween` | `mainAlign: "spaceBetween"` on the row |
| `.frame(width: 320)` | `width: 320` on `create_node`; height fixed when `sizingV` is `"fixed"` (default), `"hug"` for content height |
| `maxWidth: .infinity` / `fillMaxWidth()` | `sizingH: "fill"` on the child |
| `.background(Color)` | `fill`; for a theme colour use `{"$var": "Color/surface/default"}` |
| `.clipShape(RoundedRectangle(cornerRadius: 16))` | `cornerRadius: 16` |
| `Text(...).font(size 24, bold)` | `type: text`, `fontSize: 24`, `fontStyle: "Bold"` |
| a reusable `struct` / `@Composable` | `component.create`; each parameter becomes `component.addProperty` |

```json
["batch", {"label": "SwiftUI card", "commands": [
 {"command": "node.create", "as": "card", "params": {"type": "frame", "name": "ProfileCard", "x": 0, "y": 0, "width": 320,
   "props": {"fill": "#FFFFFF", "cornerRadius": 16, "layout": "vertical", "crossAlign": "min", "gap": 12, "padding": 24, "sizingV": "hug"}}},
 {"command": "node.create", "params": {"type": "text", "parent": {"$ref": "card"}, "text": "Ada Lovelace", "name": "Name", "props": {"fontSize": 24, "fontStyle": "Bold"}}},
 {"command": "node.create", "as": "row", "params": {"type": "frame", "name": "Actions", "parent": {"$ref": "card"},
   "props": {"fill": "#00000000", "layout": "horizontal", "crossAlign": "center", "mainAlign": "spaceBetween", "gap": 8, "sizingH": "fill", "sizingV": "hug"}}},
 {"command": "node.create", "params": {"type": "text", "parent": {"$ref": "row"}, "text": "Follow", "name": "Follow", "props": {"fontSize": 14}}},
 {"command": "node.create", "params": {"type": "text", "parent": {"$ref": "row"}, "text": "Message", "name": "Message", "props": {"fontSize": 14}}}
]}]
```

This produced a 320 by 106 card. Running `inspect.code` with `swiftui` on it returned `VStack(alignment: .leading, spacing: 12)` containing the `Text` and an `HStack(alignment: .center, spacing: 8)`, the padding, the frame and `RoundedRectangle(cornerRadius: 16)`: the same structure as the source, which is the round-trip check.

Steps: create tokens first (`figcraft-generate-library`), build the layers with `$var` fills, `screenshot` and compare with a screenshot of the running app, then `inspect.code` in the same language and diff it against the source view.

## Pitfalls

- **SwiftUI and Compose drop space-between.** A row set to `spaceBetween` prints an `HStack`/`Row` with no `Spacer()` or `Arrangement.SpaceBetween`; Flutter keeps it. Add the `Spacer()` yourself.
- **Frames print fixed sizes.** Even a hugging card prints `.frame(width: 320, height: 106)`; drop the height in real code if the content should size it.
- **Hard-coded fonts.** Output names `Inter` explicitly; use the project's font and text styles.
- **Literal black text.** A text layer with no fill variable prints black (`Color(red: 0, ...)`). Bind text fills to variables so `codeSyntax` names appear.
- **Variants.** A variant's difference (a hover fill) appears in the shared component through its enum; check that the target code handles every enum value.
- **Dark mode.** Generated code resolves colours in the layer's own mode. Use `codeSyntax` names or the Dart export so both modes come from the theme, not from one frame's literals.
- FigCraft has no import for `.swift`, `.kt` or `.dart` files and no live preview of native code. Always compare against a screenshot from the real app.

## Verify

1. `inspect.code` in the target language reproduces the source structure (same stack types, gaps, paddings, radii).
2. Variables that have `codeSyntax` print the project's expression in SwiftUI and Compose.
3. `check_contrast {}` has `failures: []` in both modes.
4. A screenshot of the frame matches the native screenshot at the same size.
