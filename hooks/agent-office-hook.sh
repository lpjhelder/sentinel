#!/bin/bash
# Claude Code Hook → Agent Office
# Reads hook data from stdin (JSON), sends to Agent Office API
# Silent on success, never blocks Claude Code

AGENT_OFFICE_URL="${AGENT_OFFICE_URL:-http://localhost:8790}"
AGENT_OFFICE_TOKEN="${AGENT_OFFICE_TOKEN:-claw-test-token-2024}"

# Read stdin (Claude Code sends JSON via stdin)
INPUT=$(cat)

# Extract hook_type from the event
HOOK_TYPE=$(echo "$INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.event||d.hook_type||d.type||'unknown')}catch{console.log('unknown')}" 2>/dev/null)

# Extract tool name if available
TOOL_NAME=$(echo "$INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.tool_name||d.toolName||d.tool||'')}catch{console.log('')}" 2>/dev/null)

# Extract agent name if available (from session or tool context)
AGENT_NAME=$(echo "$INPUT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.agent_name||d.agentName||d.session?.agent_name||'')}catch{console.log('')}" 2>/dev/null)

# Build payload
PAYLOAD="{\"hook_type\":\"${HOOK_TYPE}\",\"agent_name\":\"${AGENT_NAME}\",\"tool_name\":\"${TOOL_NAME}\",\"session_id\":\"${CLAUDE_SESSION_ID:-}\",\"project_path\":\"$(pwd)\",\"timestamp\":$(date +%s000)}"

# POST to Agent Office — 3s timeout, silent, never fail
curl -s -o /dev/null \
  --connect-timeout 2 \
  --max-time 3 \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AGENT_OFFICE_TOKEN}" \
  -d "$PAYLOAD" \
  "${AGENT_OFFICE_URL}/api/hooks/event" 2>/dev/null || true
