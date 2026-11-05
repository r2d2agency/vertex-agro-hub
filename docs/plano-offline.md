# Plano: Suporte Offline Completo — Vertex Agro Hub

> Arquivo de acompanhamento. Atualizar a cada passo concluído.
> Última atualização: 2026-11-05

## Objetivo
Sistema deve funcionar 100% offline quando sem internet: login e sessão salvos localmente, registros de sangria (e demais fluxos do campo) salvos localmente e sincronizados quando online, com indicação de "versão offline".

## Estado atual (infra existente)
- [x] `src/lib/offline/{idb,queue,network,register-sw}.ts` — outbox queue, IDB, auto-flush on `online`
- [x] `public/sw.js` v2 — network-first HTML, cache-first assets, never cache `/api/*`
- [x] `src/lib/api.ts` — tokens em localStorage
- [x] `src/routes/campo/sincronizacao.tsx` e `_authenticated/sincronizacao.tsx`
- O suporte implementado é principalmente para o app de campo; o painel administrativo ainda depende da API.
- O login offline é retomada de uma sessão já autenticada e dos dados previamente baixados; não valida senha nem cria sessão sem o servidor.
- O PWA inicia em `/campo`; a raiz `/` também direciona para o app de campo. Se não houver sessão salva, `/campo` redireciona para `/auth`. O Service Worker v15 prioriza o shell local em Cache Storage para navegações e não faz pedido de rede quando o navegador reporta offline; estando online, atualiza o shell em segundo plano. Se não houver cache correspondente, tenta rede e usa `/campo` (ou `/auth`) como fallback.
- A fila já aceita POST/PATCH/PUT/DELETE, mas anexos (fotos/áudios) continuam dependendo do upload online.

## Gaps a fechar
- [ ] Login offline: cachear sessão/token no IDB; permitir login quando offline usando cache.
- [ ] Leitura offline de dados (fazendas, sangradores, talhões, tabelas, rotação): cachear GETs no IDB e servir do cache quando offline.
- [ ] Escrita offline: garantir que TODOS os fluxos do campo usem `enqueueMutation` em vez de chamada direta.
- [ ] Indicador visual "versão offline" persistente no app.
- [ ] Sincronização automática ao voltar online + status de pendências.
- [ ] Backend idempotência persistente (DB) para evitar duplicatas multi-instância.

## Fases
### Fase 1 — App de campo (sangria) offline end-to-end
- [x] Retomar sessão cacheada (botão "Trabalhar offline" usa tokens salvos e dados do IDB; exige autenticação online prévia)
- [x] Dados cacheados (getFieldMe + listFieldTappers + listFieldTapperPlots + listFieldTappingTables + listFieldTapperTables)
- [x] Novo registro de sangria enfileirado via submit/enqueueMutation
- [x] Listas de sangrias e resumos com leitura do último cache disponível
- [x] Correção de sangria existente enfileirada como PATCH
- [x] Ação de preparação baixa tabelas/sequências de todos os sangradores/talhões atribuídos
- [x] Sangrias recentes (60 dias) reaproveitadas para consultas diárias offline
- [x] Definição da sequência inicial pode ser enfileirada offline e atualiza o cache local
- [x] Indicador offline (OfflineIndicator no root)
- [x] Auto-flush ao voltar online (já existia)
- [ ] Anexos offline: guardar localmente o arquivo e sincronizar upload antes/dependente da sangria.
- [ ] Refletir registros pendentes nas consultas offline para validação de duplicidade e resumo imediato.

### Fase 2 — Demais fluxos do campo
- [x] Mutação enfileirada em todos os fluxos (submitStimulation, submitDelivery, submitOccurrence, submitEvaluation, submitCheckin, submitOperationLog, submitFuelMovement, submitChecklist, submitInventoryMovement) via `submit()`/`enqueueMutation`
- [x] Cache de máquinas, implementos, operadores, tipos de operação e tanques para telas de campo
- [x] Início de operação de máquina fica localmente até a finalização quando não há rede; o registro completo então vai para a fila
- [x] Rotas de chuva, abastecimento, operação de máquina, checklist, estimulação e agenda incluídas no shell do Service Worker

### Fase 3 — Login offline robusto + sincronização + indicador global
- [x] Sincronização automática (installOfflineAutoFlush no root)
- [x] Indicador global (OfflineIndicator no root)
- [x] Backend idempotência em memória (instância única — cobre EasyPanel)
- [ ] Backend idempotência persistente em DB (multi-instância) — opcional, não bloqueante
- [ ] Login offline seguro por identidade: associar cache local a usuário e impedir mistura de dados ao trocar de conta.
- [ ] Mapear e implementar funcionamento offline dos módulos administrativos, fora do app de campo.

