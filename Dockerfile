# ============================================================================
# Vertex Agro — Frontend (TanStack Start SSR) — Docker para EasyPanel
# ============================================================================
# Build multi-stage com Node 20. O TanStack Start gera a saída em dist/
# e o runtime serve essa saída via Vite preview na porta 3000.
# ----------------------------------------------------------------------------

FROM node:22-alpine AS base
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
# Copia só o que o build usa, em vez de "COPY . ." — assim editar um .md ou
# um script avulso não invalida a camada do build inteiro.
COPY tsconfig.json vite.config.ts components.json ./
COPY scripts ./scripts
COPY public ./public
COPY src ./src
# Por padrão o navegador chama /api no mesmo domínio do frontend.
# O server.mjs faz proxy para API_PROXY_TARGET em runtime, evitando CORS.
ARG VITE_API_URL="/api"
ARG VITE_APP_NAME="Vertex Agro"
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
RUN npm run build
# Remove as ferramentas de build (vite, rolldown, typescript) do node_modules
# que vai pra imagem. O prune acontece aqui, e não um "npm ci --omit=dev" no
# runtime, porque o bundle do servidor pode externalizar dependências: um
# install limpo por conta própria poderia faltar alguma que a imagem já tem.
RUN npm prune --omit=dev

# --- runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV API_PROXY_TARGET=""

# Só as dependências de produção: o server.mjs serve o dist/ e não usa vite,
# rolldown nem typescript. Copiar o node_modules inteiro (como fazia antes)
# embala ~400MB de ferramentas de build na imagem e deixa cada pull mais lento.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY server.mjs ./server.mjs

EXPOSE 3000
CMD ["node", "server.mjs"]
