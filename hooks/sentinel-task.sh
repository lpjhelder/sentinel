#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# sentinel-task — Helper for Claude Code to report tasks to Sentinel
#
# Usage:
#   sentinel-task create "Title" [agent_name] [description]
#   sentinel-task subtask <task_id> "Title" [agent_name] [description]
#   sentinel-task status <task_id> <status>           # inbox|planned|in_progress|review|done|cancelled
#   sentinel-task substatus <subtask_id> <status>     # pending|in_progress|done|blocked
#   sentinel-task find-agent <agent_name>             # returns agent_id
#   sentinel-task find-dept <agent_name>              # returns department_id for agent
# ═══════════════════════════════════════════════════════════════════

CMD="$1"
API="${SENTINEL_URL:-http://localhost:8790}/api"
AUTH="Authorization: Bearer ${SENTINEL_TOKEN:-claw-test-token-2024}"

# Quick connectivity check
check() {
  local code
  code=$(curl -s --connect-timeout 1 --max-time 2 -o /dev/null -w "%{http_code}" -H "$AUTH" "$API/agents" 2>/dev/null)
  [ "$code" = "200" ] || { echo '{"error":"sentinel_unreachable"}'; exit 1; }
}

# Resolve agent name → { id, department_id }
resolve_agent() {
  local name="$1"
  [ -z "$name" ] && return
  curl -s --connect-timeout 2 --max-time 3 -H "$AUTH" "$API/agents" 2>/dev/null | \
    node -e "
      try {
        const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        const n = '$name'.toLowerCase().replace(/[-_ ]/g, '');
        const a = d.agents.find(a => a.name.toLowerCase().replace(/[-_ ]/g, '') === n);
        if (a) console.log(JSON.stringify({ id: a.id, department_id: a.department_id }));
      } catch {}
    " 2>/dev/null
}

check

