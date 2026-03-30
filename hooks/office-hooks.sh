#!/bin/bash
# ═══════════��═══════════════════════════════════════════════════════
# Agent Office — Unified Auto Sync Hooks
# Covers ALL scenarios: Subagents + Agent Teams
#
# Hook events handled:
#   PreToolUse(Agent)  → save room name from description
#   SubagentStart      → create room + assign + start-work
#   SubagentStop       → stop-work + release hired + auto-close room
#   TeammateIdle       → stop-work + auto-close room
#   TaskCreated        → start-work (Agent Teams)
#   SessionEnd         → cleanup all (idle all + close room)
#
# Usage in settings.json:
#   "command": "bash .../office-hooks.sh <EVENT_NAME>"
# ═══════════════════════════════════════════════════════════════════

EVENT="$1"
API="${AGENT_OFFICE_URL:-http://localhost:8790}/api"
AUTH="Authorization: Bearer ${AGENT_OFFICE_TOKEN:-claw-test-token-2024}"
STATE_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/.claw-room-state"
INPUT=$(cat 2>/dev/null || echo "{}")

# ─── Helpers ─────────��───────────────────────────────────────────

# Quick API check (fail silently if office not running)
api_ok() {
  local code
  code=$(curl -s --connect-timeout 1 --max-time 2 -o /dev/null -w "%{http_code}" -H "$AUTH" "$API/agents" 2>/dev/null)
  [ "$code" = "200" ]
}

# Parse JSON field from INPUT
parse() {
  echo "$INPUT" | node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      const keys = '$1'.split('.');
      let v = d;
      for (const k of keys) v = v?.[k];
      if (v !== undefined && v !== null) console.log(v);
    } catch {}
  " 2>/dev/null
}

# Map agent type/name → Sentinel agent name
map_agent() {
  local raw="$1"
  local lower
  lower=$(echo "$raw" | tr '[:upper:]' '[:lower:]' | sed 's/[-_ ]//g')
  case "$lower" in
    architect*)                echo "Architect" ;;
    developer*|dev)            echo "Developer" ;;
    tester*|qa*)               echo "Tester" ;;
    reviewer*)                 echo "Reviewer" ;;
    security*|pentest*)        echo "Security" ;;
    dba*|database*)            echo "DBA" ;;
    devops*|sre*)              echo "DevOps" ;;
    performance*|perf*)        echo "Performance" ;;
    docs*|docwriter*|techwriter*) echo "Docs" ;;
    apidesigner*)              echo "API Designer" ;;
    monitoring*|monitor*|observability*) echo "Monitoring" ;;
    accessibility*|a11y*)      echo "Accessibility" ;;
    uxwriter*)                 echo "UX Writer" ;;
    i18n*|internationali*)     echo "i18n" ;;
    releasemanager*)           echo "Release Manager" ;;
    mobile*)                   echo "Mobile" ;;
    generalpurpose*|explore*|plan*) echo "" ;; # skip built-in types
    *)                         echo "" ;;
  esac
}

# Get agent ID by name
agent_id() {
  curl -s --connect-timeout 1 --max-time 2 -H "$AUTH" "$API/agents" 2>/dev/null | \
    node -e "
      try {
        const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        const a = d.agents.find(a => a.name === '$1');
        if (a) console.log(a.id);
      } catch {}
    " 2>/dev/null
}

# Set agent status
set_status() {
  local name="$1" status="$2"
  local id
  id=$(agent_id "$name")
  [ -z "$id" ] && return
  curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
    -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
    "$API/agents/$id" -d "{\"status\":\"$status\"}" 2>/dev/null || true
}

# Release all hired seniors under a lead
release_hired() {
  local name="$1"
  local aid
  aid=$(agent_id "$name")
  [ -z "$aid" ] && return
  curl -s --connect-timeout 1 --max-time 2 -H "$AUTH" "$API/hirings/leader/$aid" 2>/dev/null | \
    node -e "
      try {
        const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        (d.hirings || []).filter(h => h.status === 'active').forEach(h => console.log(h.id));
      } catch {}
    " 2>/dev/null | while read -r HID; do
      [ -n "$HID" ] && curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
        -X POST -H "$AUTH" "$API/hirings/$HID/release" 2>/dev/null || true
    done
}

# ─── Room management ─────────────────────────────────────────────

get_room()   { cat "$STATE_FILE" 2>/dev/null; }
save_room()  { mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null; echo "$1" > "$STATE_FILE" 2>/dev/null; }
clear_room() { rm -f "$STATE_FILE" 2>/dev/null; }

