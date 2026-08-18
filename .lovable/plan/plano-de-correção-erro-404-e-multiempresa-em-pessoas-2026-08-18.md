# Plano de Correção: Erro 404 e Multiempresa em Pessoas

Investigação detalhada revelou que o erro 404 no endpoint `GET /api/people/:id` e as falhas no vínculo (`assignments`) ocorrem devido a uma inconsistência entre a arquitetura de banco de dados real e as expectativas do Prisma/NestJS no backend, combinada com lacunas na propagação do `companyId` no frontend.

## Causa Raiz Encontrada
1.  **Divergência de Schema**: O backend utiliza Prisma para mapear a tabela `users`, mas no banco de dados real a tabela principal de perfis é `public.profiles` (seguindo o padrão Supabase), enquanto as credenciais estão em `auth.users`. O Prisma está configurado para buscar em `public.users`, que não existe.
2.  **Vínculo Incompleto**: Ao cadastrar uma pessoa, o sistema cria o registro em `users` (Prisma) mas a lógica de multiempresa depende de `user_roles` e `person_employments`. Se um desses falha ou não é consultado corretamente, o endpoint individual retorna 404 por falha na validação de "pertença" à empresa.
3.  **Endpoint 404**: O `PeopleService.get` falha ao encontrar o usuário porque a consulta `findUnique` no Prisma falha (tabela inexistente ou ID não mapeado) ou porque o filtro de `include` para `roles` e `employments` retorna vazio para a empresa informada, disparando o `NotFoundException`.
4.  **Frontend Inconsistente**: Algumas chamadas de mutação (como `upsertEmployment` e `createAssignment`) não estavam recebendo o `companyId` corretamente na URL ou no corpo, resultando em erros de validação no backend.

## Ações Propostas

### 1. Backend: Estabilização do Acesso a Dados
- **Mapeamento Prisma**: Ajustar `backend/prisma/schema.prisma` para garantir que o modelo `User` mapeie corretamente para a tabela real (ou garantir que o `db push` crie a estrutura necessária).
- **Normalização de Service**: Refatorar `PeopleService.get` para garantir que, se um usuário for um `admin_global`, ele possa ser visualizado mesmo sem um vínculo explícito em `user_roles` para a empresa específica, evitando 404s para administradores.
- **Robustez no Create/Invite**: Garantir que a criação de uma pessoa e seu vínculo com a empresa ocorram em uma transação atômica.

### 2. Backend: Correção dos Endpoints
- **GET /people/:id**: Ajustar a consulta para ser resiliente a vínculos ausentes de emprego se o papel do usuário for apenas administrativo.
- **POST /assignments**: Garantir que o `companyId` seja validado contra o usuário autenticado e contra a fazenda alvo.

### 3. Frontend: Propagação de Contexto
- **People Functions**: Atualizar `src/lib/people.functions.ts` para que todas as funções de mutação (`upsertPersonEmployment`, `createPersonAssignment`, etc.) incluam explicitamente o `companyId` na query string ou no payload, conforme exigido pelo backend.
- **Person Editor**: Garantir que o `companyId` ativo seja passado e utilizado em todas as abas (Pessoal, Profissional, Fazendas).

## Detalhes Técnicos para o Usuário
O sistema está operando em um ambiente multi-inquilino. O erro 404 acontece porque o "porteiro" do sistema (backend) não consegue confirmar que a pessoa que você está tentando editar realmente pertence à empresa selecionada. Vou unificar a forma como essa verificação é feita para que ela seja consistente entre a listagem e a edição individual.

---
**CAUSA RAIZ ENCONTRADA:** Inconsistência no mapeamento de tabelas entre Prisma e Banco de Dados Real, e falha na validação de permissão cruzada (usuário vs empresa) no endpoint de detalhes.
