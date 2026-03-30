import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../../../types/runtime-context.ts";

export type RoomRouteDeps = Pick<RuntimeContext, "app" | "db" | "broadcast">;

export function registerRoomRoutes(deps: RoomRouteDeps): void {
  const { app, db, broadcast } = deps;

  // GET /api/rooms — List all rooms (optionally filter by status)
  app.get("/api/rooms", (req, res) => {
    try {
      const status = typeof req.query?.status === "string" ? req.query.status.trim() : "";
      let rooms: unknown[];
      if (status && ["active", "archived", "completed"].includes(status)) {
        rooms = db
          .prepare(
            `SELECT r.*,
              (SELECT COUNT(*) FROM agents a WHERE a.current_room_id = r.id) AS agent_count
             FROM rooms r
             WHERE r.status = ?
             ORDER BY r.created_at DESC`,
          )
          .all(status);
      } else {
        rooms = db
          .prepare(
            `SELECT r.*,
              (SELECT COUNT(*) FROM agents a WHERE a.current_room_id = r.id) AS agent_count
             FROM rooms r
             ORDER BY r.created_at DESC`,
          )
          .all();
      }
      res.json({ rooms });
    } catch (err) {
      console.error("[rooms] GET list failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // POST /api/rooms — Create room
  app.post("/api/rooms", (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return res.status(400).json({ error: "name_required" });

      const room_type =
        typeof body.room_type === "string" &&
        ["break_room", "project", "meeting"].includes(body.room_type)
          ? body.room_type
          : "project";
      const project_id = typeof body.project_id === "string" ? body.project_id.trim() || null : null;
      const task_id = typeof body.task_id === "string" ? body.task_id.trim() || null : null;

      const id = randomUUID();
      db.prepare(
        `INSERT INTO rooms (id, name, room_type, project_id, task_id)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(id, name, room_type, project_id, task_id);

      const created = db.prepare("SELECT * FROM rooms WHERE id = ?").get(id);
      broadcast("room_created", created);
      res.status(201).json({ room: created });
    } catch (err) {
      console.error("[rooms] POST failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // GET /api/rooms/:id — Get room with agents inside
  app.get("/api/rooms/:id", (req, res) => {
    try {
      const id = String(req.params.id);
      const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(id);
      if (!room) return res.status(404).json({ error: "not_found" });

      const agents = db
        .prepare("SELECT * FROM agents WHERE current_room_id = ? ORDER BY role, name")
        .all(id);

      res.json({ room, agents });
    } catch (err) {
      console.error("[rooms] GET by id failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // PATCH /api/rooms/:id — Update room
  app.patch("/api/rooms/:id", (req, res) => {
    try {
      const id = String(req.params.id);
      const existing = db.prepare("SELECT * FROM rooms WHERE id = ?").get(id);
      if (!existing) return res.status(404).json({ error: "not_found" });

      const body = (req.body ?? {}) as Record<string, unknown>;
      const sets: string[] = [];
      const vals: unknown[] = [];

      if (body.name !== undefined) {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) return res.status(400).json({ error: "invalid_name" });
        sets.push("name = ?");
        vals.push(name);
      }
      if (body.status !== undefined) {
        const status = typeof body.status === "string" ? body.status.trim() : "";
        if (!["active", "archived", "completed"].includes(status)) {
          return res.status(400).json({ error: "invalid_status" });
        }
        sets.push("status = ?");
        vals.push(status);
        if (status === "archived" || status === "completed") {
          sets.push("closed_at = ?");
          vals.push(Date.now());
        }
      }

      if (sets.length === 0) return res.status(400).json({ error: "no_fields" });

      vals.push(id);
      db.prepare(`UPDATE rooms SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

      const updated = db.prepare("SELECT * FROM rooms WHERE id = ?").get(id);
      broadcast("room_updated", updated);
      res.json({ room: updated });
    } catch (err) {
      console.error("[rooms] PATCH failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // DELETE /api/rooms/:id — Archive room and move agents to break room
  app.delete("/api/rooms/:id", (req, res) => {
    try {
      const id = String(req.params.id);
      const existing = db.prepare("SELECT * FROM rooms WHERE id = ?").get(id) as Record<string, unknown> | undefined;
      if (!existing) return res.status(404).json({ error: "not_found" });

      // Move agents in this room back to break room (current_room_id = NULL)
      db.prepare("UPDATE agents SET current_room_id = NULL WHERE current_room_id = ?").run(id);

      // Archive the room
      db.prepare("UPDATE rooms SET status = 'archived', closed_at = ? WHERE id = ?").run(Date.now(), id);

      const updated = db.prepare("SELECT * FROM rooms WHERE id = ?").get(id);
      broadcast("room_archived", { room: updated });
      res.json({ ok: true, room: updated });
    } catch (err) {
      console.error("[rooms] DELETE failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // POST /api/rooms/:id/assign — Move agent into room
  app.post("/api/rooms/:id/assign", (req, res) => {
    try {
      const roomId = String(req.params.id);
      const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as Record<string, unknown> | undefined;
      if (!room) return res.status(404).json({ error: "room_not_found" });
      if (room.status === "archived") return res.status(400).json({ error: "room_archived" });

      const body = (req.body ?? {}) as Record<string, unknown>;
      const agentId = typeof body.agent_id === "string" ? body.agent_id.trim() : "";
      if (!agentId) return res.status(400).json({ error: "agent_id_required" });

      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);
      if (!agent) return res.status(404).json({ error: "agent_not_found" });

      db.prepare("UPDATE agents SET current_room_id = ? WHERE id = ?").run(roomId, agentId);

      const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);
      broadcast("agent_room_changed", { agent: updatedAgent, room_id: roomId });
      res.json({ ok: true, agent: updatedAgent });
    } catch (err) {
      console.error("[rooms] assign failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // POST /api/rooms/:id/unassign — Remove agent from room
  app.post("/api/rooms/:id/unassign", (req, res) => {
    try {
      const roomId = String(req.params.id);
      const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId);
      if (!room) return res.status(404).json({ error: "room_not_found" });

      const body = (req.body ?? {}) as Record<string, unknown>;
      const agentId = typeof body.agent_id === "string" ? body.agent_id.trim() : "";
      if (!agentId) return res.status(400).json({ error: "agent_id_required" });

      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as Record<string, unknown> | undefined;
      if (!agent) return res.status(404).json({ error: "agent_not_found" });
      if (agent.current_room_id !== roomId) {
        return res.status(400).json({ error: "agent_not_in_room" });
      }

      db.prepare("UPDATE agents SET current_room_id = NULL WHERE id = ?").run(agentId);

      const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);
      broadcast("agent_room_changed", { agent: updatedAgent, room_id: null });
      res.json({ ok: true, agent: updatedAgent });
    } catch (err) {
      console.error("[rooms] unassign failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });
}
