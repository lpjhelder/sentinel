# Project: claw-republic

## Tech Stack
Node.js >=22, React ^19.2.0, Express, TypeScript, Tailwind CSS, Vite

## File Structure
```
├── deploy/
│   ├── nginx/
│   │   └── claw-empire.conf
│   ├── claw-empire@.service
│   └── README.md
├── docs/
│   ├── architecture/
│   │   ├── architecture.json
│   │   ├── backend-dependencies.mmd
│   │   ├── CEO-STRUCTURE-MAP.md
│   │   ├── frontend-imports.mmd
│   │   ├── org-chart.mmd
│   │   ├── README.md
│   │   └── source-tree.txt
│   ├── plans/
│   │   ├── 2026-02-25-server-types-nocheck-removal.md
│   │   └── 2026-02-27-workflow-pack-mvp.md
│   ├── releases/
│   │   ├── README.md
│   │   ├── v1.0.1.md
│   │   ├── v1.0.2.md
│   │   ├── v1.0.3.md
│   │   ├── v1.0.4.md
│   │   ├── v1.0.5.md
│   │   ├── v1.0.6.md
│   │   ├── v1.0.7.md
│   │   ├── v1.0.8.md
│   │   ├── v1.0.9.md
│   │   ├── v1.1.0.md
│   │   ├── v1.1.1.md
│   │   ├── v1.1.2.md
│   │   ├── v1.1.3.md
│   │   ├── v1.1.4.md
│   │   ├── v1.1.5.md
│   │   ├── v1.1.6.md
│   │   ├── v1.1.7.md
│   │   ├── v1.1.8.md
│   │   ├── v1.1.9.md
│   │   ├── v1.2.0.md
│   │   ├── v1.2.1.md
│   │   ├── v1.2.2.md
│   │   ├── v1.2.3.md
│   │   ├── v1.2.4.md
│   │   ├── v2.0.0.md
│   │   ├── v2.0.1.md
│   │   ├── v2.0.2.md
│   │   └── v2.0.3.md
│   ├── reports/
│   │   ├── Sample_Slides/
│   │   │   ├── build-pptx.cjs
│   │   │   ├── build-pptx.mjs
│   │   │   ├── html2pptx.cjs
│   │   │   ├── slide-01.html
│   │   │   ├── slide-02.html
│   │   │   ├── slide-03.html
│   │   │   ├── slide-04.html
│   │   │   ├── slide-05.html
│   │   │   ├── slide-06.html
│   │   │   ├── slide-07.html
│   │   │   ├── slide-08.html
│   │   │   └── slide-09.html
│   │   └── PPT_Sample.pptx
│   ├── api.md
│   ├── decision-inbox-checkpoint-2026-02-22.md
│   ├── DESIGN_SKILLS.md
│   ├── DESIGN.md
│   └── openapi.json
├── logs/
├── public/
│   ├── sprites/
│   │   ├── 1-D-1.png
│   │   ├── 1-D-2.png
│   │   ├── 1-D-3.png
│   │   ├── 1-L-1.png
│   │   ├── 1-R-1.png
│   │   ├── 10-D-1.png
│   │   ├── 10-D-2.png
│   │   ├── 10-D-3.png
│   │   ├── 10-L-1.png
│   │   ├── 10-R-1.png
│   │   ├── 11-D-1.png
│   │   ├── 11-D-2.png
│   │   ├── 11-D-3.png
│   │   ├── 11-L-1.png
│   │   ├── 11-R-1.png
│   │   ├── 12-D-1.png
│   │   ├── 12-D-2.png
│   │   ├── 12-D-3.png
│   │   ├── 12-L-1.png
│   │   ├── 12-R-1.png
│   │   ├── 13-D-1.png
│   │   ├── 13-D-2.png
│   │   ├── 13-D-3.png
│   │   ├── 13-L-1.png
│   │   ├── 13-R-1.png
│   │   ├── 14-D-1.png
│   │   ├── 14-D-2.png
│   │   ├── 14-D-3.png
│   │   ├── 14-L-1.png
│   │   ├── 14-R-1.png
│   │   ├── 2-D-1.png
│   │   ├── 2-D-2.png
│   │   ├── 2-D-3.png
│   │   ├── 2-L-1.png
│   │   ├── 2-R-1.png
│   │   ├── 3-D-1.png
│   │   ├── 3-D-2.png
│   │   ├── 3-D-3.png
│   │   ├── 3-L-1.png
│   │   ├── 3-R-1.png
│   │   ├── 4-D-1.png
│   │   ├── 4-D-2.png
│   │   ├── 4-D-3.png
│   │   ├── 4-L-1.png
│   │   ├── 4-R-1.png
│   │   ├── 5-D-1.png
│   │   ├── 5-D-2.png
│   │   ├── 5-D-3.png
│   │   ├── 5-L-1.png
│   │   ├── 5-R-1.png
│   │   ├── 6-D-1.png
│   │   ├── 6-D-2.png
│   │   ├── 6-D-3.png
│   │   ├── 6-L-1.png
│   │   ├── 6-R-1.png
│   │   ├── 7-D-1.png
│   │   ├── 7-D-2.png
│   │   ├── 7-D-3.png
│   │   ├── 7-L-1.png
│   │   ├── 7-R-1.png
│   │   ├── 8-D-1.png
│   │   ├── 8-D-2.png
│   │   ├── 8-D-3.png
│   │   ├── 8-L-1.png
│   │   ├── 8-R-1.png
│   │   ├── 9-D-1.png
│   │   ├── 9-D-2.png
│   │   ├── 9-D-3.png
│   │   ├── 9-L-1.png
│   │   ├── 9-R-1.png
│   │   └── ceo-lobster.png
│   ├── claw-empire.png
│   ├── claw-empire.svg
│   └── climpire.svg
├── Sample_Img/
│   ├── claw-empire-intro.mp4
│   ├── CLI.png
│   ├── Dashboard.png
│   ├── Idle_CLI_view.png
│   ├── Kanban.png
│   ├── Meeting_Minutes.png
│   ├── OAuth.png
│   ├── Office_Manager.png
│   ├── Office_old.png
│   ├── Office_old1.png
│   ├── Office_old2.png
│   ├── Office_old3.png
│   ├── Office.png
│   ├── PPT_Gen0.png
│   ├── PPT_Gen1.png
│   ├── Report.png
│   ├── Script_view.png
│   ├── Setting.png
│   ├── Skill_Learn.png
│   ├── Skill_Remove.png
│   ├── Skills_Learning_Memory.png
│   ├── Skills.png
│   └── telegram.png
├── scripts/
│   ├── qa/
│   │   ├── office-theme-requirements-lib/
│   │   │   ├── constants.mjs
│   │   │   ├── contrast-audit.mjs
│   │   │   ├── reporting.mjs
│   │   │   ├── run.mjs
│   │   │   └── theme-helpers.mjs
│   │   ├── api-comm-test.mjs
│   │   ├── connectivity-lib.mjs
│   │   ├── interrupt-inject-http-smoke.mjs
│   │   ├── llm-comm-test.mjs
│   │   ├── oauth-comm-test.mjs
│   │   ├── office-console-smoke.mjs
│   │   ├── office-management-requirements.mjs
│   │   ├── office-performance-baseline.mjs
│   │   ├── office-resolution-compare.mjs
│   │   ├── office-theme-requirements.mjs
│   │   ├── project-path-api-smoke.mjs
│   │   └── run-comm-suite.mjs
│   ├── auto-apply-v1.0.5.mjs
│   ├── cleanup-staff.mjs
│   ├── convert-slides.mjs
│   ├── ensure-remotion-runtime.mjs
│   ├── generate-architecture-report.mjs
│   ├── generate-doro-sprites.mjs
│   ├── generate-intro-ppt.mjs
│   ├── kill-claw-empire-dev.ps1
│   ├── migrate-custom-skills-canonical.mjs
│   ├── openapi-contract.mjs
│   ├── openclaw-setup.ps1
│   ├── openclaw-setup.sh
│   ├── preflight-public.sh
│   ├── prepare-e2e-runtime.mjs
│   ├── run-claw-empire-dev-local.cmd
│   ├── setup.mjs
│   ├── test-comm-status.mjs
│   └── verify-security-audit-log.mjs
├── server/
│   ├── config/
│   │   └── runtime.ts
│   ├── db/
│   │   ├── runtime.test.ts
│   │   └── runtime.ts
│   ├── gateway/
│   │   ├── client.test.ts
│   │   └── client.ts
│   ├── messenger/
│   │   ├── channels.ts
│   │   ├── discord-receiver.test.ts
│   │   ├── discord-receiver.ts
│   │   ├── session-agent-routing.test.ts
│   │   ├── session-agent-routing.ts
│   │   ├── telegram-receiver.test.ts
│   │   ├── telegram-receiver.ts
│   │   ├── token-crypto.ts
│   │   └── token-hint.ts
│   ├── modules/
│   │   ├── bootstrap/
│   │   │   ├── schema/
│   │   │   │   ...
│   │   │   ├── helpers.ts
│   │   │   ├── message-idempotency.ts
│   │   │   └── security-audit.ts
│   │   ├── lifecycle/
│   │   │   └── register-graceful-shutdown.ts
│   │   ├── routes/
│   │   │   ├── collab/
│   │   │   │   ...
│   │   │   ├── core/
│   │   │   │   ...
│   │   │   ├── ops/
│   │   │   │   ...
│   │   │   ├── shared/
│   │   │   │   ...
│   │   │   ├── collab.ts
│   │   │   ├── core.ts
│   │   │   ├── ops.ts
│   │   │   ├── update-auto-command.test.ts
│   │   │   ├── update-auto-command.ts
│   │   │   ├── update-auto-lock.test.ts
│   │   │   ├── update-auto-lock.ts
│   │   │   ├── update-auto-policy.test.ts
│   │   │   ├── update-auto-policy.ts
│   │   │   ├── update-auto-utils.test.ts
│   │   │   └── update-auto-utils.ts
│   │   ├── workflow/
│   │   │   ├── agents/
│   │   │   │   ...
│   │   │   ├── core/
│   │   │   │   ...
│   │   │   ├── orchestration/
│   │   │   │   ...
│   │   │   ├── packs/
│   │   │   │   ...
│   │   │   ├── agents.ts
│   │   │   ├── core.ts
│   │   │   ├── meeting-prompt-utils.test.ts
│   │   │   ├── meeting-prompt-utils.ts
│   │   │   └── orchestration.ts
│   │   ├── deferred-runtime.ts
│   │   ├── lifecycle.ts
│   │   ├── routes.ts
│   │   ├── runtime-helper-keys.ts
│   │   └── workflow.ts
│   ├── oauth/
│   │   └── helpers.ts
│   ├── scripts/
│   │   └── cleanup-staff.test.ts
│   ├── security/
│   │   ├── auth.test.ts
│   │   └── auth.ts
│   ├── test/
│   │   ├── setup.ts
│   │   └── smoke.test.ts
│   ├── types/
│   │   ├── lang.ts
│   │   ├── runtime-context-auto-augmented.ts
│   │   └── runtime-context.ts
│   ├── ws/
│   │   ├── hub.test.ts
│   │   └── hub.ts
│   ├── index.ts
│   ├── server-main.ts
│   └── vitest.config.ts
├── slides/
│   ├── generate-pptx.mjs
│   ├── html2pptx.cjs
│   ├── slide-01.html
│   ├── slide-02.html
│   ├── slide-03.html
│   ├── slide-04.html
│   ├── slide-05.html
│   ├── slide-06.html
│   ├── slide-07.html
│   ├── slide-08.html
│   ├── slide-09.html
│   ├── slide-10.html
│   ├── slide-11.html
│   └── slide-12.html
├── src/
│   ├── api/
│   │   ├── core.ts
│   │   ├── messaging-runtime-oauth.ts
│   │   ├── organization-projects.ts
│   │   ├── providers-reports-github.ts
│   │   └── workflow-skills-subtasks.ts
│   ├── app/
│   │   ├── AppHeaderBar.mobile-office-pack.test.tsx
│   │   ├── AppHeaderBar.tsx
│   │   ├── AppLoadingScreen.tsx
│   │   ├── AppMainLayout.tsx
│   │   ├── AppOverlays.tsx
│   │   ├── constants.ts
│   │   ├── decision-inbox.ts
│   │   ├── office-pack-display.test.ts
│   │   ├── office-pack-display.ts
│   │   ├── office-workflow-pack.test.ts
│   │   ├── office-workflow-pack.ts
│   │   ├── sub-agent-events.ts
│   │   ├── task-workflow-pack.test.ts
│   │   ├── task-workflow-pack.ts
│   │   ├── types.ts
│   │   ├── useActiveMeetingTaskId.ts
│   │   ├── useAppActions.ts
│   │   ├── useAppBootstrapData.ts
│   │   ├── useAppLabels.ts
│   │   ├── useAppViewEffects.ts
│   │   ├── useLiveSyncScheduler.ts
│   │   ├── useRealtimeSync.ts
│   │   ├── useUpdateStatusPolling.ts
│   │   └── utils.ts
│   ├── components/
│   │   ├── agent-detail/
│   │   │   ├── AgentDetailTabContent.tsx
│   │   │   └── constants.ts
│   │   ├── agent-manager/
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentFormModal.tsx
│   │   │   ├── AgentsTab.tsx
│   │   │   ├── constants.ts
│   │   │   ├── DepartmentFormModal.tsx
│   │   │   ├── DepartmentsTab.tsx
│   │   │   ├── EmojiPicker.tsx
│   │   │   ├── office-pack-sync.test.ts
│   │   │   ├── office-pack-sync.ts
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   ├── chat/
│   │   │   ├── decision-inbox-modal.meta.ts
│   │   │   ├── decision-inbox.test.ts
│   │   │   ├── decision-inbox.ts
│   │   │   ├── decision-request.test.ts
│   │   │   └── decision-request.ts
│   │   ├── chat-panel/
│   │   │   ├── ChatComposer.tsx
│   │   │   ├── ChatMessageList.sender-fallback.test.tsx
│   │   │   ├── ChatMessageList.tsx
│   │   │   ├── ChatModeHint.tsx
│   │   │   ├── ChatPanelHeader.tsx
│   │   │   ├── model.ts
│   │   │   ├── ProjectFlowDialog.tsx
│   │   │   └── useDecisionReply.ts
│   │   ├── dashboard/
│   │   │   ├── HeroSections.tsx
│   │   │   ├── model.tsx
│   │   │   └── OpsSections.tsx
│   │   ├── github-import/
│   │   │   ├── GitHubDeviceConnect.tsx
│   │   │   ├── GitHubImportWizard.tsx
│   │   │   └── model.ts
│   │   ├── office-view/
│   │   │   ├── buildScene-break-room.ts
│   │   │   ├── buildScene-ceo-hallway.ts
│   │   │   ├── buildScene-department-agent.ts
│   │   │   ├── buildScene-departments.ts
│   │   │   ├── buildScene-final-layers.ts
│   │   │   ├── buildScene-types.ts
│   │   │   ├── buildScene.ts
│   │   │   ├── CliUsagePanel.tsx
│   │   │   ├── drawing-core.ts
│   │   │   ├── drawing-furniture-a.ts
│   │   │   ├── drawing-furniture-b.ts
│   │   │   ├── model.ts
│   │   │   ├── officeTicker.ts
│   │   │   ├── officeTickerRoomAndDelivery.ts
│   │   │   ├── themes-locale.ts
│   │   │   ├── useCliUsage.ts
│   │   │   ├── useOfficeDeliveryEffects.ts
│   │   │   ├── useOfficePixiRuntime.ts
│   │   │   └── VirtualPadOverlay.tsx
│   │   ├── project-manager/
│   │   │   ├── ManualAssignmentSelector.tsx
│   │   │   ├── ManualAssignmentWarningDialog.tsx
│   │   │   ├── ManualPathPickerDialog.tsx
│   │   │   ├── MissingPathPromptDialog.tsx
│   │   │   ├── ProjectEditorPanel.tsx
│   │   │   ├── ProjectInsightsPanel.tsx
│   │   │   ├── ProjectSidebar.tsx
│   │   │   ├── types.ts
│   │   │   ├── useProjectManagerPathTools.ts
│   │   │   ├── useProjectSaveHandler.ts
│   │   │   └── utils.ts
│   │   ├── settings/
│   │   │   ├── gateway-settings/
│   │   │   │   ...
│   │   │   ├── ApiAssignModal.tsx
│   │   │   ├── ApiSettingsTab.test.tsx
│   │   │   ├── ApiSettingsTab.tsx
│   │   │   ├── CliSettingsTab.tsx
│   │   │   ├── constants.tsx
│   │   │   ├── GatewaySettingsTab.characterization.test.tsx
│   │   │   ├── GatewaySettingsTab.tsx
│   │   │   ├── GeneralSettingsTab.tsx
│   │   │   ├── GitHubOAuthAppConfig.tsx
│   │   │   ├── Logos.tsx
│   │   │   ├── OAuthConnectCards.tsx
│   │   │   ├── OAuthConnectedProvidersSection.tsx
│   │   │   ├── OAuthSettingsTab.tsx
│   │   │   ├── SettingsTabNav.tsx
│   │   │   ├── types.ts
│   │   │   └── useApiProvidersState.ts
│   │   ├── skill-history/
│   │   │   └── utils.ts
│   │   ├── skills-library/
│   │   │   ├── ClassroomOverlay.tsx
│   │   │   ├── CustomSkillModal.tsx
│   │   │   ├── CustomSkillSection.tsx
│   │   │   ├── LearningModal.tsx
│   │   │   ├── model.tsx
│   │   │   ├── SkillsCategoryBar.tsx
│   │   │   ├── SkillsGrid.tsx
│   │   │   ├── SkillsHeader.tsx
│   │   │   ├── SkillsMemorySection.tsx
│   │   │   ├── useCustomSkillsState.ts
│   │   │   └── useSkillsLibraryState.ts
│   │   ├── taskboard/
│   │   │   ├── create-modal/
│   │   │   │   ...
│   │   │   ├── BulkHideModal.tsx
│   │   │   ├── constants.ts
│   │   │   ├── CreateTaskModal.tsx
│   │   │   ├── DiffModal.test.tsx
│   │   │   ├── DiffModal.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── TaskCard.tsx
│   │   ├── terminal-panel/
│   │   │   └── model.ts
│   │   ├── AgentAvatar.tsx
│   │   ├── AgentDetail.tsx
│   │   ├── AgentManager.tsx
│   │   ├── AgentSelect.tsx
│   │   ├── AgentStatusPanel.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DecisionInboxModal.tsx
│   │   ├── GitHubImportPanel.tsx
│   │   ├── MessageContent.tsx
│   │   ├── OfficeRoomManager.tsx
│   │   ├── OfficeView.tsx
│   │   ├── ProjectManagerModal.tsx
│   │   ├── ReportHistory.test.tsx
│   │   ├── ReportHistory.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SkillHistoryPanel.tsx
│   │   ├── SkillHistoryPanel.unlearn.test.tsx
│   │   ├── SkillsLibrary.esc-close.test.tsx
│   │   ├── SkillsLibrary.tsx
│   │   ├── task-report-agent.ts
│   │   ├── TaskBoard.tsx
│   │   ├── TaskReportPopup.test.tsx
│   │   ├── TaskReportPopup.tsx
│   │   └── TerminalPanel.tsx
│   ├── hooks/
│   │   ├── usePolling.test.tsx
│   │   ├── usePolling.ts
│   │   ├── useWebSocket.test.tsx
│   │   └── useWebSocket.ts
│   ├── styles/
│   │   ├── index.part01.css
│   │   ├── index.part02.css
│   │   ├── index.part03.css
│   │   ├── index.part04.css
│   │   └── index.part05.css
│   ├── test/
│   │   ├── setup.ts
│   │   └── smoke.test.ts
│   ├── types/
│   │   └── index.ts
│   ├── api.test.ts
│   ├── api.ts
│   ├── App.tsx
│   ├── i18n.test.ts
│   ├── i18n.ts
│   ├── index.css
│   ├── main.tsx
│   ├── ThemeContext.tsx
│   └── vite-env.d.ts
├── templates/
│   └── AGENTS-empire.md
├── tests/
│   └── e2e/
│       ├── ci-api-ops-and-docs.spec.ts
│       ├── ci-coverage-gap.spec.ts
│       ├── ci-docs-and-ops.spec.ts
│       ├── ci-manual-assignment.spec.ts
│       ├── ci-public-api-surface.spec.ts
│       └── smoke.spec.ts
├── tools/
│   ├── playwright-mcp/
│   ├── ppt_team_agent/
│   └── taste-skill/
│       ├── README.upstream.md
│       └── skill.md
├── .env.example
├── AGENTS.md
├── claw-empire.sqlite
├── claw-empire.sqlite-shm
├── claw-empire.sqlite-wal
├── CONTRIBUTING.md
├── eslint.config.mjs
├── index.html
├── install.ps1
├── install.sh
├── LICENSE
├── package.json
├── playwright.config.ts
├── README_jp.md
├── README_ko.md
├── README_zh.md
├── README.md
├── SECURITY.md
├── tsconfig.app.json
├── tsconfig.app.tsbuildinfo
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.node.tsbuildinfo
├── vite.config.ts
└── vitest.config.ts
```

