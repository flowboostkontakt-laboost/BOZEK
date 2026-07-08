import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseStringPromise } from "xml2js";

export interface PsCategory {
  id: string;
  name: string;
}

export interface PsProduct {
  id: string;
  name: string;
  price: number;
  categoryId?: string;
  barcode?: string;
  active: boolean;
}

/** PrestaShop Webservice client. Supports JSON and XML responses. */
@Injectable()
export class PrestashopClient {
  constructor(private readonly config: ConfigService) {}

  private base(): string {
    return (this.config.get<string>("PRESTASHOP_API_URL") ?? "").replace(/\/+$/, "");
  }

  private authKey(): string {
    return (this.config.get<string>("PRESTASHOP_API_KEY") ?? "").trim();
  }

  isConfigured(): boolean {
    return this.base().length > 0 && this.authKey().length > 0;
  }

  private authHeader(): string {
    return "Basic " + Buffer.from(`${this.authKey()}:`).toString("base64");
  }

  private async get<T>(path: string): Promise<T> {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${this.base()}${path}${sep}output_format=JSON`;
    const res = await fetch(url, { headers: { Authorization: this.authHeader() } });
    if (!res.ok) throw new Error(`PrestaShop ${res.status} przy ${path}`);
    const body = await res.text();
    return parsePrestashop<T>(body);
  }

  async fetchCategories(): Promise<PsCategory[]> {
    const data = await this.get<unknown>("/categories?display=full");
    return readCollection(data, ["prestashop", "categories", "category"], ["categories", "category"], ["categories"]).map((c: any) => ({
      id: String(getField(c, "id") ?? ""),
      name: lang(getField(c, "name")),
    }));
  }

  async fetchProducts(): Promise<PsProduct[]> {
    const data = await this.get<unknown>("/products?display=full");
    return readCollection(data, ["prestashop", "products", "product"], ["products", "product"], ["products"]).map((p: any) => ({
      id: String(getField(p, "id") ?? ""),
      name: lang(getField(p, "name")),
      price: Number(text(getField(p, "price")) || 0),
      categoryId: text(getField(p, "id_category_default")) || undefined,
      barcode: text(getField(p, "ean13")) || text(getField(p, "reference")) || undefined,
      active: truthy(getField(p, "active")),
    }));
  }
}

function lang(v: unknown): string {
  const t = text(v);
  if (t) return t;
  const language = (v as any)?.language;
  if (language) return text(Array.isArray(language) ? language[0] : language);
  return "";
}

async function parsePrestashop<T>(body: string): Promise<T> {
  const trimmed = body.trim();
  if (!trimmed) return {} as T;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed) as T;
  return (await parseStringPromise(trimmed, {
    explicitArray: false,
    trim: true,
    normalize: true,
    normalizeTags: false,
  })) as T;
}

function readCollection(root: unknown, ...paths: string[][]): any[] {
  for (const path of paths) {
    const value = getPath(root, path);
    const list = asList(value);
    if (list.length > 0) return list;
  }
  return [];
}

function getPath(root: unknown, path: string[]): unknown {
  let current: any = root;
  for (const key of path) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}

function asList(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "object") return [value];
  const rec = value as Record<string, unknown>;
  if (Array.isArray(rec.product)) return rec.product as any[];
  if (Array.isArray(rec.category)) return rec.category as any[];
  const nested = Object.values(rec).find(Array.isArray);
  if (nested) return nested as any[];
  return [value];
}

function getField(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v !== "object") return "";
  const rec = v as Record<string, unknown>;
  if ("_" in rec) return text(rec._);
  if ("value" in rec) return text(rec.value);
  const language = rec.language;
  if (language) return text(Array.isArray(language) ? language[0] : language);
  const first = Object.values(rec)[0];
  return text(first);
}

function truthy(v: unknown): boolean {
  const t = text(v).toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}