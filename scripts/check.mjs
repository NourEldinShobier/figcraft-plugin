// Checks every skills/*/SKILL.md against the plugin format rules. Usage: node scripts/check.mjs
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");
const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{FE0F}]/u;
const rows = [];
let failed = false;

for (const name of readdirSync(skillsDir).sort()) {
  const dir = join(skillsDir, name);
  if (!statSync(dir).isDirectory()) continue;
  const errs = [];
  const file = join(dir, "SKILL.md");
  let text = "";
  if (!existsSync(file)) errs.push("no SKILL.md");
  else text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  let descLen = 0, bodyLines = 0;
  if (text) {
    const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) errs.push("no frontmatter");
    else {
      const keys = {};
      for (const l of m[1].split("\n")) {
        const k = l.match(/^([A-Za-z_-]+):\s*(.*)$/);
        if (k) keys[k[1]] = k[2].trim();
        else if (l.trim()) errs.push("multi-line frontmatter value");
      }
      const names = Object.keys(keys);
      if (names.length !== 2 || !("name" in keys) || !("description" in keys)) errs.push("frontmatter keys must be exactly name, description");
      if (keys.name !== name) errs.push(`name "${keys.name}" != folder`);
      const d = (keys.description || "").replace(/^["']|["']$/g, "");
      descLen = d.length;
      if (descLen > 450) errs.push(`description ${descLen} > 450`);
      if (!d.includes("Use when")) errs.push('description lacks "Use when"');
      if (/^(use when|this skill)/i.test(d)) errs.push("description must start with what the skill does");
      bodyLines = m[2].replace(/\n$/, "").split("\n").length;
      if (bodyLines > 220) errs.push(`body ${bodyLines} > 220 lines`);
    }
    if (/mcp__/.test(text)) errs.push("mcp__ prefix");
    if (emoji.test(text)) errs.push("emoji");
    // relative links and skill references
    for (const l of text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) {
      if (!existsSync(join(dir, l[1].split("#")[0]))) errs.push(`broken link ${l[1]}`);
    }
    for (const r of new Set(text.match(/\bfigcraft-[a-z-]+\b/g) || [])) {
      if (["figcraft-cli","figcraft-server"].includes(r) || r === "figcraft-plugin" || r === "figcraft-plugin.json") continue;
      if (/^figcraft-[a-z-]+$/.test(r) && !existsSync(join(skillsDir, r)) && !/^figcraft-(cli|plugin)/.test(r) && !/^figcraft-connect/.test(r))
        errs.push(`unknown skill ref ${r}`);
    }
  }
  if (errs.length) failed = true;
  rows.push([name, descLen, bodyLines, errs.length ? "FAIL" : "ok", errs.join("; ")]);
}

const w = [Math.max(...rows.map(r => r[0].length), 5), 5, 5, 4];
console.log(["skill".padEnd(w[0]), "desc".padStart(w[1]), "lines".padStart(w[2]), "stat", "problems"].join("  "));
for (const r of rows) console.log([r[0].padEnd(w[0]), String(r[1]).padStart(w[1]), String(r[2]).padStart(w[2]), r[3].padEnd(w[3]), r[4]].join("  "));
process.exit(failed ? 1 : 0);
