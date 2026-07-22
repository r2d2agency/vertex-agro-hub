# ============================================================================
# Vertex Agro API — Dockerfile
# ============================================================================
FROM node:20-alpine AS base
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

# --- runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
# Roda migrações Prisma antes de iniciar (idempotente)
CMD sh -c "npx prisma migrate deploy && node dist/main.js"
