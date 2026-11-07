---
name: figcraft-design-to-code
description: Implements a FigCraft frame as code in the user's own project, reusing linked components and design tokens - reads structure, a screenshot, variables and reference code, then adapts it to the repo's framework. Use when the user says "implement this frame", "build this screen from the design", "turn this design into React/Vue/SwiftUI", "design to code" or "port this component".
---

# Implement a FigCraft frame as code

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

The generated code is a reference to adapt to the target project, not a file to paste. The job is to keep the design's spacing, sizes, text and token names while using the project's own components, styles and conventions.

FigCraft also ships an MCP prompt for this: `design_to_code` with arguments `frame` (layer id, required) and `framework` (default `react`). It returns the same steps as below with the ids filled in.

## Procedure

1. **Find the frame.** `find_nodes {"name": "Card"}` returns ids; `get_selection` returns what the user selected. Use the layer id as `nodeId`.
2. **Structure.** `get_metadata {"nodeId": 10}` returns a sparse XML outline (`<frame>`, `<text>`, `<instance>` with x/y relative to the parent and sizes). Instances name the components to reuse. `depth` (0-32, default 4) and `maxNodes` limit large frames; a cut outline ends with `<!-- truncated -->`, so fetch the sub-frames one at a time.
3. **Look at it.** `screenshot {"ids": [10]}` and read the image before writing code. Compare with the same screenshot after the implementation renders.
4. **Linked components.** `get_code_connect_map {"language": "react"}` lists design components that already have code. For each instance in the frame, `get_code_connect_map {"id": <instance id>}` returns its `connected.import` line and snippet. Use those lines; do not rebuild the component. No link means the project may still have a matching component: search the repo by the component's name before writing a new one.
5. **Tokens.** `get_variable_defs {"nodeId": 10}` returns `{name: value}` for every variable the layer and its descendants use, resolved in the layer's mode. `audit_tokens {"root": 10}` lists literal colours that equal a variable's default value; write those as the token, not the hex.
6. **Reference code.** `get_design_context {"nodeId": 10, "language": "react"}` returns `code`, `properties` (each row can carry a `token` name), `variables`, `assets`, an `outline` and the extras listed below. `language` is any value `inspect.code` takes: `html` (default; HTML plus CSS), `css`, `react`, `tailwind`, `vue`, `leptos`, `swiftui`, `compose`, `flutter`, `arkui`. Output over 60,000 characters is cut and `codeTruncated` is true: request sub-frames instead.
7. **Adapt.** Map tokens to the project's token system, replace markup with the project's components, keep the layout numbers. See "What the generated code looks like".
8. **Assets.** `run_command {"command": "inspect.assets", "params": {"ids": [10]}}` lists layers with export settings, icons and images, each with a `kind`. Export what the code needs with `export {"ids": [id], "format": "svg"}` (or png with `scale`), or `export_many` for a set.
9. **Check.** Render the result and compare with the screenshot. Then `check_contrast {"ids": [11]}` on text layers and, for icon frames, `lint_icons {"ids": [<icon-set frame>]}`. List anything in the design the code could not express.

## Extras: include

`include` takes one name, a list or `"all"`; the default is everything except `comments` and `interactions`. Unknown names fail with the list of valid ones.

| Name | Content |
|---|---|
| `instances` | `{id, componentName, mainId, codeConnect?: {importPath, name, snippet}}` for each instance below the layer |
| `bindings` | per layer and property: `{variable, collection, value, css}`; `css` is `var(--surface-default, #FFFFFF)`, write that, not the hex |
| `annotations` | the designer's notes on layers (`annotation.add`) |
| `devResources` | links attached to layers, inherited ones for instances |
| `status` | the root layer's ready-for-dev status |
| `comments`, `interactions` | open comment threads in the subtree; prototype triggers and actions |
| `hints` | what to do first: mapped components, then tokens, then raw values |

Each list is capped at 100 entries; a `truncated` field names the lists that were cut. A linked instance already appears as its component call in `code`. If the file stores design guidelines, they come first in `hints`; read them in full with `get_design_guidelines`, and follow them.

To turn a whole file's conventions into a rules file for the repo, use the MCP prompt `create_design_system_rules` (argument `target`, default `AGENTS.md`). It reads variables, styles, components, Code Connect and the stored guidelines, writes the file, and offers to store a summary with `run_command` `library.setGuidelines {text}` (up to 20 KB) after you agree.

## Calls that were run

```json
["get_metadata", {"nodeId": 10}]
["get_design_context", {"nodeId": 10, "language": "react"}]
["get_design_context", {"nodeId": 10, "include": ["bindings", "annotations"]}]
["get_design_guidelines", {}]
["run_command", {"command": "inspect.code", "params": {"id": 10, "language": "tailwind"}}]
["run_command", {"command": "inspect.code", "params": {"id": 10, "language": "css", "unit": "rem"}}]
["audit_tokens", {"root": 10}]
```

`inspect.code` takes `unit: "rem"` and `rootFontSize` for CSS, HTML, React, Leptos and Vue (a 44 px width came out as `2.75rem`).

## What the generated code looks like

For a 320 px vertical auto-layout card with a title and a Button instance:

- **HTML/CSS and React** write a class per layer, `display: flex`, `gap`, `padding`, `border-radius`. A colour bound to a variable is `var(--surface-default, #FFFFFF)`, with the literal as fallback. A literal colour (the title here, `#000000`) has no variable: ask the designer whether it should be a token.
- **Tailwind** writes utilities on the 4 px scale (`gap-3`, `p-6`), fixed-width frames as fluid (`w-full`) and bound colours as theme utilities (`bg-default`). Those names only exist after `variable.export {"format": "tailwind"}` is added to the stylesheet. `mobile: <frame id>` on `inspect.code` merges a mobile frame with the same layer names into mobile-first classes with `lg:` overrides.
- **Instances** become component calls once their component is linked (`<Button variant="Rest">{"Button"}</Button>` with `import { Button } from "@acme/ui";` at the top). Unlinked instances are inlined as markup in HTML/CSS and Tailwind, and written as `Button()` calls in SwiftUI, Compose and Flutter, whose definitions come from `inspect.componentCode`.
- **Component frames**: `inspect.componentCode {"id": <component or set>, "language": "react"}` returns the reusable definition with props from the component's properties (`state?: "Rest" | "Hover"`, `label?: string`) and the other variants' differences as `data-state` rules.
- The layer's own mode decides colours. Inside a frame set to Dark, the same Button resolved `--text-on-action: #0B1220`. Generate code from the Light frame unless the task is the dark theme, and take theme values from `variable.export` (`css`, `tailwind`, `dart`) or `variable.exportTokens` (`dtcg`), not from one frame's output.

## Pitfalls

- **Do not paste the output.** Spacing and sizes are right; class names, file layout and styling method are the generator's. Follow the project.
- **Fixed heights.** Tailwind output makes a hugging frame's height a minimum; check that content-driven sizes stay content-driven.
- **Hidden layers** show in the outline as `hidden="true"`; decide whether they are states to build or leftovers.
- **No Code Connect link is not an error.** Fall back to the generated snippet, then offer to link it (`figcraft-code-connect`).
- `get_design_context` takes `depth` for the outline only, not the code. To limit code, pass a smaller `nodeId`.

## Verify

The task is done when the screenshot and the rendered code match in layout, every colour that has a variable uses the project's token for it, instances use the project's components, and `audit_tokens {"root": <id>}` has `hardcoded: []` or the leftovers are named in the report.
