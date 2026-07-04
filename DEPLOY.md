# Wdrożenie do chmury — apka dla pracownic (instalowalna PWA)

Efekt: publiczny adres **HTTPS**, który każda pracownica otwiera na swoim telefonie i wybiera
**„Dodaj do ekranu głównego"** — dostaje ikonę i apkę jak natywną. Dane zapisują się w bazie
w chmurze, więc działa niezależnie od Twojego komputera.

## Krok 1 — wrzuć kod na GitHub

Kod jest już zainicjowany w git (pierwszy commit zrobiony). Utwórz puste repozytorium na
GitHubie i wypchnij:

```bash
git remote add origin https://github.com/<twoj-login>/ewidencja-produkcji.git
git branch -M main
git push -u origin main
```

## Krok 2 — postaw na Render (jeden blueprint)

1. Wejdź na https://render.com → zaloguj się (GitHubem).
2. **New → Blueprint** → wskaż to repozytorium → **Apply**.
3. Render przeczyta `render.yaml` i sam utworzy: **bazę Postgres**, **API** i **PWA**.
   Schemat bazy i konta demo zakładają się automatycznie przy pierwszym starcie.

Po ~5–10 min dostaniesz dwa adresy:
- **PWA (dla pracownic):** `https://sep-web.onrender.com`
- API: `https://sep-api.onrender.com/api`

> Jeśli Render nada inne nazwy niż `sep-web`/`sep-api`, popraw dwa pola w `render.yaml`
> (`WEB_ORIGIN` i `VITE_API_URL`) na faktyczne adresy i zrób redeploy.

## Krok 3 — instalacja na telefonie pracownicy

Każda pracownica na swoim telefonie:
1. Otwiera `https://sep-web.onrender.com` (przeglądarka: Chrome / Safari).
2. Menu → **„Dodaj do ekranu głównego"** (Android) / **Udostępnij → Do ekranu początkowego** (iPhone).
3. Loguje się swoim kontem. Kamera (skan kodu / zdjęcie AI) działa, bo jest HTTPS.

## Konta startowe (ZMIEŃ HASŁA!)

| Login | Hasło | Rola |
|---|---|---|
| admin | admin123 | administrator |
| ania / basia / kasia | praca123 | pracownica |

Nowe pracownice dodajesz w panelu: **Admin → Pracownice → Dodaj pracownicę** (ustawiasz login, hasło, normę, etat).

## Uwagi

- **Darmowy plan Render** usypia usługę po ~15 min bezczynności — pierwsze wejście rano bywa wolniejsze (kilkanaście sekund). Do realnej codziennej pracy warto wziąć najtańszy płatny plan (zawsze aktywny).
- **PrestaShop:** w panelu Render (usługa `sep-api` → Environment) uzupełnij `PRESTASHOP_API_URL` i `PRESTASHOP_API_KEY`, żeby ruszyła synchronizacja katalogu. Bez tego apka działa, tylko katalog trzeba dodać ręcznie.
- Alternatywa dla Render: **Railway** (podobnie — Postgres + dwie usługi z tego repo).
