# Vertex Agro

Plataforma web para gestão administrativa de seringais, com frontend TanStack Start e backend NestJS/Prisma/PostgreSQL preparado para EasyPanel.

Design by **TNS R2D2**.

## Frontend

Variáveis do app frontend no EasyPanel:

```env
VITE_API_URL=/api
VITE_APP_NAME=Vertex Agro
API_PROXY_TARGET=https://api.seudominio.com.br
PORT=3000
HOST=0.0.0.0
```

Use `VITE_API_URL=/api` para o navegador chamar o mesmo domínio do frontend. `API_PROXY_TARGET` é runtime e aponta para o backend; isso evita CORS no browser.

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
