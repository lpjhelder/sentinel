# Sentinel + Claude Code Agent System -- Setup Guide

Sentinel is an AI agent management dashboard that visualizes and orchestrates Claude Code subagents in real time. It provides a pixel-art office UI, a task board, room management, meeting tracking, and a REST API -- all designed to give you a "CEO desk" view of your agent workforce.

This guide takes you from zero to a running system in about 15 minutes.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Sentinel](#2-install-sentinel)
3. [Configure Environment](#3-configure-environment)
4. [Start Sentinel](#4-start-sentinel)
5. [Set Up Claude Code Agents](#5-set-up-claude-code-agents)
6. [Install CLAUDE.md and Workflows](#6-install-claudemd-and-workflows)
7. [Configure Claude Code Hooks](#7-configure-claude-code-hooks)
8. [Task Board Integration](#8-task-board-integration)
9. [Agents Disk API](#9-agents-disk-api)
10. [Docker / NAS Deployment](#10-docker--nas-deployment)
11. [Customization](#11-customization)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

| Dependency | Minimum Version | Install |
|------------|----------------|---------|
| **Node.js** | 22+ | https://nodejs.org/ |
| **pnpm** | 10+ | `corepack enable && corepack prepare pnpm@latest --activate` |
| **Git** | any recent | https://git-scm.com/ |
| **Claude Code CLI** | latest | `npm install -g @anthropic-ai/claude-code` |

Verify everything is installed:

```bash
node -v          # must be v22.x or higher
pnpm -v          # must be v10.x or higher
git --version
claude --version
```

---

## 2. Install Sentinel

```bash
git clone https://github.com/lpjhelder/sentinel.git
cd sentinel
pnpm install
```

Or use the one-click setup script (macOS/Linux):

```bash
bash install.sh --start
```

The install script will:
- Run `pnpm install`
- Create `.env` from `.env.example`
- Auto-generate `OAUTH_ENCRYPTION_SECRET` and `INBOX_WEBHOOK_SECRET`
- Install AGENTS.md orchestration rules
- Optionally start the dev server with `--start`

---

## 3. Configure Environment

Copy the example and edit:

```bash
cp .env.example .env
```

### Required variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `8790` |
| `HOST` | Bind address (`127.0.0.1` for local, `0.0.0.0` for LAN) | `127.0.0.1` |
| `OAUTH_ENCRYPTION_SECRET` | Encrypts OAuth tokens in SQLite. Generate with the command below. | (none -- must set) |

Generate the encryption secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Optional variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PATH` | Path to SQLite database file | `./sentinel.sqlite` |
| `LOGS_DIR` | Directory for log files | `./logs` |
| `API_AUTH_TOKEN` | Required when accessing API from non-loopback addresses | (none) |
| `ALLOWED_ORIGINS` | Extra CORS origins (comma-separated) | (none) |
| `ALLOWED_ORIGIN_SUFFIXES` | CORS origin suffix matching (e.g. `.ts.net`) | (none) |
| `OAUTH_BASE_URL` | Public callback URL if behind a reverse proxy | `http://127.0.0.1:8790` |
| `INBOX_WEBHOOK_SECRET` | Secret for the `/api/inbox` webhook endpoint | (none) |
| `AGENTS_DIR` | Override path for agent `.md` files on disk | `~/.claude/agents/` |

### OAuth providers (optional)

```env
OAUTH_GITHUB_CLIENT_ID="..."
OAUTH_GITHUB_CLIENT_SECRET="..."
OAUTH_GOOGLE_CLIENT_ID="..."
OAUTH_GOOGLE_CLIENT_SECRET="..."
```

### Meeting prompt tuning (optional)

```env
MEETING_PROMPT_TASK_CONTEXT_MAX_CHARS=1200
MEETING_TRANSCRIPT_MAX_TURNS=20
MEETING_TRANSCRIPT_LINE_MAX_CHARS=180
MEETING_TRANSCRIPT_TOTAL_MAX_CHARS=2400
REVIEW_MEETING_ONESHOT_TIMEOUT_MS=65000
```

---

## 4. Start Sentinel

**Local development (recommended for getting started):**

```bash
pnpm dev:local
```

This starts two processes:
- **Frontend (Vite):** http://localhost:8800
- **API server:** http://localhost:8790

**LAN-accessible mode** (for accessing from other machines or Tailscale):

```bash
pnpm dev
```

or

```bash
pnpm dev:tailscale
```

Both bind to `0.0.0.0` on the same ports.

**Production mode:**

```bash
pnpm build
pnpm start
```

**Health check:**

```bash
curl http://localhost:8790/api/health
```

---

## 5. Set Up Claude Code Agents

Sentinel works with 16 specialized agents defined as `.md` files. Claude Code loads these agents and can spawn them as subagents during work.

### Agent file locations (priority order)

Claude Code resolves agents from three locations, highest priority first:

| Priority | Location | Scope | When to use |
|----------|----------|-------|-------------|
| 1 | `--agents` CLI flag | Session only | Testing a single agent temporarily |
| 2 | `.claude/agents/` in project root | Project-level | Project-specific agent overrides |
| 3 | `~/.claude/agents/` | Global (all projects) | Default -- recommended for shared agents |

**Recommended setup:** Copy the 16 agent files to the global directory so they are available in every project.

```bash
# Create the global agents directory
mkdir -p ~/.claude/agents/

# Copy agent files (adjust source path to where you have them)
cp /path/to/your/agents/*.md ~/.claude/agents/
```

### The 16 agents

| Agent | File | Role |
|-------|------|------|
| Architect | `architect.md` | System design, high-level decisions |
| Developer | `developer.md` | Core implementation |
| Tester | `tester.md` | Test strategy and execution |
| Reviewer | `reviewer.md` | Code review and quality |
| Security | `security.md` | Security audits, OWASP, pen-testing |
| DBA | `dba.md` | Database design, queries, migrations |
| DevOps | `devops.md` | CI/CD, infrastructure, deployment |
| Performance | `performance.md` | Profiling, optimization |
| Docs | `docs.md` | Technical documentation |
| API Designer | `api-designer.md` | API contracts, REST/GraphQL design |
| Monitoring | `monitoring.md` | Observability, alerting, dashboards |
| Accessibility | `accessibility.md` | WCAG, a11y testing |
| UX Writer | `ux-writer.md` | Microcopy, user-facing text |
| i18n | `i18n.md` | Internationalization |
| Release Manager | `release-manager.md` | Release process, changelogs |
| Mobile | `mobile.md` | React Native, Expo, mobile-specific |

---

## 6. Install CLAUDE.md and Workflows

The system uses two key files that tell Claude Code **how** to route tasks to agents:

- **`CLAUDE.md`** -- The workflow router with decision logic, routing tables, and execution rules (covers 60 workflows across 16 agents).
- **`workflows.md`** -- Detailed step-by-step instructions for each of the 60 workflows.

### Global installation (recommended)

Place them in your user-level Claude directory so they apply to all projects:

```bash
cp /path/to/CLAUDE.md ~/.claude/CLAUDE.md
cp /path/to/workflows.md ~/.claude/workflows.md
```

### Project-level installation

For project-specific overrides, place them in the project root:

```
your-project/
  .claude/
    CLAUDE.md        # project-level overrides
    workflows.md
    agents/          # project-level agent overrides
```

### How the routing system works

When you give Claude Code a task, `CLAUDE.md` instructs it to:

1. **Classify the intent** -- Create, Fix, Improve, Audit, Remove, Document, or Urgent
2. **Identify the technical area** -- Auth, Payment, API, Database, Frontend, etc.
3. **Resolve ambiguity** -- Ask you if the right workflow is unclear
4. **Select and announce the workflow** -- e.g., "Workflow 27 (Payment) + Security audit"
5. **Execute with the right agents** -- Spawn subagents in the correct order

The `CLAUDE.md` file also contains Sentinel task-reporting instructions, so Claude automatically creates and updates tasks on the Sentinel task board as it works.

---

## 7. Configure Claude Code Hooks

Hooks are what connect Claude Code to Sentinel in real time. When an agent starts, stops, or goes idle, hooks notify Sentinel so the dashboard updates automatically.

### Enable Agent Teams

Set this environment variable (required for multi-agent support):

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### Add hooks to settings.json

Edit `~/.claude/settings.json` (create it if it does not exist):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "bash /absolute/path/to/sentinel/hooks/office-hooks.sh PreToolUse",
            "timeout": 5,
            "statusMessage": "Office: preparing room..."
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "matcher": "developer|tester|reviewer|security|dba|devops|docs|monitoring|release-manager|performance|accessibility|api-designer|architect|i18n|mobile|ux-writer",
        "hooks": [
          {
            "type": "command",
            "command": "bash /absolute/path/to/sentinel/hooks/office-hooks.sh SubagentStart",
            "timeout": 5,
            "statusMessage": "Office: agent starting..."
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "developer|tester|reviewer|security|dba|devops|docs|monitoring|release-manager|performance|accessibility|api-designer|architect|i18n|mobile|ux-writer",
        "hooks": [
          {
            "type": "command",
            "command": "bash /absolute/path/to/sentinel/hooks/office-hooks.sh SubagentStop",
            "timeout": 5,
            "statusMessage": "Office: agent stopping..."
          }
        ]
      }
    ],
    "TeammateIdle": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /absolute/path/to/sentinel/hooks/office-hooks.sh TeammateIdle",
            "timeout": 5,
            "statusMessage": "Office: teammate idle..."
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /absolute/path/to/sentinel/hooks/office-hooks.sh SessionEnd",
            "timeout": 10,
            "statusMessage": "Office: cleaning up..."
          }
        ]
      }
    ]
  },
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Important:** Replace `/absolute/path/to/sentinel` with the actual path where you cloned the Sentinel repository. On Windows with Git Bash, use forward slashes (e.g., `E:/claude/sentinel/hooks/office-hooks.sh`).

### What each hook does

| Hook | Trigger | Effect in Sentinel |
|------|---------|--------------------|
| `PreToolUse(Agent)` | Before Claude spawns a subagent | Saves the task description for room naming |
| `SubagentStart` | Subagent begins work | Creates a room, assigns agent, sets status to "working" |
| `SubagentStop` | Subagent finishes | Sets agent to "idle", releases hired seniors, auto-closes empty rooms, marks in-progress tasks as "review" (fallback) |
| `TeammateIdle` | Agent Teams teammate goes idle | Sets agent to "idle", auto-closes room if all done |
| `SessionEnd` | Claude Code session ends | Dismisses all meetings, idles all agents, closes rooms, marks remaining in-progress tasks as "review" |

### Environment variables for hooks

The hooks use these env vars (with sensible defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_OFFICE_URL` | `http://localhost:8790` | Sentinel API base URL |
| `AGENT_OFFICE_TOKEN` | `claw-test-token-2024` | API auth token |

If you set `API_AUTH_TOKEN` in Sentinel's `.env`, update `AGENT_OFFICE_TOKEN` to match.

---

## 8. Task Board Integration

Sentinel includes a task board that tracks what each agent is working on. Claude Code reports tasks automatically through the `sentinel-task.sh` helper script.

### The sentinel-task.sh helper

Located at `hooks/sentinel-task.sh`, this script provides a CLI for task management:

```bash
# Create a new task
sentinel-task.sh create "Implement user auth" "developer" "JWT-based auth with refresh tokens"

# Add a subtask to an existing task
sentinel-task.sh subtask <task_id> "Write unit tests" "tester" "Cover login and token refresh"

# Update task status
sentinel-task.sh status <task_id> in_progress    # or: inbox, planned, review, done, cancelled

# Update subtask status
sentinel-task.sh substatus <subtask_id> done     # or: pending, in_progress, blocked

# Find an agent's ID by name
sentinel-task.sh find-agent "developer"

# Find an agent's department
sentinel-task.sh find-dept "developer"
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SENTINEL_URL` | `http://localhost:8790` | Sentinel API base URL |
| `SENTINEL_TOKEN` | `claw-test-token-2024` | API auth token |

### Automatic task status fallback

When a subagent stops (via `SubagentStop` hook) and forgot to update its task status, the hook automatically marks any `in_progress` tasks assigned to that agent as `review`. Similarly, when a session ends (`SessionEnd`), all remaining `in_progress` tasks move to `review`.

This ensures your task board never has stale "in progress" items after agents finish working.

### How Claude reports tasks

The `CLAUDE.md` file instructs Claude to call `sentinel-task.sh` at key moments:
- **Before starting work:** `create` a task with a title and description
- **During work:** `status in_progress` and `subtask` for sub-items
- **When done:** `status review` or `status done`

No manual intervention needed -- it happens automatically as part of the workflow.

---

## 9. Agents Disk API

Sentinel can read and manage agent `.md` files directly from disk through a REST API. This powers the Settings and Agent Detail panels in the UI.

### API Endpoints

```
GET    /api/agents-disk            List all .md files in the agents directory
GET    /api/agents-disk/:name      Read a specific agent's .md file
PUT    /api/agents-disk/:name      Create or update an agent's .md file
DELETE /api/agents-disk/:name      Delete an agent's .md file
```

### Examples

```bash
# List all agents on disk
curl http://localhost:8790/api/agents-disk

# Read the developer agent profile
curl http://localhost:8790/api/agents-disk/developer

# Create a new agent
curl -X PUT http://localhost:8790/api/agents-disk/my-custom-agent \
  -H "Content-Type: application/json" \
  -d '{"content": "# My Custom Agent\n\nYou are a specialist in..."}'

# Delete an agent
curl -X DELETE http://localhost:8790/api/agents-disk/my-custom-agent
```

### Directory resolution (3-level priority)

The API resolves the agents directory in this order:

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `AGENTS_DIR` environment variable | `AGENTS_DIR=/home/user/my-agents` |
| 2 | `agentsDir` setting in the database | Set via Settings page in UI |
| 3 | Default | `~/.claude/agents/` |

In the Sentinel UI, go to **Settings** and set the **Agents Directory** field to point at your agents folder. The **Profile** tab in any Agent Detail panel shows and edits the `.md` file content.

### Filename rules

Agent names must match `^[a-zA-Z0-9][a-zA-Z0-9_-]*$`. The `.md` extension is added automatically. Path traversal attempts are rejected.

---

## 10. Docker / NAS Deployment

### Standard Docker

```bash
# Create env files
cp .env.example .env.docker
# Edit .env.docker with production values

# Optional: create .env.docker.private for secrets
echo 'API_AUTH_TOKEN="your-secure-token"' > .env.docker.private

# Build and start
docker compose up -d
```

The `docker-compose.yml` exposes port `8790` and persists data to `./data/`.

### NAS deployment (QNAP, Synology, etc.)

Use the NAS-specific compose file:

```bash
docker compose -f docker-compose.nas.yml up -d
```

Key differences from the standard compose:
- Uses `.env.nas` for configuration
- Sets `NODE_ENV=production` and `HOST=0.0.0.0`
- Adds a 512MB memory limit
- Includes a health check (`/api/health` every 30s)
- Creates an isolated `agent-office-net` bridge network

Create `.env.nas`:

```env
PORT=8790
HOST=0.0.0.0
NODE_ENV=production
OAUTH_ENCRYPTION_SECRET="<generate-a-64-char-hex-string>"
INBOX_WEBHOOK_SECRET="<generate-another-hex-string>"
API_AUTH_TOKEN="<your-secure-token>"
DB_PATH=/app/data/agent-office.sqlite
LOGS_DIR=/app/data/logs
```

To rebuild after updates:

```bash
docker compose -f docker-compose.nas.yml up -d --build
```

### Dockerfile details

The Docker image is based on `node:22-bookworm-slim` and includes:
- Node.js 22, pnpm (via corepack), git, bash
- Pre-installed CLI tools: `@anthropic-ai/claude-code`, `@openai/codex`, `@google/gemini-cli`, `opencode-ai`
- Runs as unprivileged user `app` (UID/GID 10001)
- Exposes port 8790

### Nginx reverse proxy

An example nginx config is provided at `deploy/nginx/sentinel.conf`. It handles:
- HTTP to HTTPS redirect
- WebSocket proxying at `/ws`
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

To use it:

```bash
sudo cp deploy/nginx/sentinel.conf /etc/nginx/sites-available/sentinel
sudo ln -s /etc/nginx/sites-available/sentinel /etc/nginx/sites-enabled/sentinel

# Edit server_name to match your domain
sudo nano /etc/nginx/sites-available/sentinel

sudo nginx -t
sudo systemctl reload nginx
```

If using Tailscale, you may not need nginx at all -- just use `pnpm start:tailscale` which binds to `0.0.0.0`.

---

## 11. Customization

### Add a new agent

1. **Create the `.md` file** in your agents directory:

```bash
cat > ~/.claude/agents/my-agent.md << 'EOF'
# My Agent

You are a specialist in [domain]. Your responsibilities include:

- Task 1
- Task 2

## Rules
- Always do X before Y
- Never do Z without checking W
EOF
```

2. **Or use the Sentinel UI:** Go to any Agent Detail panel, click the Profile tab, and edit/create the file directly. Alternatively, use the API:

```bash
curl -X PUT http://localhost:8790/api/agents-disk/my-agent \
  -H "Content-Type: application/json" \
  -d '{"content": "# My Agent\n\nYou are a specialist in..."}'
```

3. **Add to hook matchers** if you want Sentinel to track the new agent. Edit the `SubagentStart` and `SubagentStop` matchers in `~/.claude/settings.json` to include the new agent name.

4. **Add agent mapping** in `hooks/office-hooks.sh` in the `map_agent()` function if the agent name needs translation (e.g., "my-agent" maps to "My Agent" in Sentinel).

### Modify workflows

Edit `~/.claude/workflows.md` (or `.claude/workflows.md` in your project). The file contains 60 numbered workflows with step-by-step instructions. Each workflow specifies which agents to involve and in what order.

### Change the agents directory

Three ways, in order of priority:

1. **Environment variable:** Set `AGENTS_DIR` before starting Sentinel
2. **UI setting:** Go to Settings and update the Agents Directory field
3. **Default:** Falls back to `~/.claude/agents/`

---

## 12. Troubleshooting

### Sentinel is not responding

```bash
curl http://localhost:8790/api/health
```

If this fails, check that the server is running and the port is correct. On Windows, make sure nothing else is using port 8790.

### Hooks are not firing

- Verify the paths in `~/.claude/settings.json` are absolute and correct
- On Windows, use forward slashes in paths (Git Bash requirement)
- Check that `bash` is available in your PATH
- Test the hook manually: `bash /path/to/sentinel/hooks/office-hooks.sh SubagentStart <<< '{"agent_type":"developer"}'`

### Agents are not appearing in Sentinel

- Verify your agents directory exists: `ls ~/.claude/agents/`
- Check the API: `curl http://localhost:8790/api/agents-disk`
- If the directory is wrong, check `AGENTS_DIR` env var or the Settings page

### Task board not updating

- Make sure `sentinel-task.sh` can reach the API: `bash /path/to/sentinel/hooks/sentinel-task.sh find-agent developer`
- Check `SENTINEL_URL` and `SENTINEL_TOKEN` environment variables
- Verify that `CLAUDE.md` includes the task-reporting instructions

### Docker container won't start

```bash
docker compose logs sentinel
```

Common issues:
- Missing `.env.docker` file
- Port 8790 already in use
- Permissions on `./data/` directory (must be writable by UID 10001)

### "Agent Teams" features not working

Make sure the experimental flag is set:

```bash
echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
# Should output: 1
```

This must be set either in `~/.claude/settings.json` under `"env"` or as a shell environment variable.
