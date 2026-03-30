#!/bin/bash
# Office API helper — chamado pelo Main Agent pra atualizar o escritório
# Uso: ./office-api.sh <action> [args...]
#
# Ações:
#   agent-working <name>     — Agent começou a trabalhar
#   agent-idle <name>        — Agent ficou idle
#   agent-break <name>       — Agent foi pro break
#   task-create <title>      — Cria task
#   task-assign <task_id> <agent_name> — Atribui task a agent
#   task-done <task_id>      — Task concluída

API="${AGENT_OFFICE_URL:-http://localhost:8790}/api"
AUTH="Authorization: Bearer ${AGENT_OFFICE_TOKEN:-claw-test-token-2024}"

action="$1"
shift

case "$action" in
  agent-working)
    AGENT_ID=$(curl -s -H "$AUTH" "$API/agents" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const a=d.agents.find(a=>a.name==='$1');console.log(a?.id||'')" 2>/dev/null)
    [ -n "$AGENT_ID" ] && curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" "$API/agents/$AGENT_ID" -d '{"status":"working"}' -o /dev/null 2>/dev/null
    ;;
  agent-idle)
    AGENT_ID=$(curl -s -H "$AUTH" "$API/agents" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const a=d.agents.find(a=>a.name==='$1');console.log(a?.id||'')" 2>/dev/null)
    [ -n "$AGENT_ID" ] && curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" "$API/agents/$AGENT_ID" -d '{"status":"idle"}' -o /dev/null 2>/dev/null
    ;;
  agent-break)
    AGENT_ID=$(curl -s -H "$AUTH" "$API/agents" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const a=d.agents.find(a=>a.name==='$1');console.log(a?.id||'')" 2>/dev/null)
    [ -n "$AGENT_ID" ] && curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" "$API/agents/$AGENT_ID" -d '{"status":"break"}' -o /dev/null 2>/dev/null
    ;;
  status)
    curl -s -H "$AUTH" "$API/agents" | node -e "
      const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
      d.agents.forEach(a=>console.log(a.avatar_emoji,a.name,'|',a.status,'|',a.current_task_id?'task':'free'));
    " 2>/dev/null
    ;;
  *)
    echo "Unknown action: $action"
    ;;
esac
