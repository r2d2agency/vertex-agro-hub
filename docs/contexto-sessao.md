# Contexto da Sessão - Vertex Agro Hub

> Fonte única para retomar o trabalho entre sessões. Atualizado automaticamente pelo assistente.

## Status atual
- **Objetivo:** Permitir escolher diretamente a data no histórico, sem depender só dos períodos predefinidos.
- **Última ação:** Reforçado o filtro "Escolher data": calendário com seleção de mês/ano, nome mais direto e contagem correta de dias no modo "Por sangrador".
- **Estado:** Alteração local; `git diff --check` passou. Type-check/build seguem bloqueados pela declaração local truncada de `date-fns/isMatch.d.ts` e pela versão do Node local incompatível com o bundler. PWA em cache pode exigir atualização forçada no aparelho para ver a mudança.
- **Branch:** main

## Lógica / Domínio
### Talhões
- **Tabelas envolvidas:** fazendas, talhões, tabelas (subdivisão A–E de cada talhão), sangradores/alocação, registros de sangria.
- **Campos relevantes:** fazenda_id, talhao_id, tabela (A–E), quantidade de plantas por tabela, sangrador_id, alocação, data, forma de sangria.
- **Regras/validações:**
  - Cada talhão possui 5 tabelas (A, B, C, D, E).
  - Sangrador é alocado a uma fazenda; ganha acesso aos talhões/tabelas da fazenda.
  - Cada sangrador sangra as 5 tabelas (A–E), independentemente do talhão; uma mesma tabela pode estar em talhões diferentes (ex.: Tabela E com 800 plantas no talhão 16 e 300 no talhão 15).
  - Cadastro da tabela informa a quantidade de plantas.
  - Ciclo diário por sangrador: seg=A, ter=B, qua=C, qui=D, sex=E, sab=A, dom=B, seg=C... (ordem fixa A,B,C,D,E).
  - Se um dia não for feito (ex.: chuva), no dia seguinte segue a tabela do dia; é permitido repor a tabela atrasada no mesmo dia se houver tempo.
  - App Monitor: seleciona fazenda → sangrador → exibe quantidade de árvores a sangrar e tabela sugerida do dia + quantidade sangrada hoje (baseado no cadastro da tabela).
  - Após selecionar a tabela, informa a forma: 6 opções em matriz 3x2:
    - Linha 1: Tabela completa, Adiantamento Completo, Reposição Completa
    - Linha 2: Meia Tabela, Meio Adiantamento, Meia Reposição
  - Cores: adiantamentos (completo e meio) uma cor; reposições (completa e meia) outra cor.
  - Monitor ativa a "ordem do dia"; uma vez ativada, a sugestão do dia aparece no dia seguinte.
- **Relacionamentos:** fazenda → talhões → tabelas(A–E); sangrador → fazenda (alocação); sangria → sangrador + tabela + data + forma.

### Outras tabelas
| Tabela | Campos relevantes | Observações |
| --- | --- | --- |
|  |  |  |

