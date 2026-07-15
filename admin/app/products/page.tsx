"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  formatBdt,
  productUpsertSchema,
  type ProductDto,
  type ProductUpsertFormInput,
  type ProductUpsertInput,
} from "@medistore/shared";
import { adminApi, ApiRequestError } from "@/lib/api";
import { useAdminGuard } from "@/lib/use-admin-auth";

export default function ProductsPage() {
  const guard = useAdminGuard();
  const [products, setProducts] = useState<ProductDto[] | null>(null);
  const [editing, setEditing] = useState<ProductDto | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await guard(() => adminApi.products());
    if (result) setProducts(result);
  }, [guard]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const adjustStock = async (p: ProductDto) => {
    const raw = window.prompt(`New stock quantity for "${p.name}" (current: ${p.stockQty})`);
    if (raw === null) return;
    const stockQty = Number(raw);
    if (!Number.isInteger(stockQty) || stockQty < 0) {
      setError("Stock must be a non-negative whole number");
      return;
    }
    try {
      await guard(() => adminApi.adjustStock(p.id, stockQty));
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to adjust stock");
    }
  };

  const deactivate = async (p: ProductDto) => {
    if (!window.confirm(`Hide "${p.name}" from the store? Order history is kept.`)) return;
    try {
      await guard(() => adminApi.deactivateProduct(p.id));
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to deactivate");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products &amp; stock</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-slate-900 hover:underline">
            ← Orders
          </Link>
          <button
            onClick={() => setEditing("new")}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Add product
          </button>
        </nav>
      </header>

      {error ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          {error}
        </div>
      ) : null}

      {editing ? (
        <ProductForm
          product={editing === "new" ? null : editing}
          onDone={async () => {
            setEditing(null);
            await refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      {products === null ? (
        <p className="mt-8 text-sm text-slate-500">Loading products…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Flags</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={`border-b border-slate-100 ${p.isActive ? "" : "opacity-50"}`}>
                  <td className="p-3">
                    <div className="font-medium">
                      {p.name} {p.strength}
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.genericName} · {p.manufacturer} · {p.packUnit}
                    </div>
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{formatBdt(p.pricePaisa)}</td>
                  <td className={`p-3 font-semibold ${p.stockQty === 0 ? "text-red-600" : ""}`}>{p.stockQty}</td>
                  <td className="p-3 text-xs">
                    {p.isPrescriptionRequired ? <span className="text-amber-600">Rx (hidden from store)</span> : null}
                    {!p.isActive ? <span className="text-slate-400"> inactive</span> : null}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setEditing(p)} className="text-emerald-700 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => adjustStock(p)} className="text-slate-600 hover:underline">
                        Stock
                      </button>
                      {p.isActive ? (
                        <button onClick={() => deactivate(p)} className="text-red-500 hover:underline">
                          Hide
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function ProductForm({
  product,
  onDone,
  onCancel,
}: {
  product: ProductDto | null;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductUpsertFormInput, unknown, ProductUpsertInput>({
    resolver: zodResolver(productUpsertSchema),
    defaultValues: product
      ? {
          name: product.name,
          genericName: product.genericName,
          brand: product.brand,
          manufacturer: product.manufacturer,
          strength: product.strength,
          dosageForm: product.dosageForm,
          packUnit: product.packUnit,
          category: product.category,
          pricePaisa: product.pricePaisa,
          stockQty: product.stockQty,
          isPrescriptionRequired: product.isPrescriptionRequired,
          isActive: product.isActive,
        }
      : { isPrescriptionRequired: false, isActive: true, brand: "", strength: "" },
  });

  const onSubmit = async (data: ProductUpsertInput) => {
    setBusy(true);
    setError(null);
    try {
      if (product) await adminApi.updateProduct(product.id, data);
      else await adminApi.createProduct(data);
      await onDone();
    } catch (e: unknown) {
      setError(e instanceof ApiRequestError ? e.message : "Save failed");
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 grid gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:grid-cols-3"
      noValidate
    >
      <h2 className="col-span-full font-semibold">{product ? `Edit: ${product.name}` : "New product"}</h2>
      <F label="Name" error={errors.name?.message}>
        <input {...register("name")} className={inputCls} />
      </F>
      <F label="Generic name" error={errors.genericName?.message}>
        <input {...register("genericName")} className={inputCls} />
      </F>
      <F label="Manufacturer" error={errors.manufacturer?.message}>
        <input {...register("manufacturer")} className={inputCls} />
      </F>
      <F label="Strength (e.g. 500mg)" error={errors.strength?.message}>
        <input {...register("strength")} className={inputCls} />
      </F>
      <F label="Dosage form (Tablet…)" error={errors.dosageForm?.message}>
        <input {...register("dosageForm")} className={inputCls} />
      </F>
      <F label="Pack unit (strip of 10…)" error={errors.packUnit?.message}>
        <input {...register("packUnit")} className={inputCls} />
      </F>
      <F label="Category" error={errors.category?.message}>
        <input {...register("category")} className={inputCls} />
      </F>
      <F label="Price (poisha — ৳1 = 100)" error={errors.pricePaisa?.message}>
        <input type="number" {...register("pricePaisa", { valueAsNumber: true })} className={inputCls} />
      </F>
      <F label="Stock qty" error={errors.stockQty?.message}>
        <input type="number" {...register("stockQty", { valueAsNumber: true })} className={inputCls} />
      </F>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isPrescriptionRequired")} /> Prescription required (hidden from store)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isActive")} /> Active
      </label>
      {error ? <div className="col-span-full rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}
      <div className="col-span-full flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 bg-white";

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
