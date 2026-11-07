---
name: figcraft-motion
description: Read FigCraft prototype transitions, smart animate and easing back with get_nodes and turn them into CSS transitions or a spring-based motion library by hand. Use when the user says "implement this animation", "motion from the prototype", "what easing does this use", "smart animate to code", or "how do I animate between these two screens". FigCraft has no timeline or keyframes.
---

# FigCraft motion

Read figcraft-use first for ids vs selection, `batch` with `$ref`, `dryRun` and the verify loop.

The only motion FigCraft stores is prototype interactions: a trigger on a layer, a destination frame, a transition type, a duration and an easing. There are no timelines, keyframe tracks, per-layer animation curves or Lottie export (`list_commands` with the filters `timeline`, `keyframe`, `lottie` finds nothing). So motion for code is "state A to state B, with this transition", and you write the CSS or JS yourself. Prototyping commands refuse on boards; use a design file.

## Author the motion as a pair of frames

Smart animate matches layers between the two frames by name and hierarchy, so give the layer that moves the same name in both frames.

```json
{"label":"Card open","commands":[
 {"command":"node.create","as":"a","params":{"type":"frame","name":"Closed","x":0,"y":0,"width":300,"height":200}},
 {"command":"node.create","as":"b","params":{"type":"frame","name":"Open","x":400,"y":0,"width":300,"height":200}},
 {"command":"node.create","as":"c1","params":{"type":"rectangle","name":"Card","parent":{"$ref":"a"},"x":20,"y":20,"width":100,"height":60}},
 {"command":"node.create","as":"c2","params":{"type":"rectangle","name":"Card","parent":{"$ref":"b"},"x":120,"y":80,"width":160,"height":100}},
 {"command":"proto.interaction.add","params":{"id":{"$ref":"c1"},"trigger":{"type":"onClick"},"action":{"type":"navigate","dest":{"$ref":"b"}},"transition":{"type":"smartAnimate"},"durationMs":400,"easing":{"customSpring":{"mass":1,"stiffness":300,"damping":20}}}}]}
```

`dest` goes inside `action`. Putting it beside `action` fails with "missing field dest". Transition types: `instant`, `dissolve`, `smartAnimate`, `moveIn`, `moveOut`, `push`, `slideIn`, `slideOut` (the last five take `direction`). Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInBack`, `easeOutBack`, `easeInOutBack`, `gentle`, `quick`, `bouncy`, `slow`, `{customBezier:{x1,y1,x2,y2}}`, `{customSpring:{mass,stiffness,damping}}`. Change one later with `proto.interaction.set {id, index, easing}`.

## Read it back

1. Interactions: `get_nodes {"where":{"name":"Card"},"fields":["interactions"]}` (or `get_node`). Each entry has `trigger`, `actions` (with `dest`), `transition`, `duration_ms`, `easing`. Fields at their default are left out.
2. Both states of the matching layers: `get_nodes {"ids":[2,3],"depth":2,"fields":["name","x","y","width","height","opacity","cornerRadius"]}`. Subtract the from-state values from the to-state values per layer name.
3. `inspect.code` and `get_design_context` return static CSS for one state and do not include transitions; the motion comes only from step 1.

## Translate to code

Smart animate tweens position, size, rotation, opacity, solid fills, strokes and corner radius. Visibility, text content, gradients and images take the destination's value, and unmatched layers dissolve.

- CSS: set the from-state as the base style and the to-state on a class, then `transition: transform 400ms <easing>, width 400ms <easing>, ...` for exactly the properties that differ. Prefer `transform: translate()` for x/y deltas.
- Durations: `duration_ms` applies to non-spring easings. A spring runs until it settles, so for spring easings ignore `duration_ms` and use the spring itself.
- Springs: pass `{type: "spring", stiffness, damping, mass}` to a library that has springs (for example Motion). The presets are mass 1 with stiffness/damping gentle 100/15, quick 300/20, bouncy 600/15, slow 80/20. In plain CSS use `linear()` with sampled points, or a library.
- Cubic easings: FigCraft's `easeIn`, `easeOut`, `easeInOut` are cubic curves. Close CSS equivalents are `cubic-bezier(0.32, 0, 0.67, 0)`, `cubic-bezier(0.33, 1, 0.68, 1)` and `cubic-bezier(0.65, 0, 0.35, 1)`; the back variants are `cubic-bezier(0.36, 0, 0.66, -0.56)`, `cubic-bezier(0.34, 1.56, 0.64, 1)` and `cubic-bezier(0.68, -0.6, 0.32, 1.6)`. A `customBezier` maps directly to `cubic-bezier(x1, y1, x2, y2)`.
- Trigger mapping: `onClick` to a click handler, `onHover` / `mouseEnter` / `mouseLeave` to hover or pointer events, `afterDelay {ms}` to a timer, `keyPress` to a key handler.
- Reduced motion: wrap the transition in `@media (prefers-reduced-motion: no-preference)`. FigCraft's own `pref.reduceMotion` only affects its UI.

## Check

Run the prototype in FigCraft with `proto.preview {"start": <frame id>}` (a floating preview) or `proto.present`, and compare it with your page side by side. In the headless MCP session `proto.preview` returns `{start}` and shows nothing, so this check needs the running app.

## Not available

No multi-step timelines, staggered sequences, scroll-linked motion, per-property easing, loops or Lottie. Describe those in the code request in words, or build them in code directly.
