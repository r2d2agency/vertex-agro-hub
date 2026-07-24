# Sprint 5 — Gestão + Sincronização Offline

Consolida a camada de governança da plataforma e prepara o contrato de dados que os apps de campo (Monitor/Consultor) usarão para operar sem conexão.

## Objetivos

1. **Auditoria** — trilha imutável de quem fez o quê, quando e onde.
2. **Logs de sistema** — visibilidade operacional (erros, jobs, sync).
3. **Sincronização offline** — endpoints de *pull*/*push* com resolução de conflitos por versão.
4. **Painel de sincronização** — monitoramento por dispositivo/usuário.
5. **Alertas & Integrações** — base para regras automáticas e webhooks (AGS).
6. **Configurações da empresa** — preferências gerais + política de retenção.

## Entregas por módulo

### 1. Auditoria (`/auditoria`)
- Tabela `audit_log` (actor, action, entity, entityId, companyId, diff JSON, ip, userAgent, createdAt).
- Interceptor NestJS grava CREATE/UPDATE/DELETE dos módulos operacionais e de pessoas.
- UI: filtros por usuário, entidade, período; export CSV.

### 2. Logs (`/logs`)
- Tabela `system_log` (level, source, message, meta, createdAt).
- Logger central no backend (substitui `console.*` nos serviços críticos).
- UI: filtros por nível/fonte, busca textual, paginação.

### 3. Sincronização
- **Contrato**: cada entidade sincronizável já tem `version`, `syncStatus`, `deviceId`, `isDeleted`, `updatedAt`.
- **Endpoints** (`/sync/*`):
  - `GET /sync/pull?companyId&since&entities` → devolve deltas por entidade.
  - `POST /sync/push` → recebe lote `{ entity, op, payload, clientVersion, deviceId }`, retorna resultado por item (ok / conflict / rejected) com a versão canônica.
  - Estratégia: *last-writer-wins* por default, `409 conflict` quando `clientVersion < serverVersion` → app decide merge.
- **Registro de sync**: tabela `sync_session` (deviceId, userId, startedAt, finishedAt, pulled, pushed, conflicts).

### 4. Painel de Sincronização (`/sincronizacao`)
- Cards de saúde: dispositivos ativos, última sync, itens pendentes, conflitos 24h.
- Lista de sessões recentes com drill-down por dispositivo.
- Ação: forçar re-sync (marca todos os registros da empresa como `syncStatus=stale` para o device).

### 5. Alertas (`/alertas` + `/alertas-ia`)
- Tabela `alert_rule` (companyId, kind, threshold, channel, active).
- Motor simples avaliado no cron: DRC fora da faixa, produção abaixo da média, ocorrência crítica aberta > X dias.
- UI: lista de regras + histórico de disparos. `/alertas-ia` continua placeholder para Sprint 6/7.

### 6. Integrações (`/integracoes`)
- Tabela `integration` (provider, config JSON, secret, active) + `webhook_delivery`.
- Suporte inicial: webhook genérico (POST JSON) disparado em eventos de produção/ocorrência.
- Placeholder configurável para AGS.

### 7. Configurações (`/configuracoes`)
- Preferências da empresa: fuso, unidade padrão (kg/L), política de retenção de fotos, moeda.
- Persistidas em `company_settings` (1:1 com Company).

## Detalhes técnicos

**Migration `20260804090000_governance`** cria: `audit_log`, `system_log`, `sync_session`, `alert_rule`, `alert_event`, `integration`, `webhook_delivery`, `company_settings`. Todas com `companyId` + índices por `(companyId, createdAt desc)` e GRANTs implícitos (Prisma → Postgres direto, sem RLS aqui pois autenticação é JWT no NestJS).

**Backend novos módulos**: `audit/`, `logs/`, `sync/`, `alerts/`, `integrations/`, `settings/`. Cada um com `controller + service + dto`, protegidos por `JwtAuthGuard` + `CompanyAccess`.

**Auditoria transversal**: `AuditInterceptor` global registrado em `AppModule` que lê metadata `@Audited('entity')` nos handlers de escrita — evita boilerplate em cada service.

**Frontend novos helpers**: `src/lib/{auditoria,logs,sync,alertas,integracoes,configuracoes}.functions.ts` seguindo o padrão `apiRequest`.

**Sidebar**: os itens já existem (Auditoria, Logs, Sincronização, Alertas, Integrações, Configurações) — substituem `ComingSoon` pelas telas reais.

## Fora do escopo (fica para Sprint 6/7)
- Assinatura digital dos logs de auditoria.
- IA de anomalias em `/alertas-ia`.
- App Monitor/Consultor consumindo o `/sync` (backend fica pronto, app é sprint futura).
- Integração AGS real — apenas conector genérico agora.

## Deploy
1. `bun install` no backend (sem novas deps além do que já existe).
2. Aplicar migration `20260804090000_governance`.
3. Rebuild sem cache no front e back no EasyPanel.

Confirma que sigo com essa entrega?
