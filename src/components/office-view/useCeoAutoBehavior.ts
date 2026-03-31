import { useEffect, type MutableRefObject } from "react";
import type { Agent, MeetingPresence } from "../../types";
import type { CeoAction } from "./model";
import type { SupportedLocale } from "./themes-locale";

const CEO_MESSAGES: Record<string, Record<SupportedLocale, string>> = {
  checking: {
    ko: "{name} 확인 중...",
    en: "Checking on {name}...",
    ja: "{name} を確認中...",
    zh: "正在查看 {name}...",
    pt: "Verificando {name}...",
  },
  goodWork: {
    ko: "{name} 수고했어!",
    en: "Good work, {name}!",
    ja: "{name}、お疲れ様！",
    zh: "{name} 干得好！",
    pt: "Bom trabalho, {name}!",
  },
  meeting: {
    ko: "회의 시간!",
    en: "Meeting time!",
    ja: "会議の時間！",
    zh: "开会时间！",
    pt: "Hora da reunião!",
  },
};

function msg(key: string, language: SupportedLocale, name?: string): string {
  const template = CEO_MESSAGES[key]?.[language] ?? CEO_MESSAGES[key]?.en ?? key;
  return name ? template.replace("{name}", name) : template;
}

export function useCeoAutoBehavior(
  agents: Agent[],
  meetingPresence: MeetingPresence[] | undefined,
  ceoActionQueueRef: MutableRefObject<CeoAction[]>,
  prevAgentStatusRef: MutableRefObject<Map<string, string>>,
  prevMeetingCountRef: MutableRefObject<number>,
  language: SupportedLocale,
): void {
  useEffect(() => {
    const prev = prevAgentStatusRef.current;

    for (const agent of agents) {
      const prevStatus = prev.get(agent.id);
      if (prevStatus === undefined) continue;

      if (agent.status === "working" && prevStatus !== "working") {
        ceoActionQueueRef.current.push({
          type: "walk_to_agent",
          agentId: agent.id,
          message: msg("checking", language, agent.name),
          priority: 1,
        });
      }

      if (agent.status === "idle" && prevStatus === "working") {
        ceoActionQueueRef.current.push({
          type: "walk_to_agent",
          agentId: agent.id,
          message: msg("goodWork", language, agent.name),
          priority: 0,
        });
      }
    }

    const anyWorking = agents.some((a) => a.status === "working");
    const wasAnyWorking = [...prev.values()].some((s) => s === "working");
    if (!anyWorking && wasAnyWorking && prev.size > 0) {
      ceoActionQueueRef.current.push({
        type: "walk_to_desk",
        message: "",
        priority: -1,
      });
    }

    const next = new Map<string, string>();
    for (const agent of agents) next.set(agent.id, agent.status);
    prevAgentStatusRef.current = next;
  }, [agents, ceoActionQueueRef, prevAgentStatusRef, language]);

  useEffect(() => {
    const count = meetingPresence?.length ?? 0;
    const prevCount = prevMeetingCountRef.current;

    if (count > 0 && prevCount === 0) {
      ceoActionQueueRef.current.push({
        type: "walk_to_meeting",
        message: msg("meeting", language),
        priority: 2,
      });
    }

    prevMeetingCountRef.current = count;
  }, [meetingPresence, ceoActionQueueRef, prevMeetingCountRef, language]);
}
