import type { ProductDto } from "@medistore/shared";

export interface CartLine {
  productId: number;
  name: string;
  strength: string;
  packUnit: string;
  pricePaisa: number;
  qty: number;
}

const KEY = "medistore_cart_v1";
export const MAX_QTY_PER_ITEM = 20;

export function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lines));
}

/** Adding an existing product merges quantities (capped) instead of duplicating lines. */
export function addToCart(lines: CartLine[], product: ProductDto, qty = 1): CartLine[] {
  const existing = lines.find((l) => l.productId === product.id);
  if (existing) {
    return lines.map((l) =>
      l.productId === product.id
        ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY_PER_ITEM, product.stockQty) }
        : l,
    );
  }
  return [
    ...lines,
    {
      productId: product.id,
      name: product.name,
      strength: product.strength,
      packUnit: product.packUnit,
      pricePaisa: product.pricePaisa,
      qty: Math.min(qty, MAX_QTY_PER_ITEM, product.stockQty),
    },
  ];
}

export function setQty(lines: CartLine[], productId: number, qty: number): CartLine[] {
  if (qty <= 0) return lines.filter((l) => l.productId !== productId);
  return lines.map((l) =>
    l.productId === productId ? { ...l, qty: Math.min(qty, MAX_QTY_PER_ITEM) } : l,
  );
}

export function cartSubtotalPaisa(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.pricePaisa * l.qty, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}
