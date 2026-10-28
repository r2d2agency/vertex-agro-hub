# Contexto da Sessão - Vertex Agro Hub

> Fonte única para retomar o trabalho entre sessões. Atualizado automaticamente pelo assistente.

## Status atual
- **Objetivo:** Implementar a lógica de sangria por tabelas (A–E) conforme solicitação do usuário.
- **Última ação:** Validado: fluxo de sequência (needsReset + "Definir sequência" pelo monitor) já existia e atende à solicitação. Matriz 3x2 de formas com cores implementada (admin + campo). TypeScript passou sem erros.
- **Estado:** concluído (parte de código); backend ativação formal opcional pendente, mas fluxo existente já cobre.
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
|  |  |  |

## Decisões tomadas
- Solicitação registrada integralmente para retomada futura (ver pendência abaixo).

## Pendências / Próximos passos
- [ ] Implementar cadastro do sangrador seguindo a ideia das tabelas (A–E) por talhão/fazenda, com quantidade de plantas por tabela.
- [ ] Implementar operação no app de campo: seleção fazenda → sangrador → tabela sugerida do dia + qtd de árvores a sangrar + qtd sangrada hoje.
- [ ] Implementar seleção da forma de sangria (6 opções em matriz 3x2) com cores diferenciadas para adiantamentos e reposições.
- [ ] Implementar ciclo diário A,B,C,D,E com suporte a reposição de dia atrasado no mesmo dia.
- [ ] Implementar ativação da "ordem do dia" pelo Monitor (sugestão passa a valer no dia seguinte).
- [ ] Mapear arquivos/tabelas/campos atuais do sistema para ajustar (pendente de exploração do codebase).

## Migrations / Banco
- **Migrations relevantes:** 
- **Tipos/Enums:** 
- **RLS/Permissões:** 

## Histórico resumido
| Data (UTC) | Resumo |
| --- | --- |
| 2026-10-27 | Arquivo criado com instrução no AGENTS.md para leitura/atualização automática. |
| 2026-10-27 | Registrada solicitação completa de lógica de sangria por tabelas (A–E), ciclo diário, formas de sangria (6 opções) e fluxo do app Monitor. |

## Notas rápidas
- Solicitação original do usuário preservada na mensagem da sessão; resumo estruturado acima. 
