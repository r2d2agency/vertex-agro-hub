# Plano de Melhorias Estruturais e Operacionais

## Sangria e Produção
- **Backend:** Expandir o modelo `TappingRecord` (Prisma) e DTOs para incluir `status` (concluida, parcial, interrompida), `quality` (excelente, boa, regular, ruim) e `tableCondition` (normal, atencao, critica).
- **Frontend Admin:** Atualizar a tabela de sangrias e o diálogo de edição para exibir e permitir a edição desses novos campos.
- **Frontend Campo:** Ajustar `submitTapping` para enviar os dados estruturados em vez de concatenar no campo `notes`.

## Gestão de Equipe e Operadores
- **RH Unificado:** Refatorar o `PersonEditor` e o fluxo de usuários para garantir que o cargo "Operador" (frota) seja tratado com a mesma importância que "Sangrador" ou "Monitor".
- **Filtros:** Adicionar filtro por cargo na lista de usuários para facilitar a gestão de operadores.
- **Vínculos:** Garantir que ao cadastrar um operador no RH, ele fique disponível para seleção em máquinas e ordens de serviço.

## Frota e Insumos
- **Estoque/Produtos:** Adicionar campos de Fornecedor detalhado (Nome, CNPJ, Telefone, Contato, Endereço) no cadastro de itens de inventário.
- **Manutenção:** Incluir seleção de fornecedor externo (oficinas/prestadores) nas Ordens de Serviço.
- **Checklist:** Implementar a visualização administrativa dos checklists realizados no campo, com filtros por máquina e data.

## Detalhes Técnicos
- Migração Prisma para novos campos em `TappingRecord` e `InventoryItem`.
- Atualização dos endpoints NestJS correspondentes.
- Ajustes de UI no Shadcn/UI para os novos formulários.
