# ============================================================================
# Vertex Agro — Frontend (TanStack Start SSR) — Docker para EasyPanel
# ============================================================================
# Build multi-stage com Node 20. O TanStack Start gera a saída em dist/
# e o runtime serve essa saída via Vite preview na porta 3000.
# ----------------------------------------------------------------------------

FROM node:20-alpine AS base
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund || npm install --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# --- build ---
FROM deps AS build
COPY . .
# Por padrão o navegador chama /api no mesmo domínio do frontend.
# O server.mjs faz proxy para API_PROXY_TARGET em runtime, evitando CORS.
ARG VITE_API_URL="/api"
ARG VITE_APP_NAME="Vertex Agro"
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
RUN npm run build

# --- runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV API_PROXY_TARGET=""

# TanStack Start + Vite gera dist/client e dist/server.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.mjs ./server.mjs

EXPOSE 3000
CMD ["node", "server.mjs"]
