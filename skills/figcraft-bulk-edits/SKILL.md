---
name: figcraft-bulk-edits
description: Runs large FigCraft edits safely: checkpoint, fence and lock layers, preview with dryRun or a batch preview, apply under a maxAffected cap, then check_changes, visual_diff and a changeset revert. Includes recipes for fill_instances (data merge), swap_component and replace_color. Use when a change touches many layers, screens or instances, or the user says "update all", "bulk", "mail merge", "swap every", "replace this colour everywhere".
---

# Bulk edits

Read figcraft-use first for ids vs selection, `batch`, `dryRun` and `ifRev`. This skill is the order to do things in when one call can change hundreds of layers. To copy a change from one layer to its twins use figcraft-apply-everywhere; for a custom loop use figcraft-scripting.

## The loop

1. Checkpoint: `checkpoint {"name":"before-restyle"}`. Keep the returned `id`. The checks below take it as `since`: the `id` string, or the integer index from `list_versions` (`0` is the oldest). A name is refused with `no version`.
2. Optional guards, below: `scope.set` to fence your edits, `lock.set` to protect layers.
3. Preview. `dryRun: true` on `set_properties`, `run_command` and the three recipe tools returns `wouldChange` and changes nothing. A batch can also run for real and roll back: `batch {"preview":true,...}` returns `{preview, rolledBack, results, diff}` where `diff` lists each changed layer with old and new values.
4. Apply inside `changesets begin` / `end`, so the whole task is one named, revertable unit.
5. Verify with `check_changes` and `visual_diff`.
6. Wrong? `changesets revert`, or `restore_version` with the checkpoint (figcraft-files).

## Cap the damage: maxAffected

