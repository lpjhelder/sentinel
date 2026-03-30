import type { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { normalizePathEnv } from "../../../config/runtime.ts";

type AgentsDiskContext = {
  app: Express;
  readSettingString: (key: string) => string;
};

/* ------------------------------------------------------------------ */
/*  Path resolution: ENV > DB setting > default ~/.claude/agents/     */
/* ------------------------------------------------------------------ */

function resolveAgentsDir(readSettingString: (key: string) => string): string {
  const fromEnv = normalizePathEnv(process.env.AGENTS_DIR);
  if (fromEnv) return fromEnv;

  const fromDb = readSettingString("agentsDir");
  if (fromDb) return normalizePathEnv(fromDb) || fromDb;

  return normalizePathEnv("~/.claude/agents/");
}

/* ------------------------------------------------------------------ */
/*  Security: filename validation                                      */
/* ------------------------------------------------------------------ */

const VALID_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function sanitizeName(raw: string): string | null {
  const name = raw.replace(/\.md$/i, "").trim();
  if (!name || !VALID_NAME_RE.test(name)) return null;
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return null;
  return name;
}

function safePath(dir: string, name: string): string | null {
  const full = path.resolve(dir, `${name}.md`);
  const resolvedDir = path.resolve(dir);
  if (!full.startsWith(resolvedDir + path.sep) && full !== resolvedDir) return null;
  return full;
}

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

export function registerAgentsDiskRoutes(ctx: AgentsDiskContext) {
  const { app, readSettingString } = ctx;

  // GET /api/agents-disk — list all .md files
  app.get("/api/agents-disk", (_req, res) => {
    try {
      const dir = resolveAgentsDir(readSettingString);

      if (!fs.existsSync(dir)) {
        return res.json({ agents: [], dir, warning: "directory_not_found" });
      }

      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
      const agents = files.map((f) => {
        const stat = fs.statSync(path.join(dir, f));
        return {
          name: f.replace(/\.md$/, ""),
          filename: f,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        };
      });

      res.json({ agents, dir });
    } catch (err) {
      res.status(500).json({ error: "list_failed", message: String(err) });
    }
  });

  // GET /api/agents-disk/:name — read one .md file
  app.get("/api/agents-disk/:name", (req, res) => {
    try {
      const dir = resolveAgentsDir(readSettingString);
      const name = sanitizeName(req.params.name);
      if (!name) return res.status(400).json({ error: "invalid_name" });

      const filePath = safePath(dir, name);
      if (!filePath) return res.status(400).json({ error: "invalid_path" });

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "not_found", name });
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const stat = fs.statSync(filePath);

      res.json({ name, content, size: stat.size, modifiedAt: stat.mtime.toISOString() });
    } catch (err) {
      res.status(500).json({ error: "read_failed", message: String(err) });
    }
  });

  // PUT /api/agents-disk/:name — write/update a .md file
  app.put("/api/agents-disk/:name", (req, res) => {
    try {
      const dir = resolveAgentsDir(readSettingString);
      const name = sanitizeName(req.params.name);
      if (!name) return res.status(400).json({ error: "invalid_name" });

      const filePath = safePath(dir, name);
      if (!filePath) return res.status(400).json({ error: "invalid_path" });

      const { content } = req.body;
      if (typeof content !== "string") {
        return res.status(400).json({ error: "missing_content" });
      }

      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content, "utf-8");

      res.json({ ok: true, name });
    } catch (err) {
      res.status(500).json({ error: "write_failed", message: String(err) });
    }
  });

  // DELETE /api/agents-disk/:name — delete a .md file
  app.delete("/api/agents-disk/:name", (req, res) => {
    try {
      const dir = resolveAgentsDir(readSettingString);
      const name = sanitizeName(req.params.name);
      if (!name) return res.status(400).json({ error: "invalid_name" });

      const filePath = safePath(dir, name);
      if (!filePath) return res.status(400).json({ error: "invalid_path" });

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "not_found", name });
      }

      fs.unlinkSync(filePath);
      res.json({ ok: true, name });
    } catch (err) {
      res.status(500).json({ error: "delete_failed", message: String(err) });
    }
  });
}
