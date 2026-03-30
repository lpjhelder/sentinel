import type { RuntimeContext } from "../../types/runtime-context.ts";

export type HookRouteDeps = Pick<RuntimeContext, "app" | "db" | "broadcast">;

interface HookEvent {
  hook_type: string;
  session_id: string;
  agent_name: string;
  tool_name: string;
  project_path: string;
  timestamp: number;
  received_at: number;
}

const RING_BUFFER_SIZE = 50;
const recentHookEvents: HookEvent[] = [];

export function registerHookRoutes(deps: HookRouteDeps): void {
  const { app, db, broadcast } = deps;

  // POST /api/hooks/event — Receives Claude Code hook events
  app.post("/api/hooks/event", (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const hook_type = typeof body.hook_type === "string" ? body.hook_type.trim() : "";
      const session_id = typeof body.session_id === "string" ? body.session_id.trim() : "";
      const agent_name = typeof body.agent_name === "string" ? body.agent_name.trim() : "";
      const tool_name = typeof body.tool_name === "string" ? body.tool_name.trim() : "";
      const project_path = typeof body.project_path === "string" ? body.project_path.trim() : "";
      const timestamp = typeof body.timestamp === "number" ? body.timestamp : Date.now();

      if (!hook_type) return res.status(400).json({ error: "hook_type_required" });

      // Find agent by name
      if (agent_name) {
        const agent = db
          .prepare("SELECT id FROM agents WHERE name = ? LIMIT 1")
          .get(agent_name) as { id: string } | undefined;

        if (agent) {
          if (hook_type === "PreToolUse") {
            db.prepare("UPDATE agents SET status = 'working' WHERE id = ?").run(agent.id);
            broadcast("agent_status", { id: agent.id, status: "working" });
          } else if (hook_type === "Stop") {
            db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(agent.id);
            broadcast("agent_status", { id: agent.id, status: "idle" });
          }
        }
      }

      // Store event in ring buffer
      const event: HookEvent = {
        hook_type,
        session_id,
        agent_name,
        tool_name,
        project_path,
        timestamp,
        received_at: Date.now(),
      };

      if (recentHookEvents.length >= RING_BUFFER_SIZE) {
        recentHookEvents.shift();
      }
      recentHookEvents.push(event);

      broadcast("hook_activity", event);
      res.json({ ok: true });
    } catch (err) {
      console.error("[hooks] POST event failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // GET /api/hooks/events — List recent hook events (optional helper)
  app.get("/api/hooks/events", (_req, res) => {
    res.json({ events: recentHookEvents });
  });
}
