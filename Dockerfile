# ============================================================================
# Vertex Agro — Frontend (TanStack Start SSR) — Docker para EasyPanel
# ============================================================================
# Build multi-stage com Node 20. O TanStack Start é empacotado pelo Nitro;
# usamos o preset "node-server" para gerar um servidor Node standalone em
# .output/server/index.mjs
# ----------------------------------------------------------------------------

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare bun@latest --activate || true
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json bun.lockb* package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f bun.lockb ]; then bun install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
    else (npm ci --no-audit --no-fund || npm install --no-audit --no-fund); fi

# --- build ---
FROM deps AS build
COPY . .
# Nitro node-server preset (Node standalone em vez de Cloudflare Worker)
ENV NITRO_PRESET=node-server
# VITE_* precisam estar disponíveis em build time — passe via --build-arg
ARG VITE_API_URL
ARG VITE_APP_NAME="Vertex Agro"
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
RUN npm run build

# --- runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# O Nitro empacota tudo em .output/ (server + assets estáticos)
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
