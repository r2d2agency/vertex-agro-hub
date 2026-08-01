# Vertex Agro

Plataforma web para gestão administrativa de seringais, com frontend TanStack Start e backend NestJS/Prisma/PostgreSQL preparado para EasyPanel.

Design by **TNS R2D2**.

## Frontend

Variáveis do app frontend no EasyPanel:

```env
VITE_API_URL=/api
VITE_APP_NAME=Vertex Agro
API_PROXY_TARGET=http://vertex-backend:3000
PORT=3000
HOST=0.0.0.0
```

Use `VITE_API_URL=/api` para o navegador chamar o mesmo domínio do frontend. `API_PROXY_TARGET` é runtime e aponta para o backend; isso evita CORS no browser.

**Importante (EasyPanel):** use o **host interno** do serviço de backend (nome do serviço + porta interna, ex.: `http://vertex-backend:3000`). O domínio público (`*.easypanel.host`) muitas vezes não resolve de dentro do container e gera `EAI_AGAIN`. É possível informar uma lista com fallback:

```env
API_PROXY_TARGET=http://vertex-backend:3000,https://api.seudominio.com.br
```

## Backend

O backend fica em `backend/` e usa PostgreSQL via `DATABASE_URL`.

```env
DATABASE_URL=postgresql://usuario:senha@postgres:5432/vertex
JWT_SECRET=troque_por_um_segredo_forte
JWT_REFRESH_SECRET=troque_por_outro_segredo_forte
CORS_ORIGIN=https://app.seudominio.com.br
FRONTEND_URL=https://app.seudominio.com.br
```

## Desenvolvimento local

```sh
npm install
npm run dev
```

## Stack

- TanStack Start
- React
- TypeScript
- Tailwind CSS
- NestJS
- Prisma
- PostgreSQL
