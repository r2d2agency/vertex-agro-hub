# Vertex Agro — Backend (NestJS + Prisma + Postgres + JWT/Google)

Backend independente, pronto para publicar no EasyPanel via Docker.
Este diretório vai virar um **repositório separado** — mova o conteúdo de `backend/` para um novo repo Git antes do primeiro deploy.

## Rodando local

```bash
cd backend
cp .env.example .env      # ajuste JWT_SECRET, GOOGLE_*, DATABASE_URL
docker compose up -d db   # sobe apenas o Postgres
npm install
npx prisma migrate dev
npm run start:dev
```

API em `http://localhost:4000`.

## Deploy no EasyPanel

1. **Postgres** — crie um serviço "Postgres" no EasyPanel. Anote a connection string interna (ex.: `postgres://postgres:senha@vertex_db:5432/vertex`).
2. **API** — crie um App do tipo "App", aponte para este repositório. O EasyPanel detecta o `Dockerfile` automaticamente. Configure as variáveis de ambiente da seção `.env.example`.
3. **Domínio** — associe um domínio (ex.: `api.seudominio.com.br`) e ative HTTPS.
4. **Frontend** — no repo do frontend, defina `VITE_API_URL=https://api.seudominio.com.br` no build.

O container do backend executa `npx prisma migrate deploy` antes de iniciar a API. Se o domínio mostrar `Service is not reachable`, confira primeiro `DATABASE_URL`, `JWT_SECRET` e `JWT_REFRESH_SECRET` nos logs do app backend.

Exemplo para o backend no EasyPanel:

```env
CORS_ORIGIN=https://blaster-vertex-front.isyhhh.easypanel.host
FRONTEND_URL=https://blaster-vertex-front.isyhhh.easypanel.host
```

## Estrutura

```
src/
├── auth/          # JWT + Google OAuth (Passport)
├── companies/     # CRUD de empresas (multiempresa)
├── users/         # profiles + user_roles + company_members
├── prisma/        # PrismaService
└── main.ts        # bootstrap Nest + CORS + Helmet
prisma/schema.prisma
```

## Rotas principais

- `POST /auth/register` — email/senha
- `POST /auth/login` — retorna access_token + refresh_token
- `POST /auth/refresh` — renova access_token
- `GET  /auth/google` — inicia OAuth Google
- `GET  /auth/google/callback` — retorna JWT após consentimento
- `GET  /companies` — lista empresas do usuário (admin_global vê todas)
- `POST /companies` — cria empresa (admin_global)
- `GET  /companies/:id` — detalhe
- `PATCH /companies/:id` — atualiza
- `DELETE /companies/:id` — soft-delete

Todos os endpoints (exceto `/auth/*`) exigem `Authorization: Bearer <access_token>`.
