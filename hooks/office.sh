#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Agent Office — Integration Script
# Called by Main Agent to sync team activity with the office
# ═══════════════════════════════════════════════════════════
#
# Usage:
#   ./office.sh start-work <agent_name>
#   ./office.sh stop-work <agent_name>
#   ./office.sh create-room <room_name>
#   ./office.sh assign-room <room_name> <agent_name>
#   ./office.sh hire <leader_name> [room_name]
#   ./office.sh release-all <leader_name>
#   ./office.sh close-room <room_name>
#   ./office.sh status

API="${AGENT_OFFICE_URL:-http://localhost:8790}/api"
AUTH="Authorization: Bearer ${AGENT_OFFICE_TOKEN:-claw-test-token-2024}"

# Helper: get agent ID by name
agent_id() {
  curl -s -H "$AUTH" "$API/agents" | node -e "
    const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    const a=d.agents.find(a=>a.name==='$1');
    if(a)console.log(a.id);else process.exit(1);
  " 2>/dev/null
}

# Helper: get room ID by name
room_id() {
  curl -s -H "$AUTH" "$API/rooms" | node -e "
    const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    const r=(d.rooms||[]).find(r=>r.name==='$1'&&r.status==='active');
    if(r)console.log(r.id);else process.exit(1);
  " 2>/dev/null
}

case "$1" in
  start-work)
    ID=$(agent_id "$2")
    [ -z "$ID" ] && echo "Agent '$2' not found" && exit 1
    curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" "$API/agents/$ID" -d '{"status":"working"}' -o /dev/null
    echo "💻 $2 → working"
    ;;

  stop-work)
    ID=$(agent_id "$2")
    [ -z "$ID" ] && echo "Agent '$2' not found" && exit 1
    curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" "$API/agents/$ID" -d '{"status":"idle"}' -o /dev/null
    echo "😴 $2 → idle"
    ;;

  create-room)
    RESULT=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$API/rooms" \
      -d "{\"name\":\"$2\",\"room_type\":\"project\"}")
    ROOM_ID=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.room?.id||'')" 2>/dev/null)
    echo "🚪 Room '$2' created ($ROOM_ID)"
    ;;

  assign-room)
    RID=$(room_id "$2")
    AID=$(agent_id "$3")
    [ -z "$RID" ] && echo "Room '$2' not found" && exit 1
    [ -z "$AID" ] && echo "Agent '$3' not found" && exit 1
    curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$API/rooms/$RID/assign" -d "{\"agent_id\":\"$AID\"}" -o /dev/null
    curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" "$API/agents/$AID" -d '{"status":"working"}' -o /dev/null
    echo "💻 $3 → Room '$2' (working)"
    ;;

  hire)
    AID=$(agent_id "$2")
    [ -z "$AID" ] && echo "Leader '$2' not found" && exit 1
    if [ -n "$3" ]; then
      RID=$(room_id "$3")
    else
      RID=""
    fi
    if [ -z "$RID" ]; then
      # Find room where leader is assigned
      RID=$(curl -s -H "$AUTH" "$API/agents" | node -e "
        const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
        const a=d.agents.find(a=>a.name==='$2');
        if(a?.current_room_id)console.log(a.current_room_id);
      " 2>/dev/null)
    fi
    [ -z "$RID" ] && echo "No room found for leader '$2'" && exit 1
    RESULT=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$API/hirings" \
      -d "{\"leader_agent_id\":\"$AID\",\"room_id\":\"$RID\"}")
    HIRED_NAME=$(echo "$RESULT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.hired_agent?.name||d.hiring?.hired_agent_id?.slice(0,8)||'?')}catch{console.log('?')}" 2>/dev/null)
    # Set hired to working
    HIRED_ID=$(echo "$RESULT" | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.hired_agent?.id||d.hiring?.hired_agent_id||'')}catch{}" 2>/dev/null)
    [ -n "$HIRED_ID" ] && curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" "$API/agents/$HIRED_ID" -d '{"status":"working"}' -o /dev/null
    echo "🤝 $2 hired → $HIRED_NAME (working)"
    ;;

  release-all)
    AID=$(agent_id "$2")
    [ -z "$AID" ] && echo "Leader '$2' not found" && exit 1
    curl -s -H "$AUTH" "$API/hirings/leader/$AID" | node -e "
      const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
      (d.hirings||[]).filter(h=>h.status==='active').forEach(h=>console.log(h.id));
    " 2>/dev/null | while read HID; do
      curl -s -X POST -H "$AUTH" "$API/hirings/$HID/release" -o /dev/null
      echo "👋 Released hiring $HID"
    done
    echo "✅ All hired by '$2' released"
    ;;

  close-room)
    RID=$(room_id "$2")
    [ -z "$RID" ] && echo "Room '$2' not found" && exit 1
    curl -s -X DELETE -H "$AUTH" "$API/rooms/$RID" -o /dev/null
    echo "🔒 Room '$2' archived"
    ;;

  status)
    echo "═══ Agent Office Status ═══"
    curl -s -H "$AUTH" "$API/agents" | node -e "
      const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
      const w=d.agents.filter(a=>a.status==='working');
      const i=d.agents.filter(a=>a.status==='idle');
      const b=d.agents.filter(a=>a.status==='break');
      const h=d.agents.filter(a=>a.agent_type==='hired_senior');
      console.log('Working:', w.length, '| Idle:', i.length, '| Break:', b.length, '| Hired:', h.length);
      if(w.length>0){console.log('');console.log('Working:');w.forEach(a=>console.log('  💻',a.avatar_emoji,a.name,'|',a.agent_type));}
      if(h.length>0){console.log('');console.log('Hired:');h.forEach(a=>console.log('  🤝',a.name,'| room:',a.current_room_id?.slice(0,8)||'none'));}
    " 2>/dev/null
    echo ""
    echo "Rooms:"
    curl -s -H "$AUTH" "$API/rooms" | node -e "
      const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
      (d.rooms||[]).filter(r=>r.status==='active').forEach(r=>console.log('  🚪',r.name,'|',r.agent_count,'agents'));
      if(!(d.rooms||[]).some(r=>r.status==='active'))console.log('  (nenhuma sala ativa)');
    " 2>/dev/null
    ;;

  *)
    echo "Usage: office.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  start-work <agent>        Set agent to working"
    echo "  stop-work <agent>         Set agent to idle"
    echo "  create-room <name>        Create project room"
    echo "  assign-room <room> <agent> Assign agent to room + working"
    echo "  hire <leader> [room]      Leader hires a Senior"
    echo "  release-all <leader>      Release all hired by leader"
    echo "  close-room <name>         Archive room"
    echo "  status                    Show office status"
    ;;
esac
