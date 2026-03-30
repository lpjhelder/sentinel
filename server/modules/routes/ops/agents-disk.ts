import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { normalizePathEnv } from "../../../config/runtime.ts";

type AgentsDiskContext = {
  app: Express;
  db: DatabaseSync;
  broadcast: (event: string, data: unknown) => void;
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
/*  Frontmatter parser                                                 */
/* ------------------------------------------------------------------ */

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {};
  if (!content.startsWith("---")) return { meta, body: content };

  const endIdx = content.indexOf("\n---", 3);
  if (endIdx === -1) return { meta, body: content };

  const frontmatter = content.slice(4, endIdx).trim();
  for (const line of frontmatter.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key && val) meta[key] = val;
  }

  const body = content.slice(endIdx + 4).trim();
  return { meta, body };
}

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

export function registerAgentsDiskRoutes(ctx: AgentsDiskContext) {
  const { app, db, broadcast, readSettingString } = ctx;

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

  // POST /api/agents-disk/sync — sync .md files → database agents
  app.post("/api/agents-disk/sync", (_req, res) => {
    try {
      const dir = resolveAgentsDir(readSettingString);

      if (!fs.existsSync(dir)) {
        return res.json({ synced: 0, skipped: 0, warning: "directory_not_found" });
      }

      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
      let synced = 0;
      let skipped = 0;
      const details: Array<{ file: string; agent: string; action: string }> = [];

      for (const file of files) {
        try {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const { meta, body } = parseFrontmatter(content);

          // Resolve agent name: frontmatter "name" field or filename
          const diskName = meta.name || file.replace(/\.md$/, "");

          // Match agent by name (case-insensitive, strip hyphens/spaces)
          const normalize = (s: string) => s.toLowerCase().replace(/[-_ ]/g, "");
          const agents = db.prepare("SELECT id, name, personality FROM agents").all() as Array<{
            id: string;
            name: string;
            personality: string | null;
          }>;

          const match = agents.find((a) => normalize(a.name) === normalize(diskName));

          if (!match) {
            skipped++;
            details.push({ file, agent: diskName, action: "no_match" });
            continue;
          }

          // Build personality from frontmatter description + body
          const description = meta.description || "";
          const personality = description || body.slice(0, 500) || match.personality || "";

          // Only update if personality actually changed
          if (personality && personality !== match.personality) {
            db.prepare("UPDATE agents SET personality = ? WHERE id = ?").run(personality, match.id);
            broadcast("agent_status", db.prepare("SELECT * FROM agents WHERE id = ?").get(match.id));
            synced++;
            details.push({ file, agent: match.name, action: "updated" });
          } else {
            skipped++;
            details.push({ file, agent: match.name, action: "unchanged" });
          }
        } catch {
          skipped++;
          details.push({ file, agent: "?", action: "error" });
        }
      }

      res.json({ synced, skipped, total: files.length, details });
    } catch (err) {
      res.status(500).json({ error: "sync_failed", message: String(err) });
    }
  });
}
