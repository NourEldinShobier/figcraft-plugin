# FigCraft plugin for Claude Code and OpenCode

Eighteen skills that teach an AI agent to design with [FigCraft](https://github.com/NourEldinShobier/figcraft) through its MCP server: build screens and design systems, carry a change to the same element on every screen, audit tokens and contrast, link components to code, and more.

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
| `figcraft-files` | Create, open and save files; several documents at once; summarize a file; versions, checkpoints and diffs |
| `figcraft-generate-design` | Build a screen or page with auto layout, real text, styles and components |
| `figcraft-generate-library` | Build a design system: variables, modes, styles, components, variants |
| `figcraft-apply-everywhere` | Carry a change to the same element on other screens or files, previewed first |
| `figcraft-audit-design` | Find literal colours that should be tokens, contrast, tap targets, alt text, overlaps, misalignment, overflow, icon and name problems |
| `figcraft-design-to-code` | Implement a frame as code that reuses linked components and tokens, using the extras in `get_design_context` |
| `figcraft-code-connect` | Link components to code and publish the mappings |
| `figcraft-native-code` | SwiftUI, Jetpack Compose and Flutter output, and pushing native UI into a design |
| `figcraft-prototype` | Wire flows and interactions, and read them back |
| `figcraft-motion` | What FigCraft can say about motion today, and how to turn it into code |
| `figcraft-export-assets` | Export images, SVG, source code and tokens (CSS, DTCG, Tailwind, Style Dictionary, Swift, Kotlin, Android); screenshots with numbered marks; contact sheets |
| `figcraft-comments` | Work through review comments: fix, reply, resolve |
| `figcraft-boards` | Whiteboard boards: sections, stickies, shapes, connectors, tables |
| `figcraft-diagram` | Draw flowcharts, sequence diagrams and ERDs from Mermaid, or architecture diagrams by hand |
| `figcraft-plugins` | Write, import and run FigCraft plugins |
| `figcraft-scripting` | Loops, conditions and bulk edits with `run_script`, one undo step, rolled back on error |
| `figcraft-import-html` | Turn static HTML and CSS into auto layout layers, with warnings for what is dropped |

## OpenCode

The same skills and the FigCraft MCP server also install into [OpenCode](https://opencode.ai) 2 from this repository. Add it to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{ "plugins": ["github:NourEldinShobier/figcraft-plugin"] }
```

or run `opencode plugin add github:NourEldinShobier/figcraft-plugin`. For a local clone use its folder path instead (`"plugins": ["D:/path/to/figcraft-plugin"]`).

The plugin (in `opencode/`) registers an MCP server named `figcraft` that runs `figcraft-cli mcp` and every skill under `skills/`, plus `figcraft-opencode`, a short skill about OpenCode tool names (`figcraft_find_similar`). Options, given as `{"package": "...", "options": {...}}`:

| Option | Meaning |
|---|---|
| `command` | Path to `figcraft-cli`, or a full command array. Default: `FIGCRAFT_CLI`, then `%LOCALAPPDATA%\Programs\FigCraft\figcraft-cli.exe`, then `figcraft-cli` on PATH |
| `environment` | Extra environment variables for the server |
| `mcp` | `false` skips the MCP server |
| `skills` | `false` skips the skills |

An MCP server called `figcraft` that you configured yourself is left alone. Check with `opencode api GET /api/skill` and `opencode api GET /api/mcp`.

## Develop

```bash
node scripts/check.mjs
```

checks every `skills/*/SKILL.md`: front matter, description length, body length, no `mcp__` prefixes, no broken links. Skills are written against the tools and command ids of the FigCraft build they were tested with; run an example before changing it.

## Licence

MIT OR Apache-2.0, at your option. See `LICENSE-MIT` and `LICENSE-APACHE`.
