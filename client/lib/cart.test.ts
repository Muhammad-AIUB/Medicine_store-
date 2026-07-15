import { beforeEach, describe, expect, it } from "vitest";
import type { ProductDto } from "@medistore/shared";
import {
  addToCart,
  cartCount,
  cartSubtotalPaisa,
  loadCart,
  MAX_QTY_PER_ITEM,
  saveCart,
  setQty,
  type CartLine,
} from "./cart";

const product = (over: Partial<ProductDto> = {}): ProductDto => ({
  id: 1,
  name: "Napa",
  genericName: "Paracetamol",
  brand: "Napa",
  manufacturer: "Beximco",
  strength: "500mg",
  dosageForm: "Tablet",
  packUnit: "strip of 10",
  category: "Fever & Pain",
  pricePaisa: 1200,
  stockQty: 10,
  imageUrl: null,
  nearestExpiry: null,
  isPrescriptionRequired: false,
  isActive: true,
  ...over,
});

describe("addToCart", () => {
  it("adds a new line", () => {
    const lines = addToCart([], product());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ productId: 1, qty: 1, pricePaisa: 1200 });
  });

  it("merges quantity instead of duplicating the line", () => {
    let lines = addToCart([], product());
    lines = addToCart(lines, product());
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(2);
  });

  it("caps quantity at available stock", () => {
    let lines: CartLine[] = [];
    const p = product({ stockQty: 3 });
    for (let i = 0; i < 5; i++) lines = addToCart(lines, p);
    expect(lines[0].qty).toBe(3);
  });

  it(`caps quantity at the ${MAX_QTY_PER_ITEM}-per-item order limit`, () => {
    let lines: CartLine[] = [];
    const p = product({ stockQty: 100 });
    for (let i = 0; i < 30; i++) lines = addToCart(lines, p);
    expect(lines[0].qty).toBe(MAX_QTY_PER_ITEM);
  });
});

describe("setQty", () => {
  it("qty 0 removes the line", () => {
    const lines = setQty(addToCart([], product()), 1, 0);
    expect(lines).toHaveLength(0);
  });
});

describe("totals", () => {
  it("computes subtotal and count across lines", () => {
    let lines = addToCart([], product());
    lines = addToCart(lines, product({ id: 2, pricePaisa: 6500 }));
    lines = addToCart(lines, product({ id: 2, pricePaisa: 6500 }));
    expect(cartSubtotalPaisa(lines)).toBe(1200 + 2 * 6500);
    expect(cartCount(lines)).toBe(3);
  });
});

describe("persistence (localStorage)", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips the cart across page loads", () => {
    const lines = addToCart([], product());
    saveCart(lines);
    expect(loadCart()).toEqual(lines);
  });

  it("survives corrupted storage by returning an empty cart", () => {
    window.localStorage.setItem("medistore_cart_v1", "{not json");
    expect(loadCart()).toEqual([]);
  });
});
