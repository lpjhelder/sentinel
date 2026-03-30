# Changelog

All notable changes to Sentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.5] - 2026-03-30

### Added

- **Child task distribution** -- new `sentinel-task.sh child` command creates full
  tasks (not subtasks) for each spawned agent, so every agent appears with their own
  task on the board. Linked via `source_task_id` to parent task.
- **POST /api/tasks** now accepts `source_task_id` for parent-child task linking.
- **SETUP.md** -- comprehensive 12-section installation and usage guide covering
  all components: Sentinel, agents, hooks, task board, Docker/NAS deployment.
- **CHANGELOG.md** -- this file.

### Changed

- **sentinel-task.sh** -- `status` and `substatus` commands now automatically link
  agents to tasks via `current_task_id` (sets on `in_progress`, clears on `done`).
- **office-hooks.sh** -- SubagentStop clears `current_task_id`, fallback marks
  orphaned `in_progress` tasks as `review`. SessionEnd cleans up all tasks.
- **Settings tooltips** -- all 4 toggle cards (Auto Assign, YOLO Mode, Auto Update,
  OAuth Auto Swap) now have clear descriptions and recommendations in 5 languages.

---

## [2.0.4] - 2026-03-30

This is the first release under the **Sentinel** name. The project was previously
known as Claw-Empire and has been fully renamed across all files, configs, database,
assets, hooks, and deploy scripts.

### Added

- **Agents Disk API** -- new REST endpoints (`GET/PUT/DELETE /api/agents-disk`) for
  managing Claude Code agent `.md` profile files directly from the UI. Supports
  3-level path resolution: `AGENTS_DIR` environment variable, database setting, or
  the default `~/.claude/agents/` directory. Includes filename validation and path
  traversal protection.
- **Agent Profile Editor** -- new "Profile" tab in the Agent Detail panel with an
  inline editor for `.md` files. Supports save, discard, and reload operations.
  Auto-loads the matching agent file from the configured agents directory.
- **Sentinel Task Board Integration** -- `sentinel-task.sh` helper script that allows
  Claude Code sessions to report task progress back to Sentinel. Hook fallback
  automatically marks tasks as "review" on SubagentStop/SessionEnd events.
- **Global Agent Setup** -- 16 agents moved from project-level configuration to
  `~/.claude/agents/` (global scope). `CLAUDE.md` and `workflows.md` also moved to
  `~/.claude/` so they work across all projects. `settings.json` hooks updated with
  the correct global paths.
- **AUDIT-UNUSED-CODE.md** -- comprehensive code audit documenting unused code,
  dead imports, and orphaned files with fix status tracking.

### Changed

- **Project renamed from Claw-Empire to Sentinel** -- all references updated across
  the entire codebase: file names, configuration files, database name (now
  `sentinel.sqlite`), static assets, shell hooks, and deployment scripts.

### Removed

- Old `claw-empire.sqlite` database file (replaced by `sentinel.sqlite`).
- Stale worktrees and legacy Claw-Empire assets that were no longer referenced.

## [2.0.0] - [1.x.x] -- Prior releases

Earlier versions were released under the name **Claw-Empire**. No structured
changelog was maintained for those releases.
