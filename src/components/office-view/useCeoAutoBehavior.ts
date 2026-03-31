import { useEffect, type MutableRefObject } from "react";
import type { Agent, MeetingPresence } from "../../types";
import type { CeoAction } from "./model";

export function useCeoAutoBehavior(
  agents: Agent[],
  meetingPresence: MeetingPresence[] | undefined,
  ceoActionQueueRef: MutableRefObject<CeoAction[]>,
  prevAgentStatusRef: MutableRefObject<Map<string, string>>,
  prevMeetingCountRef: MutableRefObject<number>,
): void {
  useEffect(() => {
    const prev = prevAgentStatusRef.current;

    for (const agent of agents) {
      const prevStatus = prev.get(agent.id);
      if (prevStatus === undefined) continue; // first render, skip

      if (agent.status === "working" && prevStatus !== "working") {
        ceoActionQueueRef.current.push({
          type: "walk_to_agent",
          agentId: agent.id,
          message: `Checking on ${agent.name}...`,
          priority: 1,
        });
      }

      if (agent.status === "idle" && prevStatus === "working") {
        ceoActionQueueRef.current.push({
          type: "walk_to_agent",
          agentId: agent.id,
          message: `Good work, ${agent.name}!`,
          priority: 0,
        });
      }
    }

    // All agents idle → return to desk
    const anyWorking = agents.some((a) => a.status === "working");
    const wasAnyWorking = [...prev.values()].some((s) => s === "working");
    if (!anyWorking && wasAnyWorking && prev.size > 0) {
      ceoActionQueueRef.current.push({
        type: "walk_to_desk",
        message: "",
        priority: -1,
      });
    }

    // Update snapshot
    const next = new Map<string, string>();
    for (const agent of agents) next.set(agent.id, agent.status);
    prevAgentStatusRef.current = next;
  }, [agents, ceoActionQueueRef, prevAgentStatusRef]);

  // Meeting detection
  useEffect(() => {
    const count = meetingPresence?.length ?? 0;
    const prevCount = prevMeetingCountRef.current;

    if (count > 0 && prevCount === 0) {
      ceoActionQueueRef.current.push({
        type: "walk_to_meeting",
        message: "Meeting time!",
        priority: 2,
      });
    }

    prevMeetingCountRef.current = count;
  }, [meetingPresence, ceoActionQueueRef, prevMeetingCountRef]);
}
