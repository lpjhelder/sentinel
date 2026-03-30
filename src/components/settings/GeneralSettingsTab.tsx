import type { CliProvider } from "../../types";
import type { LocalSettings, SetLocalSettings, TFunction } from "./types";

interface GeneralSettingsTabProps {
  t: TFunction;
  form: LocalSettings;
  setForm: SetLocalSettings;
  saved: boolean;
  onSave: () => void;
}

interface ToggleSettingCardProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  title?: string;
}

function ToggleSettingCard({ label, checked, onToggle, title }: ToggleSettingCardProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 sm:px-4"
      style={{ borderColor: "var(--th-card-border)", background: "var(--th-input-bg)" }}
    >
      <label className="text-sm" style={{ color: "var(--th-text-secondary)" }}>
        {label}
      </label>
      <button
        type="button"
        aria-pressed={checked}
        aria-label={label}
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-blue-500" : "bg-slate-600"}`}
        title={title}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function GeneralSettingsTab({ t, form, setForm, saved, onSave }: GeneralSettingsTabProps) {
  return (
    <>
      <section
        className="rounded-xl p-5 sm:p-6 space-y-5"
        style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-primary)" }}>
          {t({ ko: "회사 정보", en: "Company", ja: "会社情報", zh: "公司信息", pt: "Empresa" })}
        </h3>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({ ko: "회사명", en: "Company Name", ja: "会社名", zh: "公司名称", pt: "Nome da Empresa" })}
          </label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({ ko: "CEO 이름", en: "CEO Name", ja: "CEO 名", zh: "CEO 名称", pt: "Nome do CEO" })}
          </label>
          <input
            type="text"
            value={form.ceoName}
            onChange={(e) => setForm({ ...form, ceoName: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({ ko: "에이전트 디렉토리", en: "Agents Directory", ja: "エージェントディレクトリ", zh: "代理目录", pt: "Diretório de Agentes" })}
          </label>
          <input
            type="text"
            value={form.agentsDir ?? ""}
            onChange={(e) => setForm({ ...form, agentsDir: e.target.value })}
            placeholder="~/.claude/agents/"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--th-text-secondary)", opacity: 0.7 }}>
            {t({
              ko: "우선순위: ENV AGENTS_DIR > 이 설정 > ~/.claude/agents/",
              en: "Priority: ENV AGENTS_DIR > this setting > ~/.claude/agents/",
              ja: "優先順位: ENV AGENTS_DIR > この設定 > ~/.claude/agents/",
              zh: "优先级: ENV AGENTS_DIR > 此设置 > ~/.claude/agents/",
              pt: "Prioridade: ENV AGENTS_DIR > esta config > ~/.claude/agents/",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToggleSettingCard
            label={t({ ko: "자동 배정", en: "Auto Assign", ja: "自動割り当て", zh: "自动分配", pt: "Atribuição Automática" })}
            checked={form.autoAssign}
            onToggle={() => setForm({ ...form, autoAssign: !form.autoAssign })}
            title={t({
              ko: "서버 시작 시 인증된 CLI 프로바이더가 없는 에이전트에 기본 프로바이더를 자동 할당합니다. 추천: ON",
              en: "On startup, auto-assigns the default CLI provider to agents that have none configured. Recommended: ON",
              ja: "起動時、CLIプロバイダ未設定のエージェントにデフォルトプロバイダを自動割り当てします。推奨: ON",
              zh: "启动时，自动将默认CLI提供方分配给未配置的代理。推荐: 开启",
              pt: "Na inicialização, atribui automaticamente o provedor CLI padrão aos agentes sem provedor configurado. Recomendado: ON",
            })}
          />

          <ToggleSettingCard
            label={t({ ko: "YOLO 모드", en: "YOLO Mode", ja: "YOLO モード", zh: "YOLO 模式", pt: "Modo YOLO" })}
            checked={form.yoloMode === true}
            onToggle={() => setForm({ ...form, yoloMode: !(form.yoloMode === true) })}
            title={t({
              ko: "켜면 리뷰/기획 결정을 자동 승인합니다 (사람 확인 없이). 빠르지만 위험. 추천: OFF (프로덕션), ON (프로토타입)",
              en: "Auto-approves review meetings and planning decisions without human confirmation. Faster but risky. Recommended: OFF (production), ON (prototyping)",
              ja: "レビューや企画の決定を人間の確認なしに自動承認します。速いがリスクあり。推奨: OFF（本番）、ON（試作）",
              zh: "自动批准审查和规划决策，无需人工确认。更快但有风险。推荐: 关闭（生产），开启（原型）",
              pt: "Aprova automaticamente reuniões de review e decisões de planejamento sem confirmação humana. Mais rápido mas arriscado. Recomendado: OFF (produção), ON (prototipagem)",
            })}
          />

          <ToggleSettingCard
            label={t({
              ko: "자동 업데이트 (전역)",
              en: "Auto Update (Global)",
              ja: "Auto Update（全体）",
              zh: "自动更新（全局）",
              pt: "Atualização Automática (Global)",
            })}
            checked={form.autoUpdateEnabled}
            onToggle={() => setForm({ ...form, autoUpdateEnabled: !form.autoUpdateEnabled })}
            title={t({
              ko: "GitHub에서 새 버전을 자동으로 확인합니다. OFF면 수동으로만 업데이트. 추천: OFF (안정성 우선)",
              en: "Periodically checks GitHub for new Sentinel versions. OFF means manual updates only. Recommended: OFF (stability first)",
              ja: "GitHubから新バージョンを定期的にチェックします。OFFは手動更新のみ。推奨: OFF（安定性優先）",
              zh: "定期检查GitHub上的新版本。关闭时仅手动更新。推荐: 关闭（稳定性优先）",
              pt: "Verifica periodicamente no GitHub se há novas versões do Sentinel. OFF = só atualização manual. Recomendado: OFF (estabilidade primeiro)",
            })}
          />

          <ToggleSettingCard
            label={t({ ko: "OAuth 자동 스왑", en: "OAuth Auto Swap", ja: "OAuth 自動スワップ", zh: "OAuth 自动切换", pt: "Troca Automática OAuth" })}
            checked={form.oauthAutoSwap !== false}
            onToggle={() => setForm({ ...form, oauthAutoSwap: !(form.oauthAutoSwap !== false) })}
            title={t({
              ko: "OAuth 인증 실패/한도 초과 시 다음 계정으로 자동 전환 (라운드 로빈). 여러 계정이 있을 때 유용. 추천: ON",
              en: "When an OAuth account hits rate limits or fails, automatically rotates to the next one (round-robin). Useful with multiple accounts. Recommended: ON",
              ja: "OAuthアカウントのレート制限/失敗時に次のアカウントへ自動ローテーション。複数アカウント時に有用。推奨: ON",
              zh: "当OAuth账号达到速率限制或失败时，自动轮换到下一个账号。多账号时有用。推荐: 开启",
              pt: "Quando uma conta OAuth atinge limite de uso ou falha, alterna automaticamente para a próxima (round-robin). Útil com múltiplas contas. Recomendado: ON",
            })}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({
              ko: "기본 CLI 프로바이더",
              en: "Default CLI Provider",
              ja: "デフォルト CLI プロバイダ",
              zh: "默认 CLI 提供方",
              pt: "Provedor CLI Padrão",
            })}
          </label>
          <select
            value={form.defaultProvider}
            onChange={(e) => setForm({ ...form, defaultProvider: e.target.value as CliProvider })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          >
            <option value="claude">Claude Code</option>
            <option value="codex">Codex CLI</option>
            <option value="gemini">Gemini CLI</option>
            <option value="opencode">OpenCode</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--th-text-secondary)" }}>
            {t({ ko: "언어", en: "Language", ja: "言語", zh: "语言", pt: "Idioma" })}
          </label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value as LocalSettings["language"] })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            style={{
              background: "var(--th-input-bg)",
              borderColor: "var(--th-input-border)",
              color: "var(--th-text-primary)",
            }}
          >
            <option value="ko">{t({ ko: "한국어", en: "Korean", ja: "韓国語", zh: "韩语", pt: "Coreano" })}</option>
            <option value="en">{t({ ko: "영어", en: "English", ja: "英語", zh: "英语", pt: "Inglês" })}</option>
            <option value="ja">{t({ ko: "일본어", en: "Japanese", ja: "日本語", zh: "日语", pt: "Japonês" })}</option>
            <option value="zh">{t({ ko: "중국어", en: "Chinese", ja: "中国語", zh: "中文", pt: "Chinês" })}</option>
            <option value="pt">{t({ ko: "포르투갈어", en: "Portuguese", ja: "ポルトガル語", zh: "葡萄牙语", pt: "Português" })}</option>
          </select>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        {saved && (
          <span className="text-green-400 text-sm self-center">
            ✅ {t({ ko: "저장 완료", en: "Saved", ja: "保存完了", zh: "已保存", pt: "Salvo" })}
          </span>
        )}
        <button
          onClick={onSave}
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
        >
          {t({ ko: "저장", en: "Save", ja: "保存", zh: "保存", pt: "Salvar" })}
        </button>
      </div>
    </>
  );
}
