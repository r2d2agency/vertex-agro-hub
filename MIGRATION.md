# Migração Vertex Agro — Lovable Cloud → EasyPanel (Docker)

## Ordem recomendada (sem downtime)

### 1. Preparar o backend novo (este PR)
- [x] `backend/` com NestJS + Prisma + JWT + Google OAuth + CRUD Empresas
- [x] `Dockerfile` do frontend com preset Nitro `node-server`
- [x] `docker-compose.yml` local para ambos

### 2. Subir a infra no EasyPanel
1. Crie um **Projeto** no EasyPanel (ex.: `vertex-agro`).
2. Adicione um serviço **Postgres 16** (anote host/porta/senha internas).
3. Mova o conteúdo de `backend/` para um repositório GitHub separado (ex.: `vertex-agro-api`).
4. No EasyPanel, crie um **App** apontando para esse repo. Configure as variáveis:
   - `DATABASE_URL` — connection string interna do Postgres
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` — `openssl rand -hex 32` cada
   - `CORS_ORIGIN` — domínio do frontend (ex.: `https://app.seudominio.com.br`)
   - `FRONTEND_URL` — mesmo domínio
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — opcionais; deixe vazio para subir primeiro só com e-mail/senha
   - `GOOGLE_CALLBACK_URL` — obrigatório apenas se Google OAuth estiver ativo: `https://api.seudominio.com.br/auth/google/callback`
5. Vincule um domínio (ex.: `api.seudominio.com.br`) e ative HTTPS (Let's Encrypt).
6. Deploy — o container roda `prisma migrate deploy` automaticamente na inicialização.
7. Crie o primeiro usuário e promova a `admin_global` manualmente:
   ```sql
   INSERT INTO user_roles (id, user_id, role)
   VALUES (gen_random_uuid(), '<user-id>', 'admin_global');
   ```

### 3. Migrar o frontend
Hoje o frontend usa `@/integrations/supabase/client` e `createServerFn` com `requireSupabaseAuth`. Para apontar para a nova API:

1. **Remova** as dependências: `@supabase/supabase-js`, `@lovable.dev/cloud-auth-js`.
2. **Substitua** o cliente Supabase por um wrapper `fetch` para a API NestJS (`src/lib/api-client.ts`) que anexa `Authorization: Bearer <access_token>` de `localStorage`.
3. **Reescreva** `src/lib/companies.functions.ts` chamando `GET /companies`, `POST /companies`, etc.
4. **Reescreva** `src/routes/auth.tsx` e `src/routes/reset-password.tsx` chamando `POST /auth/login`, `POST /auth/register`, e redirecionando para `GET /auth/google` no Google.
5. **Reescreva** `src/hooks/use-auth.ts` para ler o access token do `localStorage` + chamar `GET /auth/me`.
6. Remova `src/integrations/supabase/*` e `src/integrations/lovable/*`.
7. Remova `nitro`/CF do build e confie no `NITRO_PRESET=node-server` já no Dockerfile.

> **Esta etapa é grande (~30 arquivos)**. Posso executar em uma próxima rodada após o backend estar no ar — quando o EasyPanel estiver respondendo em `https://api.seudominio.com.br/health`, me avise que faço a migração completa do frontend em um único PR.

### 4. Publicar o frontend no EasyPanel
1. Mova o repo do frontend para um novo GitHub separado (sem a pasta `backend/`).
2. No EasyPanel, crie um segundo App apontando para o repo do frontend.
3. Configure as variáveis de build:
   - `VITE_API_URL=https://api.seudominio.com.br`
   - `VITE_APP_NAME=Vertex Agro`
4. Vincule domínio (ex.: `app.seudominio.com.br`) + HTTPS.

### 5. Desconectar o Lovable Cloud
Somente depois que o novo stack estiver rodando e validado:
- **Cloud → Advanced → Disconnect** (⚠️ irreversível — apaga banco/auth/storage do Lovable).

## Google OAuth — configuração
O backend agora inicia normalmente sem Google OAuth. Se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` não forem definidos, a rota `/auth/google` fica indisponível temporariamente, mas login por e-mail/senha continua funcionando.

No Google Cloud Console, em **Credenciais → OAuth 2.0 Client IDs → Web application**:
- **Authorized redirect URIs**:
  - `http://localhost:4000/auth/google/callback` (dev)
  - `https://api.seudominio.com.br/auth/google/callback` (prod)
