# Sentinel — Auditoria de Codigo Nao Utilizado

**Data:** 2026-03-30
**Projeto:** Sentinel v2.0.4 (`E:\claude\claw-empire-test\`)
**Metodo:** Analise estatica automatizada (knip, depcheck, grep manual, AST traversal)
**Modificacoes feitas:** ZERO — somente diagnostico

---

## RESUMO EXECUTIVO

| Categoria | Automatizavel | Revisao Manual | Requer Decisao | Total |
|-----------|:---:|:---:|:---:|:---:|
| Deps nao usadas | 4 | 1 | 2 | 7 |
| Deps misclassificadas | 3 | 0 | 0 | 3 |
| Dead code (modulos/tipos) | 3 | 7 | 1 | 11 |
| Exports desnecessarios | 8+ | 9+ | 0 | 17+ |
| Rotas/endpoints mortos | 0 | 3 | 2 | 5 |
| Assets orfaos | 3 | 0 | 0 | 3 |
| Scripts obsoletos/quebrados | 2 | 4 | 0 | 6 |
| Configs/refs quebradas | 3 | 0 | 0 | 3 |
| Duplicacao de codigo | 2 | 0 | 0 | 2 |
| **TOTAL** | **28+** | **24+** | **5** | **57+** |

---

## CRITICO — Bugs Ativos (referencias quebradas)

Estes itens NAO sao apenas dead code — causam **falhas em runtime**:

| # | Item | Arquivo | Problema |
|---|------|---------|----------|
| 1 | `setup.mjs` ref quebrada | `scripts/setup.mjs:20` | Referencia `templates/AGENTS-empire.md` mas arquivo e `AGENTS-sentinel.md`. `pnpm setup` vai crashar. |
| 2 | `run-sentinel-dev-local.cmd` | `scripts/run-sentinel-dev-local.cmd:10` | Referencia `kill-sentinel-dev.ps1` mas arquivo e `kill-claw-empire-dev.ps1`. Launcher Windows falha. |
| 3 | Favicon 404 | `index.html:7` | Referencia `/sentinel.svg` que NAO existe em `public/`. Todo page load da 404 no favicon. |

**Causa raiz:** Rename incompleto de "Claw Empire" para "Sentinel".

---

## VERDE — Automatizavel (pode remover com tooling)

### Dependencies nao usadas (safe to remove)

| Package | Tipo | Confianca | Impacto |
|---------|------|-----------|---------|
| `lucide-react` | dependency | 95% | ~5 MB — zero imports em src/ |
| `react-router-dom` | dependency | 95% | ~1-2 MB — zero imports, chunk vazio no bundle |
| `zod` | dependency | 98% | ~0.5 MB — zero imports em todo codebase |
| `autoprefixer` | devDependency | 90% | ~0.3 MB — sem postcss.config, Tailwind v4 nao usa |
| `msw` | devDependency | 95% | ~2-3 MB — Mock Service Worker nunca configurado |
| `postcss` | devDependency | 85% | ~0.2 MB — pode ser peer dep, testar remocao |

### Dependencies misclassificadas

| Package | Atual | Deveria ser | Motivo |
|---------|-------|-------------|--------|
| `sharp` | devDependency | **dependency** | Importado em `server/modules/routes/core/agents/sprites.ts` (codigo de producao). `pnpm install --prod` vai quebrar o endpoint de sprites. |
| `pptxgenjs` | dependency | **devDependency** | So usado em scripts utilitarios, nunca em src/ ou server/. Esta gerando chunk no bundle frontend sem necessidade. |
| `remotion` + `@remotion/cli` | dependency | **devDependency** | Nunca importado em codigo — so usado em scripts e textos de guidance. |

### Assets orfaos

| Asset | Motivo |
|-------|--------|
| `public/claw-empire.png` | Zero referencias — branding antigo |
| `public/claw-empire.svg` | Zero referencias — branding antigo |
| `public/climpire.svg` | Zero referencias — variante abandonada |

### Dead code (alta confianca)

| Item | Arquivo | Motivo |
|------|---------|--------|
| `office-pack-sync.ts` | `src/components/agent-manager/office-pack-sync.ts` | So importado pelo proprio teste. Nunca usado em producao. Feature abandonada? |
| `CliModelsResponse` type | `src/types/index.ts:358` | Exportado mas nunca importado |
| `ChannelRuntimeSession` type | `src/components/settings/types.ts:149` | Exportado mas nunca importado |
| `ChannelDraftSession` type | `src/components/settings/types.ts:157` | Exportado mas nunca importado |

---

## AMARELO — Revisao Manual Necessaria

### Rotas/endpoints possivelmente mortos

| Endpoint | Arquivo | Evidencia | Confianca |
|----------|---------|-----------|-----------|
| `GET /api/update-auto-status` | `server/modules/routes/core/update-auto/register.ts:405` | So referenciado em spec de e2e test | HIGH |
| `POST /api/update-apply` | `server/modules/routes/core/update-auto/register.ts:474` | So referenciado em spec de e2e test | HIGH |
| `POST /api/agents/:id/spawn` | `server/modules/routes/core/agents/spawn.ts:37` | Nunca chamado via HTTP client. Pode ser dispatch interno. | MEDIUM |
| `GET /api/hooks/events` | `server/modules/routes/hooks.ts:79` | POST e chamado pelo hook shell, mas GET nunca | MEDIUM |
| `GET /api/meetings/status` | `server/modules/routes/hooks.ts:202` | POST meetings funciona, mas GET status nunca chamado | MEDIUM |

### Exports desnecessarios (nao mortos, mas redundantes)

| Item | Arquivo | Detalhe |
|------|---------|---------|
| `isRoomTheme` | `src/app/utils.ts:14` | So usado internamente no mesmo arquivo |
| `RANK_TIERS` | `src/components/dashboard/model.tsx:53` | So usado por `getRankTier()` no mesmo arquivo |
| 8 theme variants (`_LIGHT`/`_DARK`) | `src/components/office-view/themes-locale.ts:503-526` | So usados internamente por `applyOfficeThemeMode` |
| `normalizeSecret`, `normalizePathEnv` | `server/config/runtime.ts:52,58` | So usados internamente no mesmo arquivo |
| 9+ tipos em `src/types/index.ts` | `AgentType`, `RoomStatus`, `RoomType`, `HiringStatus`, etc. | Nunca importados diretamente, so usados inline |
| 7+ tipos em `src/api/*.ts` | `VerifyCommitVerdict`, `SkillLearnStatus`, `ApiProviderPreset`, etc. | Nunca importados, tipo inferido pelos consumers |

### Scripts obsoletos

| Script | Status | Motivo |
|--------|--------|--------|
| `scripts/generate-doro-sprites.mjs` | Sem caller automatizado | Sprites ja existem. Util pra regeneracao manual. |
| `scripts/convert-slides.mjs` | Sem caller automatizado | Utilitario one-time |
| `scripts/generate-intro-ppt.mjs` | Sem caller automatizado | Gera arquivo com data fixa de 2026-02-20 |
| `scripts/kill-claw-empire-dev.ps1` | Nome antigo | Funciona mas so e chamado pelo .cmd quebrado |
| Diretorio `slides/` inteiro | Sem trigger automatizado | Toolchain de apresentacao auto-contido |

### Submodulos vazios

| Submodulo | Motivo |
|-----------|--------|
| `tools/ppt_team_agent/` | Registrado em `.gitmodules` mas vazio. Referenciado em server code (com fallback). |
| `tools/playwright-mcp/` | Registrado em `.gitmodules` mas vazio. Referenciado em server code (com fallback). |

---

## VERMELHO — Requer Decisao de Produto

| Item | Questao |
|------|---------|
| `office-pack-sync.ts` | Feature abandonada ou em desenvolvimento? Se abandonada, remover modulo + teste. |
| `remotion` stack inteiro | O projeto vai usar geracao de video? Se nao, remover `remotion` + `@remotion/cli` + `ensure-remotion-runtime.mjs`. |
| Rotas `update-auto-*` | Feature de auto-update foi descontinuada? Se sim, remover rotas + handlers. |
| Diretorio `slides/` | Toolchain de apresentacao ainda e necessario? Se nao, remover + mover `pptxgenjs` pra devDep ou remover. |
| Submodulos vazios | Inicializar ou remover de `.gitmodules`? |

---

## DUPLICACAO DE CODIGO

| Item | Arquivos | Detalhe |
|------|----------|---------|
| `Locale` + `TFunction` type aliases | 5 arquivos: `agent-detail/constants.ts`, `dashboard/model.tsx`, `skills-library/model.tsx`, `taskboard/constants.ts`, `settings/types.ts` | Copy-paste identico. Definir uma vez e importar. |
| `ProjectMetaPayload` type | `src/app/types.ts:14` e `src/components/chat-panel/model.ts:13` | Definicao identica em 2 lugares. Deduplicar. |

---

## INCONSISTENCIAS DE NAMING (Rename incompleto)

O rename "Claw Empire" → "Sentinel" ficou incompleto em:

| Arquivo | Problema |
|---------|----------|
| `scripts/kill-claw-empire-dev.ps1` | Nome antigo |
| `scripts/run-sentinel-dev-local.cmd` | Ref `kill-sentinel-dev.ps1` inexistente |
| `scripts/setup.mjs` | Ref `AGENTS-empire.md` inexistente |
| `docker-compose.nas.yml` | Service name `agent-office` |
| `.env.nas` | Header diz "Agent Office" |
| `public/claw-empire.*`, `public/climpire.svg` | Assets com branding antigo |

---

## ESTIMATIVA DE IMPACTO

### Se limpar tudo que e VERDE (automatizavel):
- **node_modules:** -10-20 MB (deps removidas)
- **Bundle frontend:** menor (sem chunks vazios de react-router-dom, pptxgenjs)
- **3 bugs corrigidos** (refs quebradas do rename)
- **Codebase mais limpo** (assets orfaos, tipos mortos removidos)

### Se limpar VERDE + AMARELO:
- **~20 exports a menos** pra manter
- **~5 rotas a menos** no servidor
- **Scripts organizados** (remover/renomear obsoletos)

---

## PROXIMOS PASSOS SUGERIDOS

1. **URGENTE:** Corrigir os 3 bugs de referencia quebrada (rename incompleto)
2. **FACIL:** Remover deps nao usadas e reclassificar misclassificadas
3. **FACIL:** Deletar assets orfaos
4. **MEDIO:** Limpar dead code e exports desnecessarios
5. **DECISAO:** Resolver itens vermelhos com o time
6. **OPCIONAL:** Deduplicar tipos e limpar scripts
