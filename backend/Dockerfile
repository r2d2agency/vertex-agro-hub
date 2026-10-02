# ============================================================================
# Vertex Agro API — Dockerfile
# ============================================================================
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# --- deps ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# --- build ---
FROM deps AS build
COPY prisma ./prisma
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build
# Poda as ferramentas de build depois de compilar, pra imagem final não
# carregá-las. Feito aqui (e não com um "npm ci --omit=dev" no runtime) porque
# o client do Prisma e outros pacotes são resolvidos em tempo de execução.
RUN npm prune --omit=dev

# --- runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Reaproveita as dependências já podadas do estágio de build: antes havia um
# segundo "npm ci" completo aqui, dobrando o tempo de instalação por build.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
