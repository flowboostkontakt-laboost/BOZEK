# Build context = katalog główny repo (monorepo workspaces)
# Debian slim + openssl — Prisma wymaga openssl (na Alpine crashuje przy starcie).
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm install
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build -w @sep/shared \
 && npm run db:generate -w @sep/api \
 && npm run build -w @sep/api

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# Kopiujemy cały zbudowany workspace (root package.json, node_modules, dist, prisma).
COPY --from=build /app ./
EXPOSE 3000
# Migracja + seed (idempotentny). Błędy nie zatrzymują serwera → /api/health zawsze odpowiada.
# Entry serwera: dist/src/main.js (nest zagnieżdża pod src/).
CMD sh -c "npm run db:push -w @sep/api || echo 'UWAGA: db:push nieudane'; npm run db:seed -w @sep/api || echo 'UWAGA: seed nieudany'; node apps/api/dist/src/main.js"
