import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../../../types/runtime-context.ts";

export type HiringRouteDeps = Pick<RuntimeContext, "app" | "db" | "broadcast">;

export function registerHiringRoutes(deps: HiringRouteDeps): void {
  const { app, db, broadcast } = deps;

  // POST /api/hirings — Lead hires a Senior
  app.post("/api/hirings", (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const leaderAgentId = typeof body.leader_agent_id === "string" ? body.leader_agent_id.trim() : "";
      const roomId = typeof body.room_id === "string" ? body.room_id.trim() : "";
      const taskId = typeof body.task_id === "string" ? body.task_id.trim() || null : null;
      const customName = typeof body.name === "string" ? body.name.trim() || null : null;

      if (!leaderAgentId) return res.status(400).json({ error: "leader_agent_id_required" });
      if (!roomId) return res.status(400).json({ error: "room_id_required" });

      // Validate leader exists and is lead_senior
      const leader = db.prepare("SELECT * FROM agents WHERE id = ?").get(leaderAgentId) as Record<string, unknown> | undefined;
      if (!leader) return res.status(404).json({ error: "leader_not_found" });
      if (leader.agent_type !== "lead_senior") {
        return res.status(400).json({ error: "only_lead_senior_can_hire" });
      }

      // Validate room exists
      const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as Record<string, unknown> | undefined;
      if (!room) return res.status(404).json({ error: "room_not_found" });

      // Count existing hires by this leader to generate name
      const hireCount = (
        db
          .prepare("SELECT COUNT(*) AS c FROM agent_hirings WHERE leader_agent_id = ?")
          .get(leaderAgentId) as any
      )?.c ?? 0;

      const specialty = typeof leader.specialty === "string" ? leader.specialty : (typeof leader.name === "string" ? String(leader.name) : "Agent");
      const hiredName = customName || `${specialty} Senior #${hireCount + 1}`;

      // Create the hired agent
      const hiredAgentId = randomUUID();
      db.prepare(
        `INSERT INTO agents (id, name, department_id, role, agent_type, hired_by_agent_id, current_room_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        hiredAgentId,
        hiredName,
        leader.department_id ?? null,
        "senior",
        "hired_senior",
        leaderAgentId,
        roomId,
      );

      // Create hiring record
      const hiringId = randomUUID();
      db.prepare(
        `INSERT INTO agent_hirings (id, leader_agent_id, hired_agent_id, room_id, task_id)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(hiringId, leaderAgentId, hiredAgentId, roomId, taskId);

      const hiring = db.prepare("SELECT * FROM agent_hirings WHERE id = ?").get(hiringId);
      const hiredAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(hiredAgentId);

      broadcast("agent_hired", { hiring, agent: hiredAgent });
      res.status(201).json({ hiring, agent: hiredAgent });
    } catch (err) {
      console.error("[hiring] POST failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // GET /api/hirings — List active hirings
  app.get("/api/hirings", (req, res) => {
    try {
      const status = typeof req.query?.status === "string" ? req.query.status.trim() : "active";
      const hirings = db
        .prepare(
          `SELECT h.*, a.name AS hired_agent_name, l.name AS leader_name
           FROM agent_hirings h
           LEFT JOIN agents a ON a.id = h.hired_agent_id
           LEFT JOIN agents l ON l.id = h.leader_agent_id
           WHERE h.status = ?
           ORDER BY h.hired_at DESC`,
        )
        .all(status);
      res.json({ hirings });
    } catch (err) {
      console.error("[hiring] GET list failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // GET /api/hirings/leader/:id — Get all hired by a specific leader
  app.get("/api/hirings/leader/:id", (req, res) => {
    try {
      const leaderId = String(req.params.id);
      const leader = db.prepare("SELECT * FROM agents WHERE id = ?").get(leaderId);
      if (!leader) return res.status(404).json({ error: "leader_not_found" });

      const hirings = db
        .prepare(
          `SELECT h.*, a.name AS hired_agent_name
           FROM agent_hirings h
           LEFT JOIN agents a ON a.id = h.hired_agent_id
           WHERE h.leader_agent_id = ?
           ORDER BY h.hired_at DESC`,
        )
        .all(leaderId);
      res.json({ hirings });
    } catch (err) {
      console.error("[hiring] GET by leader failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // POST /api/hirings/:id/release — Release a hired agent
  app.post("/api/hirings/:id/release", (req, res) => {
    try {
      const hiringId = String(req.params.id);
      const hiring = db.prepare("SELECT * FROM agent_hirings WHERE id = ?").get(hiringId) as Record<string, unknown> | undefined;
      if (!hiring) return res.status(404).json({ error: "hiring_not_found" });
      if (hiring.status !== "active") {
        return res.status(400).json({ error: "hiring_not_active" });
      }

      const hiredAgentId = String(hiring.hired_agent_id);

      // Delete the hired agent
      db.prepare("DELETE FROM agents WHERE id = ?").run(hiredAgentId);

      // Update hiring status to released
      db.prepare(
        "UPDATE agent_hirings SET status = 'released', released_at = ? WHERE id = ?",
      ).run(Date.now(), hiringId);

      const updatedHiring = db.prepare("SELECT * FROM agent_hirings WHERE id = ?").get(hiringId);
      broadcast("agent_released", { hiring: updatedHiring, released_agent_id: hiredAgentId });
      res.json({ ok: true, hiring: updatedHiring });
    } catch (err) {
      console.error("[hiring] release failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });
}