case "$CMD" in

  create)
    TITLE="$2"
    AGENT_NAME="$3"
    DESC="$4"
    [ -z "$TITLE" ] && { echo '{"error":"title_required"}'; exit 1; }

    BODY="{\"title\":$(node -e "console.log(JSON.stringify('$TITLE'))")"
    BODY="$BODY,\"status\":\"planned\""
    BODY="$BODY,\"task_type\":\"development\""

    if [ -n "$AGENT_NAME" ]; then
      AGENT_JSON=$(resolve_agent "$AGENT_NAME")
      if [ -n "$AGENT_JSON" ]; then
        AID=$(echo "$AGENT_JSON" | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).id)}catch{}" 2>/dev/null)
        DID=$(echo "$AGENT_JSON" | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).department_id)}catch{}" 2>/dev/null)
        [ -n "$AID" ] && BODY="$BODY,\"assigned_agent_id\":\"$AID\""
        [ -n "$DID" ] && BODY="$BODY,\"department_id\":\"$DID\""
      fi
    fi

    if [ -n "$DESC" ]; then
      BODY="$BODY,\"description\":$(node -e "console.log(JSON.stringify('$DESC'))")"
    fi

    BODY="{${BODY#\{}}"

    curl -s --connect-timeout 2 --max-time 5 \
      -X POST -H "$AUTH" -H "Content-Type: application/json" \
      "$API/tasks" -d "$BODY" 2>/dev/null
    ;;

  subtask)
    TASK_ID="$2"
    TITLE="$3"
    AGENT_NAME="$4"
    DESC="$5"
    [ -z "$TASK_ID" ] || [ -z "$TITLE" ] && { echo '{"error":"task_id_and_title_required"}'; exit 1; }

    BODY="{\"title\":$(node -e "console.log(JSON.stringify('$TITLE'))")"

    if [ -n "$AGENT_NAME" ]; then
      AGENT_JSON=$(resolve_agent "$AGENT_NAME")
      if [ -n "$AGENT_JSON" ]; then
        AID=$(echo "$AGENT_JSON" | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).id)}catch{}" 2>/dev/null)
        [ -n "$AID" ] && BODY="$BODY,\"assigned_agent_id\":\"$AID\""
      fi
    fi

    if [ -n "$DESC" ]; then
      BODY="$BODY,\"description\":$(node -e "console.log(JSON.stringify('$DESC'))")"
    fi

    BODY="{${BODY#\{}}"

    curl -s --connect-timeout 2 --max-time 5 \
      -X POST -H "$AUTH" -H "Content-Type: application/json" \
      "$API/tasks/$TASK_ID/subtasks" -d "$BODY" 2>/dev/null
    ;;

  status)
    TASK_ID="$2"
    STATUS="$3"
    [ -z "$TASK_ID" ] || [ -z "$STATUS" ] && { echo '{"error":"task_id_and_status_required"}'; exit 1; }

    BODY="{\"status\":\"$STATUS\""
    [ "$STATUS" = "in_progress" ] && BODY="$BODY,\"started_at\":$(date +%s)000"
    BODY="$BODY}"

    RESULT=$(curl -s --connect-timeout 2 --max-time 5 \
      -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
      "$API/tasks/$TASK_ID" -d "$BODY" 2>/dev/null)
    echo "$RESULT"

    # Link agent ↔ task: set current_task_id on agent when in_progress, clear when done/cancelled
    AGENT_ID=$(echo "$RESULT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.task?.assigned_agent_id||'')}catch{}" 2>/dev/null)
    if [ -n "$AGENT_ID" ]; then
      if [ "$STATUS" = "in_progress" ]; then
        curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
          -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
          "$API/agents/$AGENT_ID" -d "{\"current_task_id\":\"$TASK_ID\",\"status\":\"working\"}" 2>/dev/null || true
      elif [ "$STATUS" = "done" ] || [ "$STATUS" = "cancelled" ]; then
        curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
          -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
          "$API/agents/$AGENT_ID" -d "{\"current_task_id\":\"\",\"status\":\"idle\"}" 2>/dev/null || true
      fi
    fi
    ;;

  substatus)
    SUBTASK_ID="$2"
    STATUS="$3"
    [ -z "$SUBTASK_ID" ] || [ -z "$STATUS" ] && { echo '{"error":"subtask_id_and_status_required"}'; exit 1; }

    RESULT=$(curl -s --connect-timeout 2 --max-time 5 \
      -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
      "$API/subtasks/$SUBTASK_ID" -d "{\"status\":\"$STATUS\"}" 2>/dev/null)
    echo "$RESULT"

    # Link agent ↔ parent task when subtask goes in_progress
    AGENT_ID=$(echo "$RESULT" | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).assigned_agent_id||'')}catch{}" 2>/dev/null)
    PARENT_TASK_ID=$(echo "$RESULT" | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).task_id||'')}catch{}" 2>/dev/null)
    if [ -n "$AGENT_ID" ] && [ -n "$PARENT_TASK_ID" ]; then
      if [ "$STATUS" = "in_progress" ]; then
        curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
          -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
          "$API/agents/$AGENT_ID" -d "{\"current_task_id\":\"$PARENT_TASK_ID\",\"status\":\"working\"}" 2>/dev/null || true
      elif [ "$STATUS" = "done" ] || [ "$STATUS" = "blocked" ]; then
        curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
          -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
          "$API/agents/$AGENT_ID" -d "{\"current_task_id\":\"\",\"status\":\"idle\"}" 2>/dev/null || true
      fi
    fi
    ;;

  find-agent)
    AGENT_NAME="$2"
    [ -z "$AGENT_NAME" ] && { echo '{"error":"agent_name_required"}'; exit 1; }
    resolve_agent "$AGENT_NAME"
    ;;

  find-dept)
    AGENT_NAME="$2"
    [ -z "$AGENT_NAME" ] && { echo '{"error":"agent_name_required"}'; exit 1; }
    AGENT_JSON=$(resolve_agent "$AGENT_NAME")
    [ -n "$AGENT_JSON" ] && echo "$AGENT_JSON" | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).department_id)}catch{}" 2>/dev/null
    ;;

  *)
    echo '{"error":"unknown_command","usage":"sentinel-task create|subtask|status|substatus|find-agent|find-dept"}'
    exit 1
    ;;

esac
