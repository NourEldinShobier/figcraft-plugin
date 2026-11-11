---
name: figcraft-opencode
description: How FigCraft's tools and skills appear in OpenCode: tool names, how to check the connection, and what to do when the app is not running. Use when a FigCraft tool is missing or has a different name than a skill says, or when starting any FigCraft task in OpenCode.
---

# FigCraft in OpenCode

The other FigCraft skills name tools without a prefix (`find_similar`, `run_command`). OpenCode prefixes every MCP tool with the server name, so the tool you call is `figcraft_find_similar`, `figcraft_run_command`, `figcraft_get_node` and so on. Use the prefixed name; the arguments are the same.

## Check the connection

1. Call `figcraft_diagnostics`. `attached: true` means the FigCraft app is open and edits show in its window. `attached: false` means a headless copy: edits are not in the window, and nothing is saved unless you `figcraft_save_file`.
2. If no `figcraft_*` tool exists, the server did not start. Run `opencode mcp list` and look at the `figcraft` entry. The plugin starts `figcraft-cli mcp`; set the plugin option `command` or the environment variable `FIGCRAFT_CLI` to the full path of `figcraft-cli` if it is not found.
3. After a FigCraft update, restart the FigCraft app and then OpenCode (`opencode service restart`) so both use the new build.

## Reading the other skills

- Start with `figcraft-use`: ids, `batch`, `dryRun`, undo, and the verify loop.
- Mention a skill with `@figcraft-use` to load it, or let OpenCode pick it from its description.
- `run_command` takes engine command ids; `figcraft_list_commands` (with `filter`, `limit`, `offset`) lists them.
- A tool result that mentions a document id applies to the open file with that id; pass `document` to act on another file.
