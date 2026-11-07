---
name: figcraft-plugins
description: Write, import, run and publish FigCraft plugins and widgets: the figcraft-plugin.json manifest, the WebAssembly ABI, permissions, fuel and memory limits, plugin.run and plugin.event, and figcraft-cli plugin publish. Use when the user says "write a FigCraft plugin", "automate this with a plugin", "make a widget", "plugin manifest", "publish a plugin", or "plugin ran out of fuel".
---

# FigCraft plugins

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

A plugin is a WebAssembly module plus a JSON manifest. It changes the document only by calling FigCraft commands (the same ids as `list_commands`), inside a sandbox with no file system, network, clock or randomness. JavaScript plugins from other apps do not run. For a one-off edit, a `batch` of commands is simpler than a plugin; write a plugin when the logic needs loops, branching on document content, a panel, or a widget.

Full reference: `docs/plugins.md` in the FigCraft repository.

## Procedure

1. Pick the kind: a command plugin (`api` 1), one with a panel and settings (`api` 2), a widget (`api` 3, `"widget": true`), with `saveFile` or widget fields and menus (`api` 4), or a widget that opens a panel (`api` 5).
2. Write the manifest `figcraft-plugin.json`, next to the module:

```json
{
  "id": "dev.example.hello",
  "name": "Hello",
  "version": "1.0.0",
  "main": "hello.wasm",
  "api": 1,
  "permissions": { "access": "read" },
  "commands": [{ "id": "hi", "label": "Say hi" }]
}
```

   - `id`: 1 to 128 letters, digits, `.`, `-`, `_` (a reverse domain). Anything else is refused on import.
   - `permissions.access`: `read` (default) or `write`. `permissions.commands` is an optional allowlist of ids or prefixes such as `node.*`. Request the narrowest set that works.
   - `commands[].params[]`: `{name, label?, type, default?, options?, min?, max?}` with type `text`, `number`, `boolean`, `select`, `list`, `slider` or `color`. FigCraft validates and defaults them before the plugin runs.
3. Build the module. The Rust route: the repository's `plugins/sdk` crate (`figcraft-plugin-sdk`) with `crate-type = ["cdylib"]` and `cargo build --release --target wasm32-unknown-unknown`; `plugins/examples` has four complete plugins (tidy-names, swatch-grid, counter, export-names). Any language works if the module exports `memory` and `figcraft_run(input_len) -> i32` (0 is success) and only imports from the module `figcraft`: `call`, `selection`, `reply_len`, `reply_read`, `log`, `notify`, `set_output`, plus `ui_show`, `setting_*`, `save_file`, `widget_render` for the higher API levels. Input arrives as JSON in the reply buffer: `{"api","command","params","selection"}`.
4. Import and run it through the tools:

```json
{"command":"plugin.import","params":{"path":"D:/plugins/hello"}}
{"command":"plugin.run","params":{"id":"dev.example.hello","command":"hi","fuel":1000000}}
```

Both are `run_command` calls.

   `path` is the manifest or its folder; it is read again on every run, so a rebuilt module is picked up without re-importing. Without a file, pass `{"manifest": {...}, "wasm": "<base64>"}`; that plugin lasts for the session. The result of `plugin.run` is `{output, logs, calls, fuel, panel}`: `output` is what the plugin passed to `set_output` (parsed when it is JSON), `fuel` is what it used.
5. Panels (`api` 2+): `plugin.run` returns the open `panel`; drive it with `plugin.ui {id}` (controls and values), `plugin.event {id, control, value?}` (press a button or set a field) and `plugin.close {id}`. Widgets: `widget.insert {plugin, x, y}`, `widget.click {id, target}`, `widget.setText {id, field, value}`, `widget.menu {id, item, value?}`, `widget.list`.
6. Remove with `plugin.remove {id}`.

I confirmed steps 2 to 4 headless with a hand-assembled 125-byte module that calls `set_output`: import by `manifest`+`wasm` and by folder `path` both worked, and `plugin.run` returned `{"hello":"from wasm"}` using about 10,000 fuel.

## Safety limits to design for

- One undo step per run (and per panel or widget callback). If the plugin returns non-zero, traps, panics, or exhausts fuel or memory, the document, selection and page are restored.
- Per run: 1,000,000,000 fuel, 64 MB memory, 100,000 host calls (each costs 10,000 fuel), 16 MB per string, 1,000 log lines, modules up to 16 MB. `plugin.run {fuel}` lowers the budget, which is useful for testing runaway loops.
- A `read` plugin cannot change the document: the change is undone and refused. Plugins cannot call `file.*`, `app.*`, `pref.*`, `collab.*`, `doc.*` (except `doc.list`), `version.*`, `edit.undo`, `command.batch`, `plugin.*`, `widget.*`, or commands that open a dialog. Layer data keys starting `figcraft.widget` are reserved.
- Plugins never get file paths. With `permissions.saveFile` (api 4) a plugin may offer one file (16 MB at most) and FigCraft asks the user where to save it.
- Per-layer storage for plugins is `node.set {id, props: {pluginData: {key: value}}}`; read it back from `node.get`. There is no per-document store.
- Widgets: state up to 16 KB; layers limited to frames, text, rectangles, ellipses, images (lines and SVG from api 6). No hover or timer events.

## Publish

A team's `figcraft-server` can host a plugin directory. Publishing needs the server key and a `version` of one to four numbers that is newer than the last:

```sh
FIGCRAFT_SERVER_KEY=<key> figcraft-cli plugin publish ./hello --server ws://host:47900/
```

The folder holds `figcraft-plugin.json`, the module and an optional `assets/` (up to 32 files). The same exists as `plugin.directory.publish {path, server}`; `plugin.directory.list {server, query?}` browses, `plugin.directory.install {id, confirm: true}` installs after you have shown the user the permissions (it verifies the SHA-256), `plugin.directory.unpublish {id, version?, server}` takes one down. There is no public catalogue, no accounts and no signatures: the server key is the publisher. The browser build has no directory.

## Pitfalls

- A session started by `figcraft-cli mcp` or `run` starts with no plugins; import first.
- A manifest asking for a newer `api` than the running FigCraft is refused, and a widget description using a feature above the manifest's `api` is refused.
- Do not put the server key in the `--server` URL when you can use the environment variable; the URL ends up in shell history.
- Ask the user before running `plugin.directory.install` or importing a module you did not build: it executes its code.

## Verify

`plugin.list` shows the plugin with `loaded: true`. After a run, check `output`, `logs` and `fuel`, then `inspect_document` or `get_nodes` for the document changes, and for a `write` plugin `undo` once to confirm the whole run was one step.
