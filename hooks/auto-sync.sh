#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Agent Office — Auto Sync Hook
# Automatically syncs Claude Code agent activity with the office
#
# This runs as a Claude Code hook (PreToolUse/PostToolUse/Stop)
# It reads the tool input from stdin and takes action
# ═══════════════════════════════════════════════════════════

API="${AGENT_OFFICE_URL:-http://localhost:8790}/api"
AUTH="Authorization: Bearer ${AGENT_OFFICE_TOKEN:-claw-test-token-2024}"
OFFICE="$(dirname "$0")/office.sh"

# Read stdin (Claude Code passes hook context as JSON)
INPUT=$(cat 2>/dev/null || echo "{}")

# Extract tool name and hook type from environment or input
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
HOOK_EVENT="${CLAUDE_HOOK_EVENT:-}"

# Try to parse from stdin if env vars not set
if [ -z "$TOOL_NAME" ]; then
  TOOL_NAME=$(echo "$INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.tool_name||d.toolName||'')}catch{}" 2>/dev/null)
fi

# Parse the tool input
TOOL_INPUT=$(echo "$INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify(d.tool_input||d.input||d))}catch{console.log('{}')}" 2>/dev/null)

# ─── Agent Tool: teammate spawned ───
if [ "$TOOL_NAME" = "Agent" ]; then
  AGENT_NAME=$(echo "$TOOL_INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.name||'')}catch{}" 2>/dev/null)
  TEAM_NAME=$(echo "$TOOL_INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.team_name||'')}catch{}" 2>/dev/null)
  SUBAGENT_TYPE=$(echo "$TOOL_INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.subagent_type||'')}catch{}" 2>/dev/null)

  if [ -n "$AGENT_NAME" ]; then
    # Map subagent_type or name to office agent
    # Try exact match first, then subagent_type
    OFFICE_AGENT=""
    case "$SUBAGENT_TYPE" in
      architect) OFFICE_AGENT="Architect" ;;
      developer) OFFICE_AGENT="Developer" ;;
      tester) OFFICE_AGENT="Tester" ;;
      reviewer) OFFICE_AGENT="Reviewer" ;;
      security) OFFICE_AGENT="Security" ;;
      dba) OFFICE_AGENT="DBA" ;;
      devops) OFFICE_AGENT="DevOps" ;;
      performance) OFFICE_AGENT="Performance" ;;
      docs) OFFICE_AGENT="Docs" ;;
      api-designer) OFFICE_AGENT="API Designer" ;;
      monitoring) OFFICE_AGENT="Monitoring" ;;
      accessibility) OFFICE_AGENT="Accessibility" ;;
      ux-writer) OFFICE_AGENT="UX Writer" ;;
      i18n) OFFICE_AGENT="i18n" ;;
      release-manager) OFFICE_AGENT="Release Manager" ;;
      mobile) OFFICE_AGENT="Mobile" ;;
    esac

    # Fallback: try agent name directly
    if [ -z "$OFFICE_AGENT" ]; then
      case "$AGENT_NAME" in
        architect*) OFFICE_AGENT="Architect" ;;
        developer*) OFFICE_AGENT="Developer" ;;
        tester*) OFFICE_AGENT="Tester" ;;
        reviewer*) OFFICE_AGENT="Reviewer" ;;
        security*) OFFICE_AGENT="Security" ;;
        dba*) OFFICE_AGENT="DBA" ;;
        devops*) OFFICE_AGENT="DevOps" ;;
        performance*) OFFICE_AGENT="Performance" ;;
        docs*) OFFICE_AGENT="Docs" ;;
        api*) OFFICE_AGENT="API Designer" ;;
        monitoring*) OFFICE_AGENT="Monitoring" ;;
        accessibility*) OFFICE_AGENT="Accessibility" ;;
        ux*) OFFICE_AGENT="UX Writer" ;;
        i18n*) OFFICE_AGENT="i18n" ;;
        release*) OFFICE_AGENT="Release Manager" ;;
        mobile*) OFFICE_AGENT="Mobile" ;;
      esac
    fi

    if [ -n "$OFFICE_AGENT" ]; then
      # Set agent to working
      AGENT_ID=$(curl -s -H "$AUTH" "$API/agents" 2>/dev/null | node -e "
        try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
        const a=d.agents.find(a=>a.name==='$OFFICE_AGENT');
        if(a)console.log(a.id);}catch{}
      " 2>/dev/null)

      if [ -n "$AGENT_ID" ]; then
        curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
          -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
          "$API/agents/$AGENT_ID" -d '{"status":"working"}' 2>/dev/null || true
      fi
    fi
  fi