room_id() {
  local name="$1"
  curl -s --connect-timeout 1 --max-time 2 -H "$AUTH" "$API/rooms" 2>/dev/null | \
    node -e "
      try {
        const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        const r = (d.rooms || []).find(r => r.name === '$name' && r.status === 'active');
        if (r) console.log(r.id);
      } catch {}
    " 2>/dev/null
}

ensure_room() {
  local name="$1"
  local existing
  existing=$(get_room)

  # Room already exists and matches
  if [ -n "$existing" ] && [[ "$existing" != __pending:* ]]; then
    local rid
    rid=$(room_id "$existing")
    if [ -n "$rid" ]; then
      echo "$existing"
      return
    fi
    # Room was closed externally, recreate
  fi

  # Use pending name or provided name
  if [[ "$existing" == __pending:* ]]; then
    name="${existing#__pending:}"
  fi
  [ -z "$name" ] && name="Claude Session"

  # Create room
  curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
    -X POST -H "$AUTH" -H "Content-Type: application/json" \
    "$API/rooms" -d "{\"name\":\"$name\",\"room_type\":\"project\"}" 2>/dev/null || true
  save_room "$name"
  echo "$name"
}

assign_to_room() {
  local agent_name="$1" room_name="$2"
  local aid rid
  aid=$(agent_id "$agent_name")
  [ -z "$aid" ] && return
  rid=$(room_id "$room_name")
  [ -z "$rid" ] && return
  curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
    -X POST -H "$AUTH" -H "Content-Type: application/json" \
    "$API/rooms/$rid/assign" -d "{\"agent_id\":\"$aid\"}" 2>/dev/null || true
}

close_active_room() {
  local room_name
  room_name=$(get_room)
  [ -z "$room_name" ] && return
  [[ "$room_name" == __pending:* ]] && { clear_room; return; }
  local rid
  rid=$(room_id "$room_name")
  [ -n "$rid" ] && curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
    -X DELETE -H "$AUTH" "$API/rooms/$rid" 2>/dev/null || true
  clear_room
}

