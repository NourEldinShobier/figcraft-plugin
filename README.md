# FigCraft plugin for Claude Code

Sixteen skills that teach an AI agent to design with [FigCraft](https://github.com/NourEldinShobier/figcraft) through its MCP server: build screens and design systems, carry a change to the same element on every screen, audit tokens and contrast, link components to code, and more.

Every example in the skills was run against FigCraft's real engine (a headless MCP session). Where FigCraft cannot do something, the skill says so.

## Install

1. Install FigCraft and register its MCP server, for example:

   ```bash
   claude mcp add figcraft -- figcraft-cli mcp
   ```

   Start the FigCraft app first if you want edits to appear in its window; without it the server works on a headless copy.

2. Add this plugin:

   ```
   /plugin marketplace add NourEldinShobier/figcraft-plugin
   /plugin install figcraft@figcraft
   ```

Skills refer to tools by bare name (`find_similar`, `run_command`), so they work whatever name the server is registered under.

## Skills

| Skill | Use it to |
|---|---|
| `figcraft-use` | Foundation: tools, coordinates, ids vs selection, `batch`, `dryRun`, undo, the verify loop |
| `figcraft-files` | Create, open and save files; several documents at once; versions and checkpoints |
| `figcraft-generate-design` | Build a screen or page with auto layout, real text, styles and components |
| `figcraft-generate-library` | Build a design system: variables, modes, styles, components, variants |
| `figcraft-apply-everywhere` | Carry a change to the same element on other screens or files, previewed first |
| `figcraft-audit-design` | Find literal colours that should be tokens, contrast, overflow, icon and name problems |
| `figcraft-design-to-code` | Implement a frame as code that reuses linked components and tokens |
| `figcraft-code-connect` | Link components to code and publish the mappings |
| `figcraft-native-code` | SwiftUI, Jetpack Compose and Flutter output, and pushing native UI into a design |
| `figcraft-prototype` | Wire flows and interactions, and read them back |
| `figcraft-motion` | What FigCraft can say about motion today, and how to turn it into code |
| `figcraft-export-assets` | Export images, SVG, source code and tokens; contact sheets; large results |
| `figcraft-comments` | Work through review comments: fix, reply, resolve |
| `figcraft-boards` | Whiteboard boards: sections, stickies, shapes, connectors, tables |
| `figcraft-diagram` | Draw flowcharts, sequence layouts and architecture diagrams |
| `figcraft-plugins` | Write, import and run FigCraft plugins |

## Develop

```bash
node scripts/check.mjs
```

checks every `skills/*/SKILL.md`: front matter, description length, body length, no `mcp__` prefixes, no broken links. Skills are written against the tools and command ids of the FigCraft build they were tested with; run an example before changing it.

## Licence

MIT OR Apache-2.0, at your option. See `LICENSE-MIT` and `LICENSE-APACHE`.