fi

# ─── TeamCreate: create room ───
if [ "$TOOL_NAME" = "TeamCreate" ]; then
  TEAM_NAME=$(echo "$TOOL_INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.team_name||d.description||'')}catch{}" 2>/dev/null)
  if [ -n "$TEAM_NAME" ]; then
    curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
      -X POST -H "$AUTH" -H "Content-Type: application/json" \
      "$API/rooms" -d "{\"name\":\"$TEAM_NAME\",\"room_type\":\"project\"}" 2>/dev/null || true
  fi
fi

# ─── TeamDelete: close all active rooms ───
if [ "$TOOL_NAME" = "TeamDelete" ]; then
  # Archive all active rooms
  curl -s -H "$AUTH" "$API/rooms" 2>/dev/null | node -e "
    try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    (d.rooms||[]).filter(r=>r.status==='active').forEach(r=>console.log(r.id));}catch{}
  " 2>/dev/null | while read RID; do
    curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
      -X DELETE -H "$AUTH" "$API/rooms/$RID" 2>/dev/null || true
  done
fi

# ─── SendMessage with shutdown_request: stop agent ───
if [ "$TOOL_NAME" = "SendMessage" ]; then
  MSG_TYPE=$(echo "$TOOL_INPUT" | node -e "
    try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    const m=typeof d.message==='object'?d.message:JSON.parse(d.message||'{}');
    console.log(m.type||'');}catch{}
  " 2>/dev/null)

  if [ "$MSG_TYPE" = "shutdown_request" ]; then
    TARGET=$(echo "$TOOL_INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.to||'')}catch{}" 2>/dev/null)

    if [ -n "$TARGET" ]; then
      # Map target name to office agent (same mapping as above)
      OFFICE_AGENT=""
      case "$TARGET" in
        architect*) OFFICE_AGENT="Architect" ;;
        developer*) OFFICE_AGENT="Developer" ;;
        tester*) OFFICE_AGENT="Tester" ;;
        reviewer*) OFFICE_AGENT="Reviewer" ;;
        security*) OFFICE_AGENT="Security" ;;
        dba*) OFFICE_AGENT="DBA" ;;
        devops*) OFFICE_AGENT="DevOps" ;;
        performance*) OFFICE_AGENT="Performance" ;;
        docs*) OFFICE_AGENT="Docs" ;;
        api*) OFFICE_AGENT="API Designer" ;;
        monitoring*) OFFICE_AGENT="Monitoring" ;;
        accessibility*) OFFICE_AGENT="Accessibility" ;;
        ux*) OFFICE_AGENT="UX Writer" ;;
        i18n*) OFFICE_AGENT="i18n" ;;
        release*) OFFICE_AGENT="Release Manager" ;;
        mobile*) OFFICE_AGENT="Mobile" ;;
      esac

      if [ -n "$OFFICE_AGENT" ]; then
        AGENT_ID=$(curl -s -H "$AUTH" "$API/agents" 2>/dev/null | node -e "
          try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
          const a=d.agents.find(a=>a.name==='$OFFICE_AGENT');
          if(a)console.log(a.id);}catch{}
        " 2>/dev/null)

        if [ -n "$AGENT_ID" ]; then
          curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
            -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
            "$API/agents/$AGENT_ID" -d '{"status":"idle"}' 2>/dev/null || true

          # Also release any hired seniors under this agent
          curl -s -H "$AUTH" "$API/hirings/leader/$AGENT_ID" 2>/dev/null | node -e "
            try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
            (d.hirings||[]).filter(h=>h.status==='active').forEach(h=>console.log(h.id));}catch{}
          " 2>/dev/null | while read HID; do
            curl -s -o /dev/null --connect-timeout 2 --max-time 3 \
              -X POST -H "$AUTH" "$API/hirings/$HID/release" 2>/dev/null || true
          done
        fi
      fi
    fi
  fi
fi

# Never block Claude Code — always exit 0
exit 0
