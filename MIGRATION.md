# Vertex Agro — Deploy no EasyPanel (Docker)

## Ordem recomendada (sem downtime)

### 1. Preparar o backend
- [x] `backend/` com NestJS + Prisma + JWT + CRUD Empresas
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
5. Vincule um domínio (ex.: `api.seudominio.com.br`) e ative HTTPS (Let's Encrypt).
6. Deploy — o container roda `prisma migrate deploy` automaticamente na inicialização.
7. Crie o primeiro usuário e promova a `admin_global` manualmente:
   ```sql
   INSERT INTO user_roles (id, user_id, role)
   VALUES (gen_random_uuid(), '<user-id>', 'admin_global');
   ```

### 3. Frontend apontando para a API própria

O frontend já usa a API NestJS via `VITE_API_URL`:

1. Auth: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/logout`.
2. Empresas: `GET /companies`, `POST /companies`, `PATCH /companies/:id`, `DELETE /companies/:id`.
3. Configure `VITE_API_URL=https://api.seudominio.com.br` no app frontend.
4. Faça **Rebuild** depois de alterar `VITE_API_URL`.

### 4. Publicar o frontend no EasyPanel
1. Mova o repo do frontend para um novo GitHub separado (sem a pasta `backend/`).
2. No EasyPanel, crie um segundo App apontando para o repo do frontend.
3. Configure as variáveis de build:
   - `VITE_API_URL=https://api.seudominio.com.br`
   - `VITE_APP_NAME=Vertex Agro`
4. Vincule domínio (ex.: `app.seudominio.com.br`) + HTTPS.

### 5. Banco de dados
Use o PostgreSQL do EasyPanel no backend via `DATABASE_URL`. O frontend não acessa o banco diretamente.

## OAuth
OAuth social está desativado por enquanto. O login ativo é e-mail/senha com JWT.
