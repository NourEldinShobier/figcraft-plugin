// FigCraft plugin for OpenCode 2: registers the FigCraft MCP server and the bundled skills.
// No dependencies: the plugin object is plain data plus a setup function.
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
// The shared skills sit at the repository root (also read by the Claude Code plugin); the skills
// that exist only for OpenCode sit beside this file.
const skillsDirs = [join(here, "..", "skills"), join(here, "skills")]

/** The FigCraft command line (it serves MCP with `mcp`). Option `command` wins, then FIGCRAFT_CLI. */
function figcraftCommand(options) {
  if (Array.isArray(options?.command) && options.command.length > 0) return options.command
  if (typeof options?.command === "string" && options.command) return [options.command, "mcp"]
  if (process.env.FIGCRAFT_CLI) return [process.env.FIGCRAFT_CLI, "mcp"]
  const candidates = []
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    candidates.push(join(process.env.LOCALAPPDATA, "Programs", "FigCraft", "figcraft-cli.exe"))
  }
  if (process.env.HOME) {
    candidates.push(join(process.env.HOME, ".local", "bin", "figcraft-cli"), "/usr/local/bin/figcraft-cli")
  }
  const found = candidates.find((p) => existsSync(p))
  return [found ?? "figcraft-cli", "mcp"]
}

/** `{name, description, body}` of a SKILL.md; the front matter holds only those two keys. */
function parseSkill(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!m) return { name: "", description: "", body: text }
  const field = (key) => {
    const line = new RegExp(`^${key}:\s*(.*)$`, "m").exec(m[1])
    return line ? line[1].trim().replace(/^["']|["']$/g, "") : ""
  }
  return { name: field("name"), description: field("description"), body: m[2] }
}

function loadSkills() {
  const out = []
  for (const skillsDir of skillsDirs) {
    if (!existsSync(skillsDir)) continue
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const path = join(skillsDir, entry.name, "SKILL.md")
      if (!existsSync(path)) continue
      const { name, description, body } = parseSkill(readFileSync(path, "utf8"))
      if (!description) continue
      out.push({ id: entry.name, name: name || entry.name, description, path, content: body })
    }
  }
  return out
}

export default {
  id: "figcraft",
  async setup(ctx) {
    const options = ctx.options ?? {}
    const registrations = []

    if (options.mcp !== false) {
      const command = figcraftCommand(options)
      const environment = options.environment && typeof options.environment === "object" ? options.environment : undefined
      registrations.push(
        await ctx.mcp.transform((editor) => {
          // A server the user already configured under this name is left alone.
          if (editor.get("figcraft")) return
          editor.set("figcraft", { type: "local", command, ...(environment ? { environment } : {}) })
        }),
      )
    }

    if (options.skills !== false) {
      const skills = loadSkills()
      registrations.push(
        await ctx.skill.transform((editor) => {
          for (const skill of skills) {
            if (editor.get(skill.id)) continue
            editor.add({ ...skill, autoinvoke: true })
          }
        }),
      )
    }

    return () => {
      for (const r of registrations) void r.dispose()
    }
  },
}
