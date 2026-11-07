---
name: figcraft-scripting
description: Runs a Rhai script inside FigCraft with run_script, for loops, conditions and bulk edits as one undo step that rolls back whole on any error, with cmd, find, get and log host functions and a dry run. Use when the user asks to create many similar layers, rename or restyle by a rule, or do anything that needs a loop or a branch.
---

# Scripting with run_script

Read figcraft-use first for ids vs selection, `dryRun` and the verify loop.

`run_script` runs one Rhai script against the document. All its commands form one undo step. If the script throws, or any command fails and is not caught, nothing is changed. Use it when `batch` would need a long list of near-identical steps or a decision between steps; use `batch` for a fixed list of steps.

## Host functions

| Function | Does |
|---|---|
| `cmd("id", #{params})` | Runs any engine command (ids from `list_commands`) and returns its result as a map. `cmd("id")` takes no params. |
| `find(#{filters})` | Array of ids from `node.find` (`name`, `nameGlob`, `type`, `parent`, ...). At most 1000; more matches is an error, so narrow the filters. |
| `get(id)` | The layer as a map (`width`, `name`, `fills`, ...). |
| `log("text")` | Adds a line to `logs`. `print` also logs. |

The last expression is returned as `value`. Maps are `#{x: 10}`, arrays `[1, 2]`, ids are integers. `for`, `while`, `if`, `let`, `fn`, `try`/`catch` and string methods such as `to_upper()` work.

## Calls that were run

Three cards (the script returned the ids `[2, 3, 4]`):

```json
{"code":"let ids = [];\nfor i in 0..3 {\n  let r = cmd(\"node.create\", #{type: \"frame\", name: \"Card \" + i, x: i * 220, y: 0, width: 200, height: 120});\n  ids.push(r.id);\n}\nids"}
```

Change by a rule; returned `3` and logged `resized 3`:

```json
{"code":"let n = 0;\nfor id in find(#{nameGlob: \"Card*\"}) {\n  let node = get(id);\n  if node.width < 300 { cmd(\"node.set\", #{ids: [id], props: #{width: 300}}); n += 1; }\n}\nlog(\"resized \" + n);\nn"}
```

Skip failures instead of aborting. A caught command leaves nothing behind; the result was `{ok: 1, bad: 1}` with `skip 999: no such node 999` in `logs`:

```json
{"code":"let ok = 0; let bad = 0;\nfor id in [999, 2] {\n  try { cmd(\"node.set\", #{ids: [id], props: #{height: 80}}); ok += 1; } catch (e) { bad += 1; log(\"skip \" + id + \": \" + e); }\n}\n#{ok: ok, bad: bad}"}
```

A helper function, and a stack with children created under it (`parent` takes the id from the previous `cmd`):

```json
{"code":"let t = cmd(\"node.create\", #{type: \"frame\", name: \"Stack\", width: 100, height: 100, props: #{layout: #{mode: \"vertical\"}, gap: 4}});\nfor w in [\"a\", \"b\"] { cmd(\"node.create\", #{type: \"text\", parent: t.id, text: w.to_upper()}); }\nfind(#{parent: t.id}).len()"}
```

It returned `2`.

## Result

`{value, logs, created: [ids], changed, deleted, commands, operations}`. The history entry is labelled `Script`.

`dryRun: true` runs the script, reports `{dryRun, wouldChange, created, deleted, count, result}` and undoes everything. Run it first for any script that edits existing layers.

## Errors

An error names the line and column, shows that line and says nothing was changed:

```
script error at line 1, column 9: Syntax error: Unexpected ';'
  1 | let x = ;
nothing was changed
```

An uncaught failing command stops the script the same way (`Runtime error: no such node 999`). The `node.create` earlier in that script did not remain: `find_nodes` found nothing afterwards.

## Limits

- No files, no `import` (a reserved word), no `eval`, no clock. Commands that touch files or the app, undo and redo, `command.batch` and `script.*` are refused: `` `file.save` isn't available to plugins and scripts``.
- `maxOperations` defaults to 200000 and goes up to 5000000. An endless loop with `maxOperations: 1000` stopped with `the script used more than 1000 operations (an endless loop?)`. At most 10000 commands, 100000 bytes of code, arrays of 1000 items, maps of 250 keys, strings of 1 MB, call depth 32.
- Nothing limits wall-clock time, so one command on a huge document can still be slow. Test on a small selection first.

## Pitfalls

- Pass `ids` in `cmd("node.set", ...)`; without it the command acts on the selection, which may be the user's.
- `ifRev` works on `run_script` like on other writes (figcraft-use).
- To carry a change to the same element on every screen, use `propagate_change` (figcraft-apply-everywhere), which previews first; a script suits creating layers or rule-based editing.

## Verify

Check `created` and `changed` against what you expected, `get_nodes` or `screenshot` the result, and `undo` once to remove the whole script.