## Key Files
- package.json (5864 bytes)
- tsconfig.json (107 bytes)
- vite.config.ts (2703 bytes)
- .env.example (2102 bytes)
- src/ (186 files)
- server/ (216 files)

## README (first 20 lines)
<p align="center">
  <img src="public/claw-empire.svg" width="80" alt="Claw-Empire" />
</p>

<h1 align="center">Claw-Empire</h1>

<p align="center">
  <strong>Command Your AI Agent Empire from the CEO Desk</strong><br>
  A local-first AI agent office simulator that orchestrates <b>CLI</b>, <b>OAuth</b>, and <b>API-connected</b> providers (including <b>Claude Code</b>, <b>Codex CLI</b>, <b>Gemini CLI</b>, <b>OpenCode</b>, <b>GitHub Copilot</b>, and <b>Antigravity</b>) as a virtual company of autonomous agents.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.3-blue" alt="Releases" />
  <a href="https://github.com/GreenSheep01201/claw-empire/actions/workflows/ci.yml"><img src="https://github.com/GreenSheep01201/claw-empire/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node.js 22+" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-orange" alt="License" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/badge/AI-Claude%20%7C%20Codex%20%7C%20Gemini%20%7C%20OpenCode%20%7C%20Copilot%20%7C%20Antigravity-purple" alt="AI Agents" />
</p>