## Arquivos envolvidos
| Arquivo | Motivo da alteração/uso | Status |
| --- | --- | --- |
| `src/lib/api.ts` | Login mantém sessão local caso a tentativa online falhe | alterado |
| `src/lib/field.functions.ts` | Enfileira correção de registro existente como PATCH | alterado |
| `src/lib/sangrias.functions.ts` | Cache/fallback do histórico, tipos de auditoria e PATCH direto para correção | alterado |
| `src/routes/campo/sangria.tsx` | Envia a data operacional selecionada e avisa sobre registro retroativo | alterado |
| `src/routes/campo/index.tsx` | Mantém total previsto no período, calcula saldo realizado e exibe período/tarefa no resumo da home | alterado |
| `src/routes/campo/historico.tsx` | Mantém janela de 7 dias, mostra período/tarefa, permite corrigir e apresenta auditoria/retroatividade | alterado |
| `backend/src/field/field.service.ts` | Inclui auditoria e datas de entrada, além de rótulos claros para clima/chuva na linha do tempo | alterado |
| `backend/src/operations/operations.service.ts` | Retorna autoria da última edição e metadados do lançamento retroativo | alterado |
| `src/lib/ocorrencias.functions.ts` | Centraliza rótulos de chuva, intensidade, status e detecção de lançamento posterior | alterado |
| `src/routes/campo/chuva.tsx` | Valida milímetros/período, explica intensidade e avisa sobre data retroativa | alterado |
| `src/routes/_authenticated/ocorrencias.tsx` | Exibe valores de chuva, rótulos climáticos e indicador de lançamento posterior | alterado |
| `src/components/vertex/farm-detail-dialog.tsx` | Usa os mesmos rótulos e indicador de retroatividade no detalhe da fazenda | alterado |
| `src/routes/index.tsx` | Rota `/` redireciona para `/campo`; verificada no diagnóstico dos domínios | verificado, sem alteração |
| `src/lib/field.functions.ts` | Encaminha `allowDuplicate` da sangria à API e fila de sincronização | alterado |
| `src/lib/sangrias.functions.ts` | Aplica filtros de fazenda/talhão/data também ao resultado do cache offline | alterado |
| `src/lib/offline/prepare-field-data.ts` | Baixa dados de campo/frota e sequência para todos os atribuídos | novo |
| `src/lib/offline/cached-request.ts` | GET com cache IndexedDB e fallback offline | novo |
| `src/routes/campo/sincronizacao.tsx` | Ação de preparar dados offline | alterado |
| `src/routes/campo/operacao-maquina.tsx` | Início local e envio da operação ao finalizar offline | alterado |
| `src/routes/campo/chuva.tsx` | Mensagem explícita e tratamento de erro no salvamento | alterado |
| `src/routes/campo/abastecimento.tsx` | Cache de tanques e tratamento de erro no salvamento | alterado |
| `src/lib/frota.functions.ts` / `src/lib/frota-ops.functions.ts` | Cache de listas usadas nas operações de campo | alterado |
| `public/sw.js` | Atualiza cache do app, fallback offline/5xx e rotas de campo | alterado |
| `public/manifest.webmanifest` | Define `/campo` como entrada do PWA | alterado |
| `vite.config.ts` | Emite manifesto de assets do cliente para pré-cache offline | alterado |
| `src/routes/__root.tsx` | Exibe detalhe técnico no boundary para diagnosticar erro de render/rota | alterado |
| `docs/plano-offline.md` | Diagnóstico, escopo offline e pendências | alterado |

## Decisões tomadas
- Falha de login online sem mensagem/log não permite concluir se é URL, rede, credencial ou backend; não alterar configuração de API por suposição.
- Login offline significa retomar sessão previamente autenticada, não validar senha sem servidor.
- Foco de implementação desta sessão: telas de campo de sangria; disponibilidade offline dos módulos administrativos permanece fora do escopo já implementado.
- Antes de ficar offline, abrir Campo → Sincronização e usar "Baixar dados para uso offline"; a preparação percorre os sangradores/talhões atribuídos e listas da frota para popular o IndexedDB.
- Usuário relata que, mesmo após preparo de 1 fazenda, 12 sangradores e 16 talhões, abrir "Registrar sangria" exibe tela genérica de erro; a exceção original não estava visível. Nova versão mostra `name/message` em "Detalhe técnico do erro".
- A mensagem literal `Sem conexão` é o fallback de navegação do Service Worker. O build possui chunks separados para Sangria, chuva, abastecimento e operação de máquina; antes do ajuste, esses chunks só eram cacheados depois de serem visitados.
- Os avisos de sangria já realizada comparavam `tapperId === null` para identificadores sintéticos `rh:<userId>`, causando correspondência com qualquer registro sem vínculo legado. Agora a comparação usa o ID quando existe e recorre ao nome do sangrador nos registros legados sem ID.
- A preparação offline guarda sangrias recentes numa janela de 60 dias. O fallback offline validava que essa janela cobria a data pedida, mas devolvia todos os registros da janela sem filtrar o dia; assim, registros antigos podiam bloquear cada sangrador como se já tivesse sangrado hoje. Agora todos os resultados são limitados pelos filtros solicitados.
- A tela mantinha resultados de validação enquanto mudava sangrador, talhão, tarefa ou data, e requisições assíncronas antigas podiam sobrescrever a seleção atual. Agora o resultado só é exibido se sua chave ainda corresponder à seleção e callbacks obsoletos são ignorados.
- O shell do app usa Cache Storage do Service Worker (não o IndexedDB, que guarda dados de aplicação). Navegações servem primeiro essa cópia e, quando offline segundo `navigator.onLine`, não iniciam requisição de rede.
- O endereço confirmado pelo usuário é `vertex.gleego.com.br`; o domínio `vertex.gleeglo.com.br` foi apenas um erro de digitação. No teste de 2026-11-05, a raiz do domínio correto respondeu 307 para `/campo`, que respondeu 200. Não foi feita alteração de código nem de configuração externa.
- Na home, `Previstas` é o total fixo de dias/sangrador no período; `Saldo` é `Previstas - Realizadas`. A visão padrão segue os últimos 7 dias, como no histórico.
- O histórico de sangrias usa `taskExtent` para o nome da tarefa e `endPeriod` para manhã/tarde/noite; o endpoint da linha do tempo agora inclui `endPeriod` em `meta`.
- A correção de sangrias no histórico usa PATCH online direto: uma falha de conexão é informada e não é apresentada como sucesso até sincronizar. O servidor incrementa `version`, registra `updatedById`/`updatedAt` e a interface mostra nome e horário.
- A data operacional de uma sangria permanece separada de `recordedAt`; lançamentos em data posterior ficam agrupados pela data operacional e mostram quando foram efetivamente enviados. Registros legados com `recordedAt` à meia-noite UTC usam `createdAt` como fallback.
- Para clima/chuva, a interface usa “Chuva”, mostra milímetros e intensidade (baixa: <15 mm; média: 15–49,9 mm; alta: ≥50 mm) e traduz status “aberta” para “em aberto”. A marcação de lançamento posterior compara a data operacional com `createdAt` em `America/Sao_Paulo`.
- Para abrir sem rede, o aparelho precisa ter instalado o Service Worker e os chunks enquanto ainda estava online. O login offline retoma sessão anterior; não é possível validar credenciais novas sem o servidor. O app de campo depende de dados previamente baixados, e os módulos administrativos ainda exigem conexão.
- Uma página “Vertex temporariamente indisponível” não corresponde ao HTML do fallback local do worker; a versão v12 passou a tentar servir o shell cacheado também quando o servidor responde HTTP 5xx. A entrada esperada do app é `/campo`; a própria rota envia para `/auth` quando não há sessão.
- Se a raiz do host responder 404 enquanto `/campo` funciona, o worker usa o shell de `/campo` para a navegação raiz. Navegação agora é cache-first: deve servir primeiro o HTML já instalado, sem esperar por fetch online.

