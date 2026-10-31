# Plano: Suporte Offline Completo — Vertex Agro Hub

> Arquivo de acompanhamento. Atualizar a cada passo concluído.
> Última atualização: 2026-10-31

## Objetivo
Sistema deve funcionar 100% offline quando sem internet: login e sessão salvos localmente, registros de sangria (e demais fluxos do campo) salvos localmente e sincronizados quando online, com indicação de "versão offline".

## Estado atual (infra existente)
- [x] `src/lib/offline/{idb,queue,network,register-sw}.ts` — outbox queue, IDB, auto-flush on `online`
- [x] `public/sw.js` v2 — network-first HTML, cache-first assets, never cache `/api/*`
- [x] `src/lib/api.ts` — tokens em localStorage
- [x] `src/routes/campo/sincronizacao.tsx` e `_authenticated/sincronizacao.tsx`

## Gaps a fechar
- [ ] Login offline: cachear sessão/token no IDB; permitir login quando offline usando cache.
- [ ] Leitura offline de dados (fazendas, sangradores, talhões, tabelas, rotação): cachear GETs no IDB e servir do cache quando offline.
- [ ] Escrita offline: garantir que TODOS os fluxos do campo usem `enqueueMutation` em vez de chamada direta.
- [ ] Indicador visual "versão offline" persistente no app.
- [ ] Sincronização automática ao voltar online + status de pendências.
- [ ] Backend idempotência persistente (DB) para evitar duplicatas multi-instância.

## Fases
### Fase 1 — App de campo (sangria) offline end-to-end
- [x] Login cacheado (botão "Trabalhar offline" carrega sessão/tokens do localStorage e dados do IDB)
- [x] Dados cacheados (getFieldMe + listFieldTappers + listFieldTapperPlots + listFieldTappingTables + listFieldTapperTables)
- [x] Mutação enfileirada (submitTapping via submit/enqueueMutation)
- [x] Indicador offline (OfflineIndicator no root)
- [x] Auto-flush ao voltar online (já existia)

### Fase 2 — Demais fluxos do campo
- [x] Mutação enfileirada em todos os fluxos (submitStimulation, submitDelivery, submitOccurrence, submitEvaluation, submitCheckin, submitOperationLog, submitFuelMovement, submitChecklist, submitInventoryMovement) via `submit()`/`enqueueMutation`

### Fase 3 — Login offline robusto + sincronização + indicador global
- [x] Sincronização automática (installOfflineAutoFlush no root)
- [x] Indicador global (OfflineIndicator no root)
- [x] Backend idempotência em memória (instância única — cobre EasyPanel)
- [ ] Backend idempotência persistente em DB (multi-instância) — opcional, não bloqueante

## Histórico
| Data | Passo concluído |
| --- | --- |
| 2026-10-31 | Arquivo criado com plano offline. |