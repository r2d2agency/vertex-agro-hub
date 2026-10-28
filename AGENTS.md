# Vertex Agro — orientações de repositório

Evite reescrever histórico já publicado em produção. Mantenha a branch principal sempre em estado compilável para deploy no EasyPanel.

## Contexto de sessão (persistente)

- **Arquivo de contexto:** `docs/contexto-sessao.md`. Sempre ler este arquivo no início de uma nova sessão se ele existir.
- **Manutenção obrigatória:** ao finalizar uma tarefa, tomada de decisão relevante ou ao identificar arquivos/tabelas/campos importantes (ex.: lógica de talhões), atualize `docs/contexto-sessao.md` com: objetivo atual, último estado, arquivos envolvidos, decisões tomadas, pendências/próximos passos e dados relevantes (nomes de tabelas/campos/migrations).
- **Criação automática:** se o arquivo não existir, crie-o com essa estrutura antes de prosseguir com o trabalho.
- **Sem pedir confirmação:** não pergunte ao usuário se deve salvar o contexto — faça-o de forma proativa sempre que houver progresso relevante.
- **Fonte única:** trate `docs/contexto-sessao.md` como a fonte da verdade para retomar o trabalho entre sessões.