# Check if any agents are still working
any_working() {
  local count
  count=$(curl -s --connect-timeout 1 --max-time 2 -H "$AUTH" "$API/agents" 2>/dev/null | \
    node -e "
      try {
        const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        console.log(d.agents.filter(a => a.status === 'working').length);
      } catch { console.log(0); }
    " 2>/dev/null)
  [ "${count:-0}" -gt 0 ]
}

# Set ALL working agents to idle
idle_all() {
  curl -s --connect-timeout 1 --max-time 2 -H "$AUTH" "$API/agents" 2>/dev/null | \
    node -e "
      try {
        const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        d.agents.filter(a => a.status === 'working').forEach(a => console.log(a.id));
      } catch {}
    " 2>/dev/null | while read -r AID; do
      [ -n "$AID" ] && curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
        -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
        "$API/agents/$AID" -d '{"status":"idle"}' 2>/dev/null || true
    done
}

# ═══════════════════════════════��═══════════════════════════════════
# Event Router
# ═══════════════════════════════════════════════��═══════════════════

# Bail early if API not reachable
api_ok || exit 0

case "$EVENT" in

  # ─── PreToolUse(Agent): capture description + plan mode meeting ───
  PreToolUse)
    DESC=$(parse "tool_input.description")
    MODE=$(parse "tool_input.mode")
    SUBAGENT_TYPE=$(parse "tool_input.subagent_type")

    # Save description for room naming
    if [ -n "$DESC" ]; then
      EXISTING=$(get_room)
      if [ -z "$EXISTING" ]; then
        save_room "__pending:$DESC"
      fi
    fi

    # Plan mode → trigger collab table meeting (kickoff)
    if [ "$MODE" = "plan" ] && [ -n "$SUBAGENT_TYPE" ]; then
      OFFICE_AGENT=$(map_agent "$SUBAGENT_TYPE")
      if [ -n "$OFFICE_AGENT" ]; then
        curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
          -X POST -H "$AUTH" -H "Content-Type: application/json" \
          "$API/meetings/start" \
          -d "{\"agent_names\":[\"$OFFICE_AGENT\"],\"phase\":\"kickoff\",\"task_id\":\"plan-$SUBAGENT_TYPE-$(date +%s)\"}" \
          2>/dev/null || true
      fi
    fi
    ;;

  # ─── SubagentStart: agent spawned → sync + create room + assign + working ───
  SubagentStart)
    AGENT_TYPE=$(parse "agent_type")
    OFFICE_AGENT=$(map_agent "$AGENT_TYPE")
    [ -z "$OFFICE_AGENT" ] && exit 0

    # Sync agent profiles from disk before starting work
    curl -s -o /dev/null --connect-timeout 1 --max-time 3 \
      -X POST -H "$AUTH" "$API/agents-disk/sync" 2>/dev/null || true

    # Ensure room exists
    ROOM_NAME=$(ensure_room "")

    # Assign agent to room (also sets working via office API)
    assign_to_room "$OFFICE_AGENT" "$ROOM_NAME"
    set_status "$OFFICE_AGENT" "working"
    ;;

  # ─── SubagentStop: agent finished → dismiss meeting + idle + release hired + auto-close ───
  SubagentStop)
    AGENT_TYPE=$(parse "agent_type")
    OFFICE_AGENT=$(map_agent "$AGENT_TYPE")
    [ -z "$OFFICE_AGENT" ] && exit 0

    # Dismiss from collab table if seated
    curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
      -X POST -H "$AUTH" -H "Content-Type: application/json" \
      "$API/meetings/dismiss" \
      -d "{\"agent_names\":[\"$OFFICE_AGENT\"]}" 2>/dev/null || true

    set_status "$OFFICE_AGENT" "idle"
    release_hired "$OFFICE_AGENT"

    # Clear current_task_id when agent stops
    AID_CLEAR=$(agent_id "$OFFICE_AGENT")
    [ -n "$AID_CLEAR" ] && curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
      -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
      "$API/agents/$AID_CLEAR" -d '{"current_task_id":""}' 2>/dev/null || true

    # Fallback: if agent has an in_progress task, mark it as review
    # (safety net for when Claude Code forgets to report via CLAUDE.md)
    AID=$(agent_id "$OFFICE_AGENT")
    if [ -n "$AID" ]; then
      curl -s --connect-timeout 1 --max-time 2 -H "$AUTH" "$API/tasks" 2>/dev/null | \
        node -e "
          try {
            const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
            const tasks = (d.tasks || []).filter(t => t.assigned_agent_id === '$AID' && t.status === 'in_progress');
            tasks.forEach(t => console.log(t.id));
          } catch {}
        " 2>/dev/null | while read -r TID; do
          [ -n "$TID" ] && curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
            -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
            "$API/tasks/$TID" -d '{"status":"review"}' 2>/dev/null || true
        done
    fi

    # Auto-close room if nobody else working
    if ! any_working; then
      close_active_room
    fi
    ;;

  # ─── TeammateIdle: Agent Teams teammate idle → stop + auto-close ───
  TeammateIdle)
    TEAMMATE=$(parse "teammate_name")
    OFFICE_AGENT=$(map_agent "$TEAMMATE")

    # Fallback: try team_name for room context
    TEAM_NAME=$(parse "team_name")

    if [ -n "$OFFICE_AGENT" ]; then
      set_status "$OFFICE_AGENT" "idle"
      release_hired "$OFFICE_AGENT"
    fi

    if ! any_working; then
      close_active_room
    fi
    ;;

  # ─── TaskCreated: Agent Teams task assigned → working ───
  TaskCreated)
    TEAMMATE=$(parse "teammate_name")
    OFFICE_AGENT=$(map_agent "$TEAMMATE")
    TEAM_NAME=$(parse "team_name")

    # Ensure room (use team name)
    if [ -n "$TEAM_NAME" ]; then
      EXISTING=$(get_room)
      [ -z "$EXISTING" ] && ensure_room "$TEAM_NAME" > /dev/null
    fi

    # Set teammate to working
    if [ -n "$OFFICE_AGENT" ]; then
      ROOM_NAME=$(get_room)
      [ -n "$ROOM_NAME" ] && assign_to_room "$OFFICE_AGENT" "$ROOM_NAME"
      set_status "$OFFICE_AGENT" "working"
    fi
    ;;

  # ─── TaskCompleted: just log, don't idle (might pick up next task) ───
  TaskCompleted)
    # TeammateIdle handles the final idle transition
    ;;

  # ─── SessionEnd: cleanup everything ───
  SessionEnd)
    # Dismiss all meetings
    curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
      -X POST -H "$AUTH" -H "Content-Type: application/json" \
      "$API/meetings/dismiss" -d '{"all":true}' 2>/dev/null || true

    # Fallback: mark all in_progress tasks as review (session ending = work done)
    curl -s --connect-timeout 1 --max-time 2 -H "$AUTH" "$API/tasks" 2>/dev/null | \
      node -e "
        try {
          const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
          (d.tasks || []).filter(t => t.status === 'in_progress').forEach(t => console.log(t.id));
        } catch {}
      " 2>/dev/null | while read -r TID; do
        [ -n "$TID" ] && curl -s -o /dev/null --connect-timeout 1 --max-time 2 \
          -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
          "$API/tasks/$TID" -d '{"status":"review"}' 2>/dev/null || true
      done

    idle_all
    close_active_room
    ;;

esac

# Never block Claude Code
exit 0