## Pendências / Próximos passos
- [x] Validar build após instalar as dependências locais ausentes (Node 22).
- [ ] Obter mensagem exata do erro de login online e logs correlatos para identificar causa de ambiente/backend.
- [ ] Obter detalhe técnico exibido ao abrir a rota de sangria offline e corrigir a causa específica.
- [x] Validar build do manifesto offline e conferir que todos os assets listados existem.
- [ ] Testar instalação/abertura da rota Sangria sem rede no aparelho após publicar.
- [ ] Testar registro offline de sangrias para múltiplos sangradores após publicar, incluindo repetição autorizada do mesmo contexto.
- [ ] Completar cache de dados locais pendentes para duplicidade/resumo e fila de upload de fotos/áudios.
- [ ] Associar cache offline à identidade do usuário para evitar mistura de dados ao alternar contas.
- [ ] Avaliar suporte offline dos módulos administrativos; hoje apenas o app de campo tem fila/cache parcial.
- [ ] Validar abertura offline em iOS e Android após instalar o Service Worker v11 e preparar dados.
- [ ] Revalidar builds do frontend e backend após restaurar dependências locais (`lucide-react`/`date-fns` incompletos no frontend; Nest CLI ausente no backend).
- [ ] Validar em aparelho a correção de marcações, especialmente usuário/horário da auditoria, registro de domingo lançado na segunda-feira e valores de chuva no histórico.

## Migrations / Banco
- **Migrations relevantes:** 
- **Tipos/Enums:** 
- **RLS/Permissões:** 

