# Contexto da Sessão - Vertex Agro Hub

> Fonte única para retomar o trabalho entre sessões. Atualizado automaticamente pelo assistente.

## Status atual
- **Objetivo:** Fazer o app funcionar offline, com foco nos erros de login e registro de sangria.
- **Última ação:** Leituras de registros/resumo de sangria agora usam cache IndexedDB; correções de sangria podem ser enfileiradas offline; login preserva tokens anteriores se a tentativa online falhar.
- **Estado:** build de produção passou com Node 22. Typecheck bloqueado por declaração sintaticamente incompleta em `node_modules/date-fns/isMatch.d.ts`; ESLint reportou CRLF/prettier em massa. Offline segue limitado aos fluxos de campo e aos dados previamente sincronizados.
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
| `src/lib/sangrias.functions.ts` | Cache/fallback offline para histórico e resumo | alterado |
| `src/routes/campo/sangria.tsx` | Usa fila ao corrigir lançamento offline | alterado |
| `docs/plano-offline.md` | Diagnóstico, escopo offline e pendências | alterado |

## Decisões tomadas
- Falha de login online sem mensagem/log não permite concluir se é URL, rede, credencial ou backend; não alterar configuração de API por suposição.
- Login offline significa retomar sessão previamente autenticada, não validar senha sem servidor.
- Foco de implementação desta sessão: telas de campo de sangria; disponibilidade offline dos módulos administrativos permanece fora do escopo já implementado.

## Pendências / Próximos passos
- [ ] Validar build quando as dependências frontend estiverem instaladas.
- [ ] Obter mensagem exata do erro de login online e logs correlatos para identificar causa de ambiente/backend.
- [ ] Completar cache de dados locais pendentes para duplicidade/resumo e fila de upload de fotos/áudios.
- [ ] Associar cache offline à identidade do usuário para evitar mistura de dados ao alternar contas.
- [ ] Avaliar suporte offline dos módulos administrativos; hoje apenas o app de campo tem fila/cache parcial.

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

## Notas rápidas
- Solicitação original do usuário preservada na mensagem da sessão; resumo estruturado acima. 
