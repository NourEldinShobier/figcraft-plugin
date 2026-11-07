---
name: figcraft-prototype
description: Wires clickable prototypes in FigCraft with proto.* commands: navigate, back, overlays, transitions such as smartAnimate, flow starting points, variables and conditions, then checks the flow and reads it back. Use when the user says "make this clickable", "link these screens", "add a prototype flow", "open a modal on click", "add a back button", "show the flow", or "what does this button do".
---

# Build a prototype

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

Interactions belong to a layer (usually a button frame). Flows are named starting frames. Everything below runs through `run_command`; `batch` groups several into one undo step. The `prototype_flow` prompt (`screens`, `transition`) gives the short version of steps 1 to 4.

## Procedure

1. Get ids: `get_nodes` with `{"where":{"type":"FRAME"},"fields":["name"],"depth":0}`. Screens are top-level frames; triggers are buttons inside them.
2. Add one interaction per trigger layer (calls below).
3. Add flow starting points on the entry screens.
4. Verify: read the interactions back (below) and look at the screens with `contact_sheet`.
5. Play it: `proto.preview` (pane over the canvas, follows edits) or `proto.present` (full window). Both need the app attached; headless they accept the call (`{"start":2}`) and show no player state in `inspect_ui`.

## Calls (all ran)

Click navigates with an animated transition:

```json
{"command":"proto.interaction.add","params":{"id":3,"trigger":{"type":"onClick"},"action":{"type":"navigate","dest":5},"transition":{"type":"smartAnimate"},"durationMs":300,"easing":"easeOut"}}
```

Result `{"index":0}`. `id` is the trigger layer, `dest` a top-level frame id. Shorthand for a plain click-navigate: `{"id":6,"dest":9}`. Defaults when omitted: trigger `onClick`, transition `instant`, 300 ms, `easeOut`.

Back button:

```json
{"command":"proto.interaction.add","params":{"id":8,"trigger":{"type":"onClick"},"action":{"type":"back"}}}
```

Flow starting points (the frame must be top-level; a button id fails with `a flow starts at a top-level frame`):

```json
{"command":"proto.flow.add","params":{"start":2,"name":"Main flow"}}
{"command":"proto.flow.rename","params":{"start":9,"name":"Checkout","description":"Pay and confirm"}}
```

Overlay opened by a hover, placed under the button:

```json
{"command":"proto.interaction.add","params":{"id":3,"trigger":{"type":"onHover"},"action":{"type":"openOverlay","dest":10,"position":"bottomLeft","anchor":"triggerOutside","close_on_outside":true}}}
```

Overlay after a delay on a screen: trigger `{"type":"afterDelay","ms":1500}`, action `{"type":"openOverlay","dest":10,"position":"center"}`. Close with `{"type":"closeOverlay"}`.

Other values that worked:

- Triggers: `onClick`, `onHover`, `keyPress` with `key` such as `Shift+K` (also `Gamepad A`), `afterDelay` with `ms`. The command list also names `onPress`, `onDrag`, `mouseEnter`, `mouseLeave`, `mouseDown`, `mouseUp` (these four take `delayMs`).
- Actions: `navigate`, `back`, `scrollTo`, `openOverlay`, `swapOverlay`, `closeOverlay`, `openUrl` (`url`, `openInNewTab`), `changeTo`, `setVariable`, `setVariableMode`, `conditional`.
- Transitions: `instant`, `dissolve`, `smartAnimate`, `moveIn`, `moveOut`, `push`, `slideIn`, `slideOut`; directions `left`, `right`, `top`, `bottom`: `{"type":"push","direction":"left"}`.
- Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInBack`, `easeOutBack`, `easeInOutBack`, `gentle`, `quick`, `bouncy`, `slow`, `{"customBezier":{"x1":0.2,"y1":0,"x2":0,"y2":1}}` (accepted) or `{"customSpring":{"mass":1,"stiffness":200,"damping":20}}` (the spring form was accepted). Springs play until they settle; their duration does not follow `durationMs`.
- A layer can hold several interactions; each `add` returns the next `index`.

Edit and remove:

```json
{"command":"proto.interaction.set","params":{"id":6,"index":0,"transition":{"type":"push","direction":"left"},"durationMs":250}}
{"command":"proto.interaction.remove","params":{"id":3,"index":0}}
{"command":"proto.interaction.clear","params":{"ids":[3]}}
```

`set` patches fields on top of the current interaction. Unknown index: `no interaction 9`.

### Variables and conditions

Create the variable first (`variable.createCollection`, `variable.create` with `"type":"number"`), then use names in text expressions:

```json
{"command":"proto.interaction.add","params":{"id":3,"trigger":{"type":"onClick"},"actions":[
 {"type":"setVariable","variable":"count","expression":"count + 1"},
 {"type":"conditional","blocks":[
   {"expression":"count >= 3","actions":[{"type":"navigate","dest":9}]},
   {"actions":[{"type":"navigate","dest":5}]}]}],
 "transition":{"type":"dissolve"},"durationMs":200}}