## Histórico resumido
| Data (UTC) | Resumo |
| --- | --- |
| 2026-10-27 | Arquivo criado com instrução no AGENTS.md para leitura/atualização automática. |
| 2026-10-27 | Registrada solicitação completa de lógica de sangria por tabelas (A–E), ciclo diário, formas de sangria (6 opções) e fluxo do app Monitor. |
| 2026-11-03 | Analisado suporte offline: cache para histórico/resumo de sangria, PATCH enfileirado e preservação de tokens em falha de login; escopo e limites registrados em `docs/plano-offline.md`. |
| 2026-11-03 | Preparação offline para sangradores, sequências, frota e sangrias recentes; operação de máquina iniciada localmente e rotas de campo adicionadas ao Service Worker. |
| 2026-11-03 | Relato de erro genérico ao abrir sangria offline; adicionado detalhe técnico visível no error boundary e estado de erro no carregamento inicial. Build passou; diagnóstico raiz depende da nova mensagem no aparelho. |
| 2026-11-03 | Erro "Sem conexão" rastreado ao fallback do Service Worker; criado manifesto de assets no build e pré-cache em lotes no worker v9 para incluir chunks lazy antes de desconectar. |
| 2026-11-03 | Build Node 22 passou; `dist/client/offline-assets.json` contém 242 caminhos e todos os arquivos existem. |
| 2026-11-03 | Corrigido falso alerta de duplicidade quando sangradores não têm `tapperId` (cadastros RH): registros legados passam a ser associados pelo nome. A confirmação de duplicidade agora segue no payload e na fila para validação do servidor. |
| 2026-11-03 | Build de produção passou após a correção de duplicidade offline. Lint direcionado segue apontando CRLF/prettier em massa nos arquivos existentes. |
| 2026-11-03 | Causa raiz da falha persistente: fallback offline retornava a janela inteira de sangrias (até 60 dias) mesmo em consultas por um dia. Resultado do cache agora é filtrado por fazenda, talhão e datas solicitadas. |
| 2026-11-04 | Usuário confirmou que a sincronização da fila ao voltar online funciona; build passou após filtrar os registros do cache offline por data, fazenda e talhão para impedir falsos alertas locais. |
| 2026-11-04 | Relato persistente levou à correção de estado obsoleto na tela: validações de data e duplicidade passam a ser identificadas pela seleção e descartam respostas atrasadas; RH compara sangrador pelo nome mesmo quando o registro retornado tem tapperId legado. |
| 2026-11-04 | Corrigido `ReferenceError: Cannot access '2' before initialization`: as chaves do cache de validação usavam `farm` antes da declaração; `farm` e `tapper` agora são definidos antes dos valores derivados. |
| 2026-11-04 | Incrementada versão do Service Worker v9→v10 para forçar atualização/precache dos bundles corrigidos; usuário reportava comportamento antigo ao testar offline. |
| 2026-11-04 | Usuário confirmou que a atualização do app resolveu o alerta falso de duplicidade offline; build do Service Worker v10 passou. |
| 2026-11-05 | Usuário relata que o app não abre offline no iPhone/Android. PWA inicia agora em `/auth`, fallback do worker inclui a tela de login e versão v11 exige cache dos assets críticos; esclarecido limite de autenticação offline e necessidade de preparar dados online. |
| 2026-11-05 | Investigada página “Vertex temporariamente indisponível”: não existe literal correspondente no app. Worker v12 agora usa fallback local também para respostas HTTP 5xx; `/auth` é intencional, pois `/campo` requer sessão. |
| 2026-11-05 | Usuário confirmou que a raiz deve direcionar a `/campo`. Corrigidos o redirect da raiz, `start_url` PWA e a prioridade de fallback offline; Service Worker incrementado para v13. |
| 2026-11-05 | Usuário ainda não consegue abrir o domínio raiz, mas `/campo` funciona. Worker v14 agora cai no shell cacheado de `/campo` quando a raiz recebe 404 do host/proxy. |
| 2026-11-05 | Usuário esclarece que offline o PWA tenta a internet para abrir. Service Worker v15 passa navegações para cache-first, com atualização do HTML em segundo plano quando online. |
| 2026-11-05 | Worker v15 evita pedidos de rede de navegação quando offline e serve o app shell do Cache Storage imediatamente; APIs mantêm estratégia de cache própria. |
| 2026-11-05 | Verificações estáticas do SW/manifesto passaram. Build bloqueado por instalação local de node_modules incompleta/corrompida (arquivos ausentes de lucide-react e Tailwind wasm); tentativa de restaurar dependência falhou com ENOENT/EPERM. |
| 2026-11-05 | Domínio atual `vertex.gleego.com.br` validado: `/` retorna 307 para `/campo` e `/campo` retorna 200. Domínio desejado informado como `vertex.gleeglo.com.br` não resolve DNS; pendente confirmar grafia/configurar domínio no provedor. |
| 2026-11-05 | Usuário confirmou que o domínio correto é `vertex.gleego.com.br`; `gleeglo` foi erro de digitação. Sem pendência de DNS para o domínio correto; redirect da raiz para `/campo` já foi verificado. |
| 2026-11-18 | Home de campo ajustada para manter previstas e mostrar saldo separado, com últimos 7 dias por padrão; histórico passa a exibir período, tarefa/tabela e a nomenclatura "Antecipada". Lint direcionado sem erros; builds/type-check aguardam reparo das dependências locais. Código commitado e enviado para `origin/main` em `c00ffe9`. |
| 2026-11-18 | Adicionada correção de sangrias pelo histórico com autoria/horário, registro retroativo agrupado pela data operacional e rótulos claros de chuva com milímetros/intensidade. `git diff --check` passou; type-check/build continuam bloqueados por dependências locais incompletas. |
| 2026-11-18 | Histórico de campo agora oferece "Data específica" com calendário de dia único, além de Hoje, 7 dias, 30 dias e Personalizado. |
| 2026-11-18 | Filtro de dia único renomeado para "Escolher data", com seletor de mês/ano no calendário e contagem de 1 dia no resumo "Por sangrador"; relato do usuário indica que o PWA pode estar servindo bundle antigo. |

## Notas rápidas
- Solicitação original do usuário preservada na mensagem da sessão; resumo estruturado acima. 
