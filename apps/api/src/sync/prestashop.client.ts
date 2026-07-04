import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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

/** Klient PrestaShop Webservice API (format JSON, autoryzacja kluczem jako Basic Auth). */
@Injectable()
export class PrestashopClient {
  private readonly log = new Logger("PrestaShop");

  constructor(private readonly config: ConfigService) {}

  private base(): string {
    return (this.config.get<string>("PRESTASHOP_API_URL") ?? "").replace(/\/+$/, "");
  }

  private authHeader(): string {
    const key = this.config.get<string>("PRESTASHOP_API_KEY") ?? "";
    return "Basic " + Buffer.from(`${key}:`).toString("base64");
  }

  private async get<T>(path: string): Promise<T> {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${this.base()}${path}${sep}output_format=JSON`;
    const res = await fetch(url, { headers: { Authorization: this.authHeader() } });
    if (!res.ok) throw new Error(`PrestaShop ${res.status} przy ${path}`);
    return (await res.json()) as T;
  }

  async fetchCategories(): Promise<PsCategory[]> {
    const data = await this.get<{ categories?: unknown[] }>("/categories?display=full");
    return (data.categories ?? []).map((c: any) => ({ id: String(c.id), name: lang(c.name) }));
  }

  async fetchProducts(): Promise<PsProduct[]> {
    const data = await this.get<{ products?: unknown[] }>("/products?display=full");
    return (data.products ?? []).map((p: any) => ({
      id: String(p.id),
      name: lang(p.name),
      price: Number(p.price ?? 0),
      categoryId: p.id_category_default ? String(p.id_category_default) : undefined,
      barcode: p.ean13 || p.reference || undefined,
      active: p.active === "1" || p.active === 1 || p.active === true,
    }));
  }
}

/** PrestaShop zwraca pola wielojęzyczne w różnych kształtach — wyciągamy pierwszą wartość. */
function lang(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return (v[0] as any)?.value ?? "";
  const l = (v as any)?.language;
  if (l) return Array.isArray(l) ? l[0]?.value ?? "" : l?.value ?? "";
  return "";
}
