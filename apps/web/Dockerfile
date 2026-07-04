# Build context = katalog główny repo (monorepo workspaces)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm install
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build -w @sep/shared && npm run build -w @sep/web

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
