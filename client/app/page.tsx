"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ProductDto } from "@medistore/shared";
import { formatBdt } from "@medistore/shared";
import { api, ApiRequestError } from "@/lib/api";
import { addToCart, cartCount, cartSubtotalPaisa, loadCart, saveCart, setQty, type CartLine } from "@/lib/cart";

export default function StorePage() {
  const [products, setProducts] = useState<ProductDto[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCart(loadCart());
    api.categories().then(setCategories).catch(() => {});
  }, []);

  const fetchProducts = useCallback(
    (query: string, cat: string | null) => {
      setError(null);
      api
        .products(query || undefined, cat ?? undefined)
        .then(setProducts)
        .catch((e: unknown) => {
          setProducts([]);
          setError(e instanceof ApiRequestError ? e.message : "Failed to load products");
        });
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(q, category), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, category, fetchProducts]);

  const updateCart = (lines: CartLine[]) => {
    setCart(lines);
    saveCart(lines);
  };

  const inCart = (id: number) => cart.find((l) => l.productId === id);

  return (
    <main className="mx-auto max-w-5xl px-4">
      <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-xl font-bold text-emerald-700">
          MediStore
        </Link>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search medicine by name… e.g. "Napa"'
          className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          aria-label="Search medicine"
        />
        <Link
          href="/checkout"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Cart ({cartCount(cart)}) — {formatBdt(cartSubtotalPaisa(cart))}
        </Link>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(null)}
          className={`rounded-full border px-3 py-1 text-sm ${category === null ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-600 hover:border-slate-500"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c === category ? null : c)}
            className={`rounded-full border px-3 py-1 text-sm ${category === c ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-600 hover:border-slate-500"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {products === null ? (
        <p className="mt-8 text-sm text-slate-500">Loading products…</p>
      ) : products.length === 0 && !error ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
          No products match “{q}”. Try a generic name (e.g. “paracetamol”) or{" "}
          <a href="/policy" className="text-emerald-700 underline">
            call us
          </a>{" "}
          — we may be able to source it.
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {products?.map((p) => {
            const line = inCart(p.id);
            const out = p.stockQty <= 0;
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <div className="font-semibold">
                    {p.name} {p.strength && <span className="font-normal text-slate-500">{p.strength}</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.genericName} · {p.manufacturer} · {p.packUnit}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-emerald-700">{formatBdt(p.pricePaisa)}</div>
                </div>
                {out ? (
                  <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400">Out of stock</span>
                ) : line ? (
                  <div className="flex items-center gap-2" aria-label={`Quantity for ${p.name}`}>
                    <button
                      onClick={() => updateCart(setQty(cart, p.id, line.qty - 1))}
                      className="h-8 w-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{line.qty}</span>
                    <button
                      onClick={() => updateCart(addToCart(cart, p))}
                      className="h-8 w-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => updateCart(addToCart(cart, p))}
                    className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Add
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
