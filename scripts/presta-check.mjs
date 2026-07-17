/**
 * Diagnostyka połączenia z PrestaShop Webservice — bez bazy i bez NestJS.
 * Odwzorowuje logikę apps/api/src/sync/prestashop.client.ts.
 *
 * Użycie (z katalogu głównego repo, xml2js jest w root node_modules):
 *   node scripts/presta-check.mjs "https://twojsklep.pl/api" "TWOJ_KLUCZ_API"
 * albo przez zmienne środowiskowe:
 *   PRESTASHOP_API_URL=... PRESTASHOP_API_KEY=... node scripts/presta-check.mjs
 */
import { parseStringPromise } from "xml2js";

const BASE = (process.argv[2] ?? process.env.PRESTASHOP_API_URL ?? "").replace(/\/+$/, "");
const KEY = (process.argv[3] ?? process.env.PRESTASHOP_API_KEY ?? "").trim();

if (!BASE || !KEY) {
  console.error("✗ Brak URL lub klucza.\n  node scripts/presta-check.mjs <URL> <KLUCZ>\n  (URL w formacie https://sklep.pl/api)");
  process.exit(1);
}

const authHeader = "Basic " + Buffer.from(`${KEY}:`).toString("base64");
const maskedKey = KEY.length > 8 ? KEY.slice(0, 4) + "…" + KEY.slice(-4) : "****";
console.log(`URL : ${BASE}`);
console.log(`KEY : ${maskedKey} (dł. ${KEY.length})\n`);

async function hit(path) {
  const sep = path.includes("?") ? "&" : "?";
  // ws_key w URL — odporne na hostingi wycinające nagłówek Authorization (LiteSpeed).
  const url = `${BASE}${path}${sep}ws_key=${encodeURIComponent(KEY)}&output_format=JSON`;
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: authHeader } });
  } catch (e) {
    return { url, netErr: e.message };
  }
  const body = await res.text();
  return { url, status: res.status, ok: res.ok, ms: Date.now() - t0, ctype: res.headers.get("content-type"), body };
}

async function parsePrestashop(body) {
  const trimmed = body.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed);
  return await parseStringPromise(trimmed, { explicitArray: false, trim: true, normalize: true, normalizeTags: false });
}
const getPath = (root, path) => path.reduce((c, k) => (c == null ? undefined : c[k]), root);
function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "object") return [value];
  if (Array.isArray(value.product)) return value.product;
  if (Array.isArray(value.category)) return value.category;
  const nested = Object.values(value).find(Array.isArray);
  return nested ? nested : [value];
}
function readCollection(root, ...paths) {
  for (const p of paths) { const l = asList(getPath(root, p)); if (l.length) return l; }
  return [];
}

async function check(label, path, paths) {
  console.log(`\n═══ ${label}  (GET ${path}) ═══`);
  const r = await hit(path);
  if (r.netErr) { console.log(`✗ BŁĄD SIECI: ${r.netErr}`); return; }
  console.log(`HTTP ${r.status} ${r.ok ? "OK" : "!!!"}  ·  ${r.ms} ms  ·  ${r.ctype}`);
  const preview = r.body.slice(0, 500).replace(/\s+/g, " ");
  console.log(`Odpowiedź (500 zn.): ${preview}`);
  if (!r.ok) {
    console.log("→ Zasób niedostępny. 401=zły klucz/uprawnienia, 404=zły URL, 500=błąd sklepu.");
    return;
  }
  try {
    const data = await parsePrestashop(r.body);
    const list = readCollection(data, ...paths);
    console.log(`→ Sparsowano rekordów: ${list.length}`);
    if (list.length) console.log(`  Przykład: ${JSON.stringify(list[0]).slice(0, 200)}`);
    else console.log("  ⚠ 0 rekordów — sklep odpowiedział, ale lista jest pusta (brak danych lub inny format).");
  } catch (e) {
    console.log(`✗ Parsowanie nie powiodło się: ${e.message}`);
  }
}

console.log("Test podstawowy (lista, bez display=full):");
await check("Kategorie", "/categories", [["prestashop", "categories", "category"], ["categories", "category"], ["categories"]]);
await check("Produkty", "/products", [["prestashop", "products", "product"], ["products", "product"], ["products"]]);

console.log("\n\nTest jak w aplikacji (display=full):");
await check("Kategorie (full)", "/categories?display=full", [["prestashop", "categories", "category"], ["categories", "category"], ["categories"]]);
await check("Produkty (full)", "/products?display=full", [["prestashop", "products", "product"], ["products", "product"], ["products"]]);