## Diagnóstico (2026-11-03)
- O código da API não permite identificar a causa exata do erro de login online sem a mensagem exibida ou logs do backend/configuração de `VITE_API_URL`.
- Antes, `login()` apagava os tokens locais antes da chamada online. A limpeza foi removida: falha de rede/credencial não destrói uma sessão já salva; novo token substitui a sessão apenas após login aceito.
- A tela de sangria consultava histórico e resumo diretamente, sem cache; agora essas leituras usam IndexedDB como fallback.
- A edição de sangria usava PATCH direto, mesmo offline; agora a correção entra na fila persistente e informa que aguarda confirmação do servidor.
- Para testar totalmente offline, é necessário abrir o app online antes, autenticar e visitar/sincronizar os dados de campo necessários. Service Worker e IndexedDB não conseguem recuperar dados que nunca foram baixados.
- Validação desta sessão: `npm run build` passou com Node 22. O `tsc --noEmit` não concluiu por erro sintático dentro de `node_modules/date-fns/isMatch.d.ts`; o ESLint falhou reportando CRLF/prettier em massa nos arquivos do workspace.
- Para preparar o aparelho: depois de publicar/abrir a atualização com internet, abrir **Campo → Sincronização → Baixar dados para uso offline**. O cache inclui sangrias dos últimos 60 dias, configurações e listas atuais; sem essa etapa, dados nunca visitados podem não estar disponíveis.
- Se a tela de erro ocorrer ao abrir Sangria, a aplicação agora apresenta `nome: mensagem` em **Detalhe técnico do erro** (ou mensagem de `getFieldMe` inline); enviar esse texto para localizar a exceção concreta.
- O Service Worker pré-carrega os chunks e assets do build do cliente via `offline-assets.json` (incluindo os módulos lazy das rotas de campo). Após publicar, abrir a nova versão online uma vez para instalar o worker e seus assets; depois disso, abrir Sangria offline não depende de já ter visitado a tela antes.
- Primeiro uso offline: com internet, abrir o app instalado, entrar online pelo menos uma vez e aguardar a tela carregar; em **Campo → Sincronização**, tocar **Baixar dados para uso offline**; depois fechar e reabrir o app conectado para receber atualizações do Service Worker. Só então ativar modo avião e testar. Para entrar offline, a conta precisa ter sido autenticada previamente; criar sessão ou validar credenciais novas requer internet. No iPhone, manter o app aberto alguns segundos após atualizar; no Android, fechar e reabrir depois da atualização.
- `/campo` é a entrada do PWA e da raiz; essa área protegida redireciona para `/auth` quando não há sessão local. O Service Worker retorna o shell em cache também quando o servidor responde com erro 5xx, não apenas quando a rede falha.
- O HTML/app shell é servido do Cache Storage antes de qualquer pedido de rede; as APIs continuam sendo chamadas e usam seus caches/fila IndexedDB próprios. Cache Storage (Service Worker) e IndexedDB são armazenamento local distinto.
- O painel administrativo e dados que não foram baixados não ficam disponíveis offline; o escopo offline implementado é o app de campo com cache e fila local.

## Histórico
| Data | Passo concluído |
| --- | --- |
| 2026-10-31 | Arquivo criado com plano offline. |
| 2026-11-03 | Diagnóstico dos fluxos de login/sangria; cache de histórico/resumo e fila PATCH de correção; preservação de sessão local em falha de login. |
| 2026-11-05 | PWA inicia em `/auth`, usa a tela de login como fallback offline e valida pré-cache dos arquivos críticos; documentado o fluxo necessário de primeira autenticação e preparação dos dados. |
| 2026-11-05 | Worker v12 passa a servir o shell em cache também para respostas 5xx, evitando exibir a página de indisponibilidade do servidor quando já há app local. |
| 2026-11-05 | Restaurada a navegação esperada: `/` e o ícone PWA abrem `/campo`; worker v13 prioriza o shell de `/campo` no fallback offline e mantém redirecionamento para `/auth` apenas sem sessão. |
| 2026-11-05 | Worker v14 retorna o shell cacheado de `/campo` para a raiz quando o host/proxy responde 404, além das falhas offline e HTTP 5xx. |
| 2026-11-05 | Worker v15 muda navegações para cache-first com atualização de rede em segundo plano; app shell já instalado abre sem aguardar internet. |