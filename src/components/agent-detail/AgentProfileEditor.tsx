import { useCallback, useEffect, useState } from "react";
import { getAgentDiskContent, saveAgentDisk } from "../../api/messaging-runtime-oauth";
import type { UiLanguage } from "../../i18n";

interface Props {
  agentName: string;
  t: (map: Record<string, string>) => string;
  language: UiLanguage;
}

type LoadState = "loading" | "loaded" | "not_found" | "error";

export default function AgentProfileEditor({ agentName, t }: Props) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const diskName = agentName.toLowerCase().replace(/\s+/g, "-");

  const load = useCallback(async () => {
    setLoadState("loading");
    setSaveMsg(null);
    try {
      const data = await getAgentDiskContent(diskName);
      setContent(data.content);
      setOriginalContent(data.content);
      setLoadState("loaded");
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes("404") || msg.includes("not_found")) {
        setContent("");
        setOriginalContent("");
        setLoadState("not_found");
      } else {
        setLoadState("error");
      }
    }
  }, [diskName]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = content !== originalContent;

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveAgentDisk(diskName, content);
      setOriginalContent(content);
      setSaveMsg({
        type: "ok",
        text: t({ ko: "저장됨", en: "Saved", ja: "保存済み", zh: "已保存", pt: "Salvo" }),
      });
      if (loadState === "not_found") setLoadState("loaded");
    } catch {
      setSaveMsg({
        type: "err",
        text: t({ ko: "저장 실패", en: "Save failed", ja: "保存失敗", zh: "保存失败", pt: "Erro ao salvar" }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setContent(originalContent);
    setSaveMsg(null);
  };

  if (loadState === "loading") {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400">
        {t({ ko: "로딩...", en: "Loading...", ja: "読み込み中...", zh: "加载中...", pt: "Carregando..." })}
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-2 py-4">
        <p className="text-sm text-red-400">
          {t({
            ko: "프로필 로드 실패",
            en: "Failed to load profile",
            ja: "プロファイル読み込み失敗",
            zh: "加载配置文件失败",
            pt: "Falha ao carregar perfil",
          })}
        </p>
        <button
          onClick={load}
          className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
        >
          {t({ ko: "재시도", en: "Retry", ja: "再試行", zh: "重试", pt: "Tentar novamente" })}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--th-input-bg)", color: "var(--th-text-secondary)" }}>
            {diskName}.md
          </span>
          {loadState === "not_found" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
              {t({ ko: "새 파일", en: "New file", ja: "新規ファイル", zh: "新文件", pt: "Novo arquivo" })}
            </span>
          )}
        </div>
        {saveMsg && (
          <span className={`text-[10px] ${saveMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
            {saveMsg.text}
          </span>
        )}
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSaveMsg(null);
        }}
        spellCheck={false}
        className="w-full font-mono text-xs leading-relaxed p-3 rounded-lg border resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
        style={{
          background: "var(--th-input-bg)",
          borderColor: "var(--th-input-border)",
          color: "var(--th-text-primary)",
          minHeight: "200px",
          maxHeight: "400px",
        }}
        placeholder={`---\nname: ${diskName}\ndescription: ...\ntools: Read, Write, Edit, Bash, Glob, Grep\n---\n\nAgent system prompt here...`}
      />

      {/* Hint */}
      <p className="text-[10px]" style={{ color: "var(--th-text-secondary)", opacity: 0.6 }}>
        {t({
          ko: "YAML 프론트매터 + 마크다운 프롬프트. Claude Code가 이 에이전트를 스폰할 때 사용됩니다.",
          en: "YAML frontmatter + markdown prompt. Used by Claude Code when spawning this agent.",
          ja: "YAMLフロントマター + マークダウンプロンプト。Claude Codeがこのエージェントをスポーンする際に使用されます。",
          zh: "YAML 前言 + Markdown 提示词。Claude Code 生成此代理时使用。",
          pt: "YAML frontmatter + prompt markdown. Usado pelo Claude Code ao spawnar este agente.",
        })}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || (!dirty && loadState !== "not_found")}
          className="px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: dirty || loadState === "not_found" ? "rgb(59 130 246)" : "var(--th-input-bg)",
            color: dirty || loadState === "not_found" ? "white" : "var(--th-text-secondary)",
          }}
        >
          {saving
            ? t({ ko: "저장 중...", en: "Saving...", ja: "保存中...", zh: "保存中...", pt: "Salvando..." })
            : loadState === "not_found"
              ? t({ ko: "파일 생성", en: "Create file", ja: "ファイル作成", zh: "创建文件", pt: "Criar arquivo" })
              : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存", pt: "Salvar" })}
        </button>
        {dirty && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs rounded transition-colors"
            style={{ background: "var(--th-input-bg)", color: "var(--th-text-secondary)" }}
          >
            {t({ ko: "되돌리기", en: "Discard", ja: "元に戻す", zh: "放弃", pt: "Descartar" })}
          </button>
        )}
        <button
          onClick={load}
          className="px-3 py-1.5 text-xs rounded transition-colors ml-auto"
          style={{ background: "var(--th-input-bg)", color: "var(--th-text-secondary)" }}
          title={t({ ko: "디스크에서 다시 로드", en: "Reload from disk", ja: "ディスクから再読み込み", zh: "从磁盘重新加载", pt: "Recarregar do disco" })}
        >
          {t({ ko: "새로고침", en: "Reload", ja: "再読み込み", zh: "刷新", pt: "Recarregar" })}
        </button>
      </div>
    </div>
  );
}
