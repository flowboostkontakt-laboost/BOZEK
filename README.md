# System Ewidencji Produkcji i Norm Pracy — Wariant A

Dedykowane oprogramowanie (Custom Software) dla *Handmade Micro-Workshop*: lekka aplikacja **PWA** dla pracownic + **panel analityczny** dla administratora, z integracją PrestaShop, automatycznym systemem premiowym i modułem **AI rozpoznawania produktu ze zdjęcia**.

## Stack

- **Backend:** Node.js + NestJS (TypeScript)
- **Baza:** PostgreSQL + pgvector (embeddingi zdjęć — moduł AI)
- **Frontend:** React + Vite + Tailwind (PWA), motyw dark + fiolet
- **Rdzeń logiki:** `@sep/shared` — silnik norm i premii (jedno źródło prawdy front+back)

## Struktura (monorepo, npm workspaces)

```
apps/
  api/    NestJS — auth, sync PrestaShop, normy, premie, raporty, AI
  web/    React — panel admina + PWA pracownic
packages/
  shared/ silnik norm + typy domenowe (dual ESM/CJS)
infra/    docker-compose (Postgres+pgvector), nginx (wdrożenie)
```

## Szybki start (development)

```bash
# 1. Zależności
npm install

# 2. Baza (wymaga Dockera) — Postgres + pgvector
npm run db:up          # docker compose up -d db
cp .env.example .env   # uzupełnij DATABASE_URL, sekrety JWT, dane PrestaShop

# 3. Schemat bazy + klient Prisma
npm run db:push
npm run db:seed        # (dodamy w kolejnym kroku) dane demo

# 4. Uruchomienie
npm run dev:api        # http://localhost:3000/api
npm run dev:web        # http://localhost:5173
```

> Bez Dockera: wskaż `DATABASE_URL` na dowolny PostgreSQL 16+ z rozszerzeniem `vector`.

## Testy

```bash
npm test               # silnik norm (@sep/shared) — zgodność z liczbami z mockupu
```

## Uruchomienie produkcyjne (Docker)

Cały stack (Postgres + API + Web) jednym poleceniem:

```bash
cp .env.example .env      # uzupełnij sekrety JWT i dane PrestaShop
docker compose up -d --build
# Web: http://localhost   ·   API: http://localhost:3000/api
```

## Konta demo (po `npm run db:seed`)

| Login | Hasło | Rola |
|---|---|---|
| admin | admin123 | administrator |
| ania / basia / kasia | praca123 | pracownica |

## Przegląd API

- **Auth:** `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me`
- **Pracownica:** `GET /worker/me/progress` · `GET /worker/entries/recent` · `POST /worker/entries` · `POST /worker/tasks` · `POST /worker/entries/recognize` (AI)
- **Admin:** `GET /admin/dashboard` · `GET /admin/reports` + `/export` · `admin/employees` · `admin/catalog` · `admin/review` · `admin/attendance` · `admin/bonus` · `admin/sync` (status/run)

## Status realizacji — ukończone ✅

| Krok | Zakres | Status |
|---|---|---|
| 1 | Monorepo, Docker, motyw dark+fiolet | ✅ |
| 2 | Model danych (Prisma + pgvector) | ✅ |
| 3 | Auth + role + dyskrecja finansowa + auto-logout 18:00 | ✅ |
| 4 | Integracja PrestaShop (cron sync + status) | ✅ |
| 5 | Silnik norm + premii + testy (20) | ✅ |
| 6 | Panel admina: Dashboard „Dzisiaj" | ✅ |
| 7 | Admin: pracownice, katalog, weryfikacja, kalendarz | ✅ |
| 8–9 | PWA: dashboard + 3 metody dodawania (ID/skan/AI) | ✅ |
| 10 | Moduł AI (embeddingi + pgvector, Wariant A) | ✅ |
| 11 | System premiowy (progi + auto-nalicz) | ✅ |
| 12 | Raporty + eksport .xlsx/.csv | ✅ |
| 13 | Deploy (Docker + nginx), testy, dokumentacja | ✅ |

> Silnik AI ma pluggable warstwę embeddingów — domyślnie deterministyczny stub;
> w produkcji podmieniany na CLIP (transformers.js) lub API vision (`AI_PROVIDER=api`).
