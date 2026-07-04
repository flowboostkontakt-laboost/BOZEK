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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
EXPOSE 3000
# Migracja schematu + seed kont (idempotentny) + start.
# db:push toleruje istniejącą bazę; jeśli seed już był — pomija się sam.
CMD sh -c "npm run db:push -w @sep/api && npm run db:seed -w @sep/api && node apps/api/dist/main.js"