```

A block without a condition is the else. FigCraft stores variables by id and expressions as trees (`op: greaterOrEqual`), so a read-back shows ids, not names. Check an expression without running the prototype:

```json
{"command":"proto.evaluate","params":{"expression":"count + 1"}}
```

returned `{"text":"count + 1","type":"number","value":{"type":"number","value":1.0}}` for a variable at 0. An unknown name fails with `No variable \`nope\``. Edit single actions with `proto.action.add/set/remove/move` (path `[i]`, or `[i, block, j]` inside a conditional) and blocks with `proto.conditional.addBlock/setCondition/removeBlock`. Mode switching: `{"type":"setVariableMode","collection":"Theme","mode":"Dark"}`.

### Device and player

`proto.settings` with `{"device":"iPhone 16"}` (also `Android Compact`, `iPad mini`, `MacBook Air`, `Desktop`, `Custom size` via `width`/`height`, `None`), `rotation`, `background`, `responsive`. I found no command that reads these settings back. `proto.presentOptions` sets scale (`fit`, `fitWidth`, `fill`, `actual`), `deviceFrame`, `hotspotHints`, `inspect`, `hideUi`.

## Verify and read a flow back

- One layer: `get_node` with `depth` 0 shows `interactions: [{trigger, actions, transition, duration_ms, easing}]`.
- All triggers at once: `get_nodes` with `{"where":{"type":"FRAME"},"fields":["name","interactions"],"depth":0}`. Layers without interactions have no `interactions` key, so the layers that do are your list of links.
- Flows: `inspect_document`, page entry `flows: [{name, start, description}]`.
- Whole prototype as text for review or git: `export_source` (interactions and flows are lines in it).
- Check every `dest` exists and every screen except the last has a way forward, and every screen after the first has a back or a link. Draw the graph as `Home -> Details -> Checkout` from the read-back and compare it with what the user asked for.

## Reading a flow for code

`get_design_context` and `inspect.code` return HTML/CSS for a layer and do not include interactions (confirmed on a button with one). For an implementation brief, combine three reads: the layer code from `get_design_context`, the `interactions` from `get_nodes`, and frame names from the flow list. Map `navigate` to routes, `openOverlay` to modals or popovers, `back` to history back, `setVariable` and `conditional` to state and branches, `afterDelay` to timers, `keyPress` to key handlers.

## Failures I hit

- `destination 9999 doesn't exist` for a bad `dest`.
- `action: missing field dest` when `navigate` has none.
- `action: unknown variant nope, expected one of navigate, back, ...` lists valid action types.
- `easing: unknown variant wobbly` lists valid easings.
- A failed `add` changes nothing. A `batch` containing a failed step rolls the whole batch back.
- `dryRun: true` inside `params` returns what would change, with the `index` it would take.
- `edit.duplicate` on a screen copies its buttons' interactions with the same `dest` (confirmed: the copy still pointed at frame 5). Re-point them with `proto.interaction.set`.

## Pitfalls

- Triggers are layers inside frames, destinations are top-level frames. Do not use a nested frame as `dest` or as a flow start.
- Boards (whiteboard files) refuse `proto.*` commands.
- `undo` removes one `add` at a time; `checkpoint` before wiring many screens.
