# Changelog

## 0.4.0 (2026-11-12)

- New skills: `figcraft-bulk-edits` (checkpoint, `scope.set` and `lock.set`, batch `assert` and `preview`, `maxAffected`, `changesets`, `check_changes`, `visual_diff`, and recipes for `fill_instances`, `swap_component`, `replace_color` and `command.each`) and `figcraft-copy-and-i18n` (`extract_text`, `apply_text`, `text.pseudoLocalize`). The plugin now has 20 skills.
- Updated: `figcraft-use` (67 tools, the `core` profile and `more_tools`, `maxAffected` and `as`, batch `assert` and `preview`, `get_selection_context`), `figcraft-apply-everywhere` (`maxAffected`, pointer to bulk edits), `figcraft-audit-design` (`fix_contrast`, `check_changes`), `figcraft-boards` (`get_board`), `figcraft-export-assets` (`export_assets`), `figcraft-generate-library` and `figcraft-files` (`design_system_index`), `figcraft-import-html` (grid, absolute positioning, stretched flex rows, `@media` min and max width, `:first-child`, `:last-child`, `:nth-child`).
- Removed claims that are no longer true: no grid or positioning in `import_html`, flex items stretch only in a fixed-height container, no dedicated board read.
- Known from the test runs: `swap_component` with `mapOverrides` did not carry a text override to a renamed layer (the skill says to read it back); `check_changes` and `visual_diff` take a checkpoint's `id` or integer index as `since`, not its name.
- `scripts/check.mjs` accepts digits in skill names.

## 0.3.0 (2026-11-11)

- OpenCode: the repository is also an OpenCode 2 plugin (`opencode/`, root `package.json`). It registers the `figcraft` MCP server and all skills, plus the OpenCode-only skill `figcraft-opencode`. Install with `opencode plugin add github:NourEldinShobier/figcraft-plugin`.
- `scripts/check.mjs` also checks the OpenCode-only skills.

## 0.2.0 (2026-11-08)

- New skills: `figcraft-scripting` (`run_script`) and `figcraft-import-html` (`import_html`). The plugin now has 18 skills.
- Updated: `figcraft-use` (54 tools, `list_commands` paging, `rev` and `ifRev`, `summarize_document`, `#12` and `figcraft://node/12` ids), `figcraft-audit-design` (`lint_layout`, `check_accessibility`), `figcraft-export-assets` (screenshot `marks`, new token formats), `figcraft-design-to-code` (`get_design_context` extras, `get_design_guidelines`), `figcraft-diagram` (`generate_diagram` from Mermaid), `figcraft-files` (`diff_documents`, `summarize_document`).
- Removed claims that are no longer true: no Mermaid import, no touch-target or alt-text check, no `list_commands` limit, no scripting.
- Not covered by a skill yet: the app-restart notice and the 8 MiB result cap.

## 0.1.0 (2026-11-07)

First release: 16 skills (`figcraft-use`, `figcraft-files`, `figcraft-generate-design`, `figcraft-generate-library`, `figcraft-apply-everywhere`, `figcraft-audit-design`, `figcraft-design-to-code`, `figcraft-code-connect`, `figcraft-native-code`, `figcraft-prototype`, `figcraft-motion`, `figcraft-export-assets`, `figcraft-comments`, `figcraft-boards`, `figcraft-diagram`, `figcraft-plugins`).

The MCP server's own changes are in the FigCraft repository's `CHANGELOG.md`.