Every write tool and `batch` takes `maxAffected` (default 200, or the server's `FIGCRAFT_MAX_AFFECTED`). A call that would change more is refused and nothing changes:

```
refused: node.set would change 2 layers, more than maxAffected 1 (sample ids: 3, 4). Nothing was changed. Narrow the target (ids, where) or pass confirm: true to apply it anyway
```

Set it to the number you expect, so a `where` that matches too much fails instead of landing. Raise it or add `confirm: true` only after a dry run showed the count is right. `propagate_change` takes a larger `maxAffected` instead of `confirm`.

## Assertions in a batch

A step `{"assert": {...}}` checks the document after the steps before it. If it is false the whole batch rolls back and the error names the step. Kinds: `noOverflow {root?}`, `noOverlap {root?}`, `contrast {root?}`, `count {where, min?, max?, equals?}`, `exists {where}`, `none {where}`. Ran:

```json
{"commands":[
 {"command":"node.set","params":{"where":{"type":"TEXT","root":2},"props":{"fill":"#CCCCCC"}}},
 {"assert":{"contrast":{"root":2}}}]}
```

It failed with `assertion contrast failed: 2 text layer(s) below AA contrast, e.g. Title; Body (the whole batch was rolled back: nothing changed)`. With `onError: "continue"` a failed assertion is one failed step instead.

## Fence and lock

- `run_command {"command":"scope.set","params":{"ids":[2]}}` fences the agent to layer 2 and everything inside it (`pages` takes page ids or names). Afterwards a write outside is refused: `node.set would change layer 5 "Row", outside the scope fence (layers 2)`. A batch or script that touches one is rolled back whole. The fence is session state of that file tab, not saved, and the person's own edits are not fenced. `scope.get` reads it, `scope.clear` lifts it; do not lift one you did not set.
- `lock.set {"ids":[3],"owner":"design-lead"}` locks layers and records the owner label. An edit by another label is refused (`locked by "design-lead". Pass as: "design-lead" if you are that owner`). Pass `as` on a write tool to act as an owner. `lock.list` shows owners and layers, `lock.release` frees them. Use it to keep two agents out of each other's layers; give each agent its own label.

## Record and undo one task: changesets

```json
{"action":"begin","label":"Grey text"}
```

Every mutating result's `changed` now carries `"changeset":"Grey text"`. `{"action":"end"}` returns `{id, label, steps, layers, created, changed, deleted}`; `{"action":"list"}` shows the open and finished ones (up to 50, this session). `{"action":"revert","id":1}` undoes just that change and keeps later work: edited layers go back, deleted ones return in place, created ones go (one undo step). It is refused, naming layers, when a later change touched the same layers: revert that one first, or restore the checkpoint. Layers only: styles and variables the changeset changed stay, and the result says so in `note`. One changeset is open at a time.

## Check what changed

`check_changes {"since":0}` runs the layout lint, accessibility audit, token audit and overflow check now and at the checkpoint, and returns only issues that are new: `{ok, new, resolved, counts: {layout, a11y, tokens, overflow}, issues}`. After greying two texts it reported one new contrast issue (the other already failed at the checkpoint, so it was not new). Limit it with `root` or `page`, or pick `checks`. `issues` is capped by `limit` (default 50) with `truncated`.

`visual_diff {"since":0,"sheet":"C:/path/diff.png"}` renders each top-level frame now and at the checkpoint and lists the ones whose pixels changed: `changed: [{id, name, status, changedPercent, bbox, targeted}]`, biggest first, plus `unchanged`. `sheet` writes a before / after / diff contact sheet for up to 16 frames; open it with `screenshot` or look at the file. `threshold` is the percent of a frame that must change to be listed. `targeted: false` (also listed in `untargeted`) marks a frame that changed without your last write touching it: a component edit reaching instances, a style or variable edit. Look at those first. `targeted` is unknown once anything else changed the file after your edit.

After a revert, `check_changes` returned `new: 0` and `visual_diff` returned `changed: []`.

## Recipes

### Data merge: fill_instances

Make one instance of a component per row, or update existing ones, as one undo step (up to 2000 rows). Columns match a component property, else a layer inside it by name (its text). Rows as objects or `csv` text whose first line names the columns:

```json
{"component":5,"csv":"name,Label\nAda,Ada Lovelace\nGrace,Grace Hopper","keyColumn":"name","x":0,"y":400,"gap":8}
```

It created three instances named by `name`, each with its `Label` text set (`{created, ids, failed, rows}`). Update them later by key:

```json
{"component":5,"mode":"update","csv":"name,Label\nGrace,Rear Adm. Grace Hopper\nNobody,x","keyColumn":"name"}
```

The result had `updated: 1` and `unmatchedRows: [{key:"Nobody", row:1}]` (rows count from 0 after the header). A failing row is reported in `failed` and the others still apply unless `continueOnError: false`. `map` renames columns: `{"Full name":"Label"}`; `null` skips a column. `parent` puts new instances in a frame; in an auto layout frame the layout places them. Use `dryRun` first. Split data over 2000 rows across calls.

### Swap a component: swap_component

```json
{"from":5,"to":11,"dryRun":true}
```

Swaps every instance of `from` (a set: every variant) to `to` (a set: its default variant) and returns `{swapped, ids, failed, unmatched: {layers, props}, skippedNested}`. Instances keep size, property values and overrides on layers whose names match: with both components having a layer `Label`, an overridden text stayed, and `unmatched` was empty. When `unmatched.layers` lists a name, those overrides are gone. `mapOverrides {"Label":"Title"}` is meant to carry them to a differently named layer, but the text did not carry over in my test: read it back with `extract_text` and, if it is missing, put it back with `fill_instances` in update mode. `ids` limits the swap; instances inside other instances are skipped (`skippedNested`).

### Replace a colour: replace_color

```json
{"from":"#2563EB","to":"#0F766E","scope":"file","dryRun":true}
```

Replaces solid fills, strokes and drop and inner shadows equal to `from`, keeping opacity and blend. `scope` is `page` (default), `file` or `selection` (`ids`). `scope: "file"` also recolours colour and effect styles holding the colour, so layers using them follow (`styles: false` to skip). Gradients, images and layers already bound to a variable are left alone and listed in `skippedBound`. `variable` binds the matches to a colour variable instead of writing a literal; `tolerance` (0 to 1 per channel) catches near matches. The dry run listed five layers, including text and component layers, which is why the cap matters.

### Any command on many layers: command.each

`run_command {"command":"command.each","params":{"command":"node.set","params":{"props":{"opacity":0.8}},"where":{"type":"TEXT","root":2},"limit":50}}` runs the command once per layer with `ids` set to it. It returns `{processed, ok, failed, remaining, done, items, nextCursor}`; call again with only `{"command":...,"cursor":"<nextCursor>"}` for the rest (a cursor cannot be combined with `ids` or `where`). The first failure rolls the call back unless `continueOnError: true`, which rolls back only the failed layer. Each call is one undo step.

## Pitfalls

- Run the dry run again after anything else changed the file; a stale list can include layers you did not mean.
- `ifRev` (figcraft-use) turns "someone else edited meanwhile" into a refusal instead of a silent overwrite.
- A bulk `where` or colour replace can include component masters and instances as well as the frames you meant; check the ids in the dry run.
- Headless sessions lose everything on exit: `save_file` when the result is good.
