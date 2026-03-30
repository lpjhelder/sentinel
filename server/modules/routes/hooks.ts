import type { RuntimeContext } from "../../types/runtime-context.ts";

export type HookRouteDeps = Pick<
  RuntimeContext,
  "app" | "db" | "broadcast" | "meetingPresenceUntil" | "meetingSeatIndexByAgent" | "meetingPhaseByAgent" | "meetingTaskIdByAgent" | "meetingReviewDecisionByAgent"
>;

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

  // ─── Meeting Trigger Endpoints (for Claude Code plan mode integration) ───

  const {
    meetingPresenceUntil,
    meetingSeatIndexByAgent,
    meetingPhaseByAgent,
    meetingTaskIdByAgent,
    meetingReviewDecisionByAgent,
  } = deps;

  // POST /api/meetings/start — Seat agents at the collab table
  app.post("/api/meetings/start", (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const phase = body.phase === "review" ? "review" : "kickoff";
      const taskId = typeof body.task_id === "string" ? body.task_id : `hook-${Date.now()}`;
      const holdMs = typeof body.hold_ms === "number" ? body.hold_ms : 600_000;
      const agentNames = Array.isArray(body.agent_names) ? body.agent_names : [];

      if (agentNames.length === 0) {
        return res.status(400).json({ error: "agent_names required (array of agent names)" });
      }

      // Resolve agent IDs from names
      const agents = agentNames.slice(0, 6).map((name: unknown) => {
        const n = typeof name === "string" ? name.trim() : "";
        return n
          ? (db.prepare("SELECT id, name FROM agents WHERE name = ? LIMIT 1").get(n) as { id: string; name: string } | undefined)
          : undefined;
      }).filter(Boolean) as { id: string; name: string }[];

      if (agents.length === 0) {
        return res.status(404).json({ error: "no matching agents found" });
      }

      // Seat each agent at the collab table
      const now = Date.now();
      agents.forEach((agent, seatIndex) => {
        meetingPresenceUntil.set(agent.id, now + holdMs);
        meetingSeatIndexByAgent.set(agent.id, seatIndex);
        meetingPhaseByAgent.set(agent.id, phase);
        meetingTaskIdByAgent.set(agent.id, taskId);
        if (phase === "review") {
          meetingReviewDecisionByAgent.set(agent.id, "reviewing");
        }

        broadcast("ceo_office_call", {
          from_agent_id: agent.id,
          seat_index: seatIndex,
          phase,
          task_id: taskId,
          action: "arrive",
        });
      });

      res.json({ ok: true, seated: agents.map((a) => a.name), task_id: taskId, phase });
    } catch (err) {
      console.error("[hooks] POST meetings/start failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // POST /api/meetings/dismiss — Remove agents from the collab table
  app.post("/api/meetings/dismiss", (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const agentNames = Array.isArray(body.agent_names) ? body.agent_names : [];
      const dismissAll = body.all === true;

      if (dismissAll) {
        // Dismiss everyone
        const dismissed: string[] = [];
        for (const [agentId] of meetingPresenceUntil) {
          const agent = db.prepare("SELECT name FROM agents WHERE id = ? LIMIT 1").get(agentId) as { name: string } | undefined;
          if (agent) dismissed.push(agent.name);

          meetingPresenceUntil.delete(agentId);
          meetingSeatIndexByAgent.delete(agentId);
          meetingPhaseByAgent.delete(agentId);
          meetingTaskIdByAgent.delete(agentId);
          meetingReviewDecisionByAgent.delete(agentId);

          broadcast("ceo_office_call", {
            from_agent_id: agentId,
            action: "dismiss",
          });
        }
        return res.json({ ok: true, dismissed });
      }

      // Dismiss specific agents
      const dismissed: string[] = [];
      for (const name of agentNames) {
        const n = typeof name === "string" ? name.trim() : "";
        if (!n) continue;
        const agent = db.prepare("SELECT id FROM agents WHERE name = ? LIMIT 1").get(n) as { id: string } | undefined;
        if (!agent) continue;

        meetingPresenceUntil.delete(agent.id);
        meetingSeatIndexByAgent.delete(agent.id);
        meetingPhaseByAgent.delete(agent.id);
        meetingTaskIdByAgent.delete(agent.id);
        meetingReviewDecisionByAgent.delete(agent.id);

        broadcast("ceo_office_call", {
          from_agent_id: agent.id,
          action: "dismiss",
        });
        dismissed.push(n);
      }

      res.json({ ok: true, dismissed });
    } catch (err) {
      console.error("[hooks] POST meetings/dismiss failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // GET /api/meetings/status — Current meeting state
  app.get("/api/meetings/status", (_req, res) => {
    const now = Date.now();
    const seated: Array<{ agent_id: string; seat: number; phase: string; task_id: string; remaining_ms: number }> = [];

    for (const [agentId, until] of meetingPresenceUntil) {
      if (until > now) {
        seated.push({
          agent_id: agentId,
          seat: meetingSeatIndexByAgent.get(agentId) ?? -1,
          phase: meetingPhaseByAgent.get(agentId) ?? "kickoff",
          task_id: meetingTaskIdByAgent.get(agentId) ?? "",
          remaining_ms: until - now,
        });
      }
    }

    res.json({ active: seated.length > 0, seated });
  });
}
