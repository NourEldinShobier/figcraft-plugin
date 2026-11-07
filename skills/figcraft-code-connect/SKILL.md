---
name: figcraft-code-connect
description: Links FigCraft components to the real code components that implement them, with per-language templates, a figcraft.connect.json file that lives in the repo, and a CLI step that publishes it to the design file. Use when the user says "connect components to code", "code connect", "map this button to our React component", "export code connections" or "publish mappings from CI".
---

# Link FigCraft components to code (Code Connect)

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

A link says: this component (or component set) is built in code as `<Button variant={State}>`, imported from `@acme/ui`. After that, `inspect.code`, `get_design_context` and `get_code_connect_map` return that snippet for every instance instead of generated markup.

Templates are text. FigCraft never runs them. Languages: `react`, `leptos`, `vue`, `swiftui`, `compose`, `arkui`, `flutter`. A link belongs to the component, or to its set when you link a variant. There is one link per component per language.

FigCraft has no `.figma.tsx` template files and no publish step to a hosted service. The repo-side artefact is `figcraft.connect.json`. If a user expects Figma's Code Connect CLI, tell them to use the steps here.

## Procedure

1. **Find unlinked components.** `component.list` returns every component and set with its id and `instances` count. `get_code_connect_map {}` lists the links that exist (`{version: 1, links: [...]}`, filter with `language`).
2. **Read the component's properties.** `component.properties {"id": <set or component>}` gives the exact property names, types and options. Template placeholders use these names, spaces included (`{Has icon}`).
3. **Find the code component** in the repository: its name, import path and prop names. Match each design property to a prop.
4. **Write the template** from the code component's real signature.
5. **Link it.** `add_code_connect_map {id, language, importPath, name, template}`. The result shows the rendered snippet for the component's default values and `unknown`, the placeholders that are not properties. Fix every name in `unknown`.
6. **Check on an instance.** `get_code_connect_map {"id": <instance>}` returns `connected.code`; `inspect.code {"id": <frame>, "language": "react"}` on a frame containing the instance shows the snippet inline with its import line once at the top.
7. **Keep it in the repo.** `run_command {"command": "codeConnect.export", "params": {"path": "figcraft.connect.json"}}` writes the file. Commit it. See "Publish".

## Templates

`{property}` is replaced by the instance's value, escaped for the language. `{prop ? "a" : "b"}` picks one of two strings by a boolean. Any other `{...}` stays as written.

```json
["add_code_connect_map", {"id": 4, "language": "react", "importPath": "@acme/ui", "name": "Button",
  "template": "<Button variant={State}>{Label}</Button>"}]
```

Result for a Rest button with label `Button`:

```
import { Button } from "@acme/ui";

<Button variant="Rest">{"Button"}</Button>
```

What each language does with a value (all confirmed by running them):

| Language | Template | Output |
|---|---|---|
| react | `variant={State}` | `variant="Rest"`; a boolean gives `{true}` |
| react | `icon="{Has icon ? "cart" : "none"}"` | `icon="cart"` |
| vue | `:icon={Has icon}` | `:icon="true"` (a string keeps JS quotes as entities) |
| swiftui | `AcmeButton({Label}, style: {State})` | `AcmeButton("Button", style: .rest)` |
| compose | `AcmeButton(text = {Label}, state = {State})` | `AcmeButton(text = "Button", state = ButtonState.Rest)` |
| flutter | `AcmeButton(label: {Label})` | `AcmeButton(label: "Button")` |

Compose and Flutter print `importPath` as the whole import (`import com.acme.ui`, `import 'package:acme_ui/acme_ui.dart';`), so give the package or library path they need. React and Leptos build `import { Name } from "path"` / `use path::Name;` from `importPath` and `name`.

Calling `codeConnect.set {id, language}` with no template links a default: the component's generated name and a call passing every property (`Chip(hasIcon: true)` for flutter).

## Updating, removing, trying values

- A call that leaves out `importPath`, `name` or `template` keeps the old value. Pass `template` again to change it.
- `codeConnect.remove {"id": 4, "language": "swiftui"}` removes one language; without `language` it removes all of that component's links.
- `get_node {"id": 4, "fields": ["codeLinks"]}` shows a component's links.
- `component.playground {"id": 10, "properties": {"Has icon": false}, "language": "react"}` renders the connected snippet for other property values on a copy; nothing in the document changes. Use it to test every variant a template must cover.

## Publish: figcraft.connect.json and the CLI

The file format is `{"version": 1, "links": [{"component", "language", "importPath", "name", "template"}]}`, sorted. A link names a component by its name, so one link applies to every component or set with that name.

Import into an open document:

```json
["run_command", {"command": "codeConnect.import", "params": {"path": "figcraft.connect.json"}}]
```

`json` (text) works instead of `path`. The result is `{linked, warnings}`; an entry whose component name is not in the file is skipped with `link 2: no component named "Nope"`. It is one undo step; limits are 5,000 links, 4 MB, templates up to 4,000 characters.

From a repository or CI, without a running app:

```sh
figcraft-cli connect publish ui.figcraft --mappings figcraft.connect.json --dry-run
figcraft-cli connect publish ui.figcraft --mappings figcraft.connect.json
```

The dry run prints `1 component link(s) from figcraft.connect.json would be published to ui.figcraft (dry run: not saved)`. The real run saves the design file in place, written whole or not at all, with a version in its history, and prints `published 1 component link(s) ...`. Links that do not fit are warnings and are skipped; if nothing links, nothing is saved and the exit code is 1. Reopening the saved file and calling `get_code_connect_map` returned the link.

## Pitfalls

- **Quotes inside a string value.** A swift template `AcmeButton("{Label}")` printed `AcmeButton(""Button"")`: the value already carries its quotes. Write `{Label}` bare.
- **Quoting in React.** `variant="{State}"` printed `variant="{"Rest"}"`. Write `variant={State}`.
- **Unknown names.** `size={Size}` on a component with no `Size` property is accepted and printed literally; read `unknown` in every result.
- **Instances of a variant.** `get_code_connect_map {"id": <instance>}` reports the component the instance was made from, the set's link applies.
- **Names are the key on import.** Rename a component and its entry in `figcraft.connect.json` stops matching.

## Verify

1. `unknown` is `[]` for every `add_code_connect_map`.
2. `get_code_connect_map {"id": <instance>}` shows the expected `import` and `code`.
3. `inspect.code` on a frame with the instance prints the snippet, not generated markup.
4. After `connect publish`, reopen the file (`open_file {"path": ...}` then `get_code_connect_map {"document": <opened id>}`) and see the links.
