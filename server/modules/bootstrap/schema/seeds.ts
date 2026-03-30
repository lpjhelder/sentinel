import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { seedDefaultWorkflowPacks } from "./workflow-pack-seeds.ts";

type DbLike = Pick<DatabaseSync, "exec" | "prepare">;

export function applyDefaultSeeds(db: DbLike): void {
  seedDefaultWorkflowPacks(db);

  const deptCount = (db.prepare("SELECT COUNT(*) as cnt FROM departments").get() as { cnt: number }).cnt;

  if (deptCount === 0) {
    const insertDept = db.prepare(
      "INSERT INTO departments (id, name, name_ko, name_ja, name_zh, name_pt, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    // Pipeline IA: Analyze → Generate → Evaluate → Humanize → Deliver
    insertDept.run("analyze", "Analyze", "분석팀", "分析チーム", "分析组", "Análise", "🧠", "#f59e0b", 1);
    insertDept.run("generate", "Generate", "생성팀", "生成チーム", "生成组", "Geração", "💻", "#3b82f6", 2);
    insertDept.run("evaluate", "Evaluate", "검증팀", "検証チーム", "验证组", "Avaliação", "🔍", "#ef4444", 3);
    insertDept.run("humanize", "Humanize", "사용자경험팀", "UXチーム", "用户体验组", "Humanização", "✨", "#8b5cf6", 4);
    insertDept.run("deliver", "Deliver", "배포팀", "デリバリーチーム", "交付组", "Entrega", "🚀", "#10b981", 5);
    console.log("[Sentinel] Seeded default departments");
  }

  const agentCount = (db.prepare("SELECT COUNT(*) as cnt FROM agents").get() as { cnt: number }).cnt;

  if (agentCount === 0) {
    const insertAgent = db.prepare(
      `INSERT INTO agents (id, name, name_ko, department_id, role, cli_provider, avatar_emoji, personality, sprite_number, agent_type, specialty, acts_as_planning_leader)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const defaultAgents: Array<{ name: string; department_id: string; role: string; avatar_emoji: string; specialty: string; personality: string; acts_as_planning_leader: number }> = [
      // ANALYZE (3) — Compreender o problema, projetar solução
      { name: 'Architect', department_id: 'analyze', role: 'team_leader', avatar_emoji: '\u{1F3D7}\u{FE0F}', specialty: 'architecture', personality: 'Tech Lead e Arquiteto de Software. Analisa design, define padroes, avalia trade-offs.', acts_as_planning_leader: 1 },
      { name: 'API Designer', department_id: 'analyze', role: 'team_leader', avatar_emoji: '\u{1F50C}', specialty: 'api-design', personality: 'API Designer senior. REST/GraphQL, OpenAPI, versionamento.', acts_as_planning_leader: 0 },
      { name: 'Reviewer', department_id: 'analyze', role: 'team_leader', avatar_emoji: '\u{1F50D}', specialty: 'review', personality: 'Code Reviewer senior. Revisa qualidade, seguranca e consistencia.', acts_as_planning_leader: 0 },
      // GENERATE (3) — Produzir código/artefatos
      { name: 'Developer', department_id: 'generate', role: 'team_leader', avatar_emoji: '\u{1F468}\u{200D}\u{1F4BB}', specialty: 'fullstack', personality: 'Dev Full-Stack senior. Implementa features, corrige bugs, escreve codigo limpo.', acts_as_planning_leader: 0 },
      { name: 'DBA', department_id: 'generate', role: 'team_leader', avatar_emoji: '\u{1F5C4}\u{FE0F}', specialty: 'database', personality: 'Database Engineer senior. Modelagem, queries, indexes, migrations.', acts_as_planning_leader: 0 },
      { name: 'Mobile', department_id: 'generate', role: 'team_leader', avatar_emoji: '\u{1F4F1}', specialty: 'mobile', personality: 'Mobile Specialist. React Native, offline-first, push.', acts_as_planning_leader: 0 },
      // EVALUATE (3) — Validar qualidade e segurança
      { name: 'Tester', department_id: 'evaluate', role: 'team_leader', avatar_emoji: '\u{1F9EA}', specialty: 'testing', personality: 'QA Engineer senior. Escreve testes unitarios, integracao e e2e.', acts_as_planning_leader: 0 },
      { name: 'Security', department_id: 'evaluate', role: 'team_leader', avatar_emoji: '\u{1F6E1}\u{FE0F}', specialty: 'security', personality: 'Security Engineer. OWASP Top 10, pentest, hardening.', acts_as_planning_leader: 0 },
      { name: 'Performance', department_id: 'evaluate', role: 'team_leader', avatar_emoji: '\u{26A1}', specialty: 'performance', personality: 'Performance Engineer. Profiling, load testing, otimizacao.', acts_as_planning_leader: 0 },
      // HUMANIZE (3) — Otimizar pra humanos
      { name: 'UX Writer', department_id: 'humanize', role: 'team_leader', avatar_emoji: '\u{270D}\u{FE0F}', specialty: 'ux-writing', personality: 'UX Writer senior. Microcopy, mensagens de erro, tom de voz.', acts_as_planning_leader: 0 },
      { name: 'Accessibility', department_id: 'humanize', role: 'team_leader', avatar_emoji: '\u{267F}', specialty: 'accessibility', personality: 'Accessibility Engineer. WCAG 2.1, ARIA, contraste.', acts_as_planning_leader: 0 },
      { name: 'i18n', department_id: 'humanize', role: 'team_leader', avatar_emoji: '\u{1F310}', specialty: 'internationalization', personality: 'i18n Engineer. Traducao, locale, formatacao.', acts_as_planning_leader: 0 },
      // DELIVER (4) — Entregar e observar
      { name: 'DevOps', department_id: 'deliver', role: 'team_leader', avatar_emoji: '\u{2699}\u{FE0F}', specialty: 'infrastructure', personality: 'DevOps/SRE Engineer. CI/CD, Docker, deploy, monitoramento.', acts_as_planning_leader: 0 },
      { name: 'Monitoring', department_id: 'deliver', role: 'team_leader', avatar_emoji: '\u{1F4CA}', specialty: 'observability', personality: 'Observability Engineer. Logs, metricas, alertas, tracing.', acts_as_planning_leader: 0 },
      { name: 'Release Manager', department_id: 'deliver', role: 'team_leader', avatar_emoji: '\u{1F3F7}\u{FE0F}', specialty: 'release', personality: 'Git/Release Manager. Branching, versioning, changelogs.', acts_as_planning_leader: 0 },
      { name: 'Docs', department_id: 'deliver', role: 'team_leader', avatar_emoji: '\u{1F4DD}', specialty: 'documentation', personality: 'Technical Writer. API docs, README, onboarding, ADRs.', acts_as_planning_leader: 0 },
    ];

    defaultAgents.forEach((agent, index) => {
      insertAgent.run(
        randomUUID(),
        agent.name,
        '',
        agent.department_id,
        agent.role,
        'claude',
        agent.avatar_emoji,
        agent.personality,
        index + 1,
        'lead_senior',
        agent.specialty,
        agent.acts_as_planning_leader,
      );
    });
    console.log("[Sentinel] Seeded 16 Lead Senior agents");
  }

  // Seed default settings if none exist
  {
    const defaultRoomThemes = {
      ceoOffice: { accent: 0xa77d0c, floor1: 0xe5d9b9, floor2: 0xdfd0a8, wall: 0x998243 },
      analyze: { accent: 0xd4a85a, floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871 },
      generate: { accent: 0x5a9fd4, floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7 },
      evaluate: { accent: 0xd46a6a, floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979 },
      humanize: { accent: 0x9a6fc4, floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad },
      deliver: { accent: 0x5ac48a, floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89 },
      breakRoom: { accent: 0xf0c878, floor1: 0xf7e2b7, floor2: 0xf6dead, wall: 0xa99c83 },
    };

    const settingsCount = (db.prepare("SELECT COUNT(*) as c FROM settings").get() as { c: number }).c;
    const isLegacySettingsInstall = settingsCount > 0;
    if (settingsCount === 0) {
      const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
      insertSetting.run("companyName", "Sentinel");
      insertSetting.run("ceoName", "CEO");
      insertSetting.run("autoAssign", "true");
      insertSetting.run("yoloMode", "false");
      insertSetting.run("autoUpdateEnabled", "false");
      insertSetting.run("autoUpdateNoticePending", "false");
      insertSetting.run("oauthAutoSwap", "true");
      insertSetting.run("language", "en");
      insertSetting.run("defaultProvider", "claude");
      insertSetting.run(
        "providerModelConfig",
        JSON.stringify({
          claude: { model: "claude-opus-4-6", subModel: "claude-sonnet-4-6" },
          codex: {
            model: "gpt-5.3-codex",
            reasoningLevel: "xhigh",
            subModel: "gpt-5.3-codex",
            subModelReasoningLevel: "high",
          },
          gemini: { model: "gemini-3-pro-preview" },
          opencode: { model: "github-copilot/claude-sonnet-4.6" },
          copilot: { model: "github-copilot/claude-sonnet-4.6" },
          antigravity: { model: "google/antigravity-gemini-3-pro" },
        }),
      );
      insertSetting.run("roomThemes", JSON.stringify(defaultRoomThemes));
      console.log("[Sentinel] Seeded default settings");
    }

    const hasLanguageSetting = db.prepare("SELECT 1 FROM settings WHERE key = 'language' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (!hasLanguageSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("language", "en");
    }

    const hasOAuthAutoSwapSetting = db.prepare("SELECT 1 FROM settings WHERE key = 'oauthAutoSwap' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (!hasOAuthAutoSwapSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("oauthAutoSwap", "true");
    }

    const hasAutoUpdateEnabledSetting = db
      .prepare("SELECT 1 FROM settings WHERE key = 'autoUpdateEnabled' LIMIT 1")
      .get() as { 1: number } | undefined;
    if (!hasAutoUpdateEnabledSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("autoUpdateEnabled", "false");
    }

    const hasYoloModeSetting = db.prepare("SELECT 1 FROM settings WHERE key = 'yoloMode' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (!hasYoloModeSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("yoloMode", "false");
    }

    const hasAutoUpdateNoticePendingSetting = db
      .prepare("SELECT 1 FROM settings WHERE key = 'autoUpdateNoticePending' LIMIT 1")
      .get() as { 1: number } | undefined;
    if (!hasAutoUpdateNoticePendingSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
        "autoUpdateNoticePending",
        isLegacySettingsInstall ? "true" : "false",
      );
    }

    const hasRoomThemesSetting = db.prepare("SELECT 1 FROM settings WHERE key = 'roomThemes' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (!hasRoomThemesSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
        "roomThemes",
        JSON.stringify(defaultRoomThemes),
      );
    }
  }

  // Migrate: add sort_order column & set correct ordering for existing DBs
  {
    try {
      db.exec("ALTER TABLE agents ADD COLUMN acts_as_planning_leader INTEGER NOT NULL DEFAULT 0");
    } catch {
      /* already exists */
    }
    try {
      db.exec(`
        UPDATE agents
        SET acts_as_planning_leader = CASE
          WHEN role = 'team_leader' AND department_id = 'planning' THEN 1
          ELSE COALESCE(acts_as_planning_leader, 0)
        END
      `);
    } catch {
      /* best effort */
    }

    try {
      db.exec("ALTER TABLE departments ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 99");
    } catch {
      /* already exists */
    }

    // UNIQUE 인덱스 일시 제거 → 값 갱신 → 인덱스 재생성 (충돌 방지)
    try {
      db.exec("DROP INDEX IF EXISTS idx_departments_sort_order");
    } catch {
      /* noop */
    }
    const DEPT_ORDER: Record<string, number> = { analyze: 1, generate: 2, evaluate: 3, humanize: 4, deliver: 5 };

    const insertDeptIfMissing = db.prepare(
      "INSERT OR IGNORE INTO departments (id, name, name_ko, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    );
    insertDeptIfMissing.run("analyze", "Analyze", "분석팀", "🧠", "#f59e0b", 1);
    insertDeptIfMissing.run("generate", "Generate", "생성팀", "💻", "#3b82f6", 2);
    insertDeptIfMissing.run("evaluate", "Evaluate", "검증팀", "🔍", "#ef4444", 3);
    insertDeptIfMissing.run("humanize", "Humanize", "사용자경험팀", "✨", "#8b5cf6", 4);
    insertDeptIfMissing.run("deliver", "Deliver", "배포팀", "🚀", "#10b981", 5);

    const updateOrder = db.prepare("UPDATE departments SET sort_order = ? WHERE id = ?");
    for (const [id, order] of Object.entries(DEPT_ORDER)) {
      updateOrder.run(order, id);
    }

    const allDepartments = db
      .prepare("SELECT id, sort_order FROM departments ORDER BY sort_order ASC, id ASC")
      .all() as Array<{ id: string; sort_order: number }>;
    const existingDeptIds = new Set(allDepartments.map((row) => row.id));
    const usedOrders = new Set<number>();
    for (const [id, order] of Object.entries(DEPT_ORDER)) {
      if (!existingDeptIds.has(id)) continue;
      usedOrders.add(order);
    }

    let nextOrder = 1;
    for (const row of allDepartments) {
      if (Object.prototype.hasOwnProperty.call(DEPT_ORDER, row.id)) continue;
      while (usedOrders.has(nextOrder)) nextOrder += 1;
      updateOrder.run(nextOrder, row.id);
      usedOrders.add(nextOrder);
      nextOrder += 1;
    }

    try {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_sort_order ON departments(sort_order)");
    } catch (err) {
      console.warn("[Sentinel] Failed to recreate idx_departments_sort_order:", err);
    }

    const insertAgentIfMissing = db.prepare(
      `INSERT OR IGNORE INTO agents (id, name, name_ko, department_id, role, cli_provider, avatar_emoji, personality)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    // Check which agents exist by name to avoid duplicates
    const existingNames = new Set(
      (db.prepare("SELECT name FROM agents").all() as { name: string }[]).map((r) => r.name),
    );

    const newAgents: [string, string, string, string, string, string, string][] = [
      // [name, name_ko, dept, role, provider, emoji, personality]
      ["Architect", "", "analyze", "team_leader", "claude", "\u{1F3D7}\u{FE0F}", "Tech Lead e Arquiteto de Software"],
      ["API Designer", "", "analyze", "team_leader", "claude", "\u{1F50C}", "API Designer senior"],
      ["Reviewer", "", "analyze", "team_leader", "claude", "\u{1F50D}", "Code Reviewer senior"],
      ["Developer", "", "generate", "team_leader", "claude", "\u{1F468}\u{200D}\u{1F4BB}", "Dev Full-Stack senior"],
      ["DBA", "", "generate", "team_leader", "claude", "\u{1F5C4}\u{FE0F}", "Database Engineer senior"],
      ["Mobile", "", "generate", "team_leader", "claude", "\u{1F4F1}", "Mobile Specialist"],
      ["Tester", "", "evaluate", "team_leader", "claude", "\u{1F9EA}", "QA Engineer senior"],
      ["Security", "", "evaluate", "team_leader", "claude", "\u{1F6E1}\u{FE0F}", "Security Engineer"],
      ["Performance", "", "evaluate", "team_leader", "claude", "\u{26A1}", "Performance Engineer"],
      ["UX Writer", "", "humanize", "team_leader", "claude", "\u{270D}\u{FE0F}", "UX Writer senior"],
      ["Accessibility", "", "humanize", "team_leader", "claude", "\u{267F}", "Accessibility Engineer"],
      ["i18n", "", "humanize", "team_leader", "claude", "\u{1F310}", "i18n Engineer"],
      ["DevOps", "", "deliver", "team_leader", "claude", "\u{2699}\u{FE0F}", "DevOps/SRE Engineer"],
      ["Monitoring", "", "deliver", "team_leader", "claude", "\u{1F4CA}", "Observability Engineer"],
      ["Release Manager", "", "deliver", "team_leader", "claude", "\u{1F3F7}\u{FE0F}", "Git/Release Manager"],
      ["Docs", "", "deliver", "team_leader", "claude", "\u{1F4DD}", "Technical Writer"],
    ];

    let added = 0;
    for (const [name, nameKo, dept, role, provider, emoji, personality] of newAgents) {
      if (!existingNames.has(name)) {
        if (!existingDeptIds.has(dept)) {
          console.warn(`[Sentinel] Skip adding agent "${name}": missing department "${dept}"`);
          continue;
        }
        try {
          insertAgentIfMissing.run(randomUUID(), name, nameKo, dept, role, provider, emoji, personality);
          added++;
        } catch (err) {
          console.warn(`[Sentinel] Skip adding agent "${name}":`, err);
        }
      }
    }
    if (added > 0) console.log(`[Sentinel] Added ${added} new Lead Senior agents`);
  }
}
