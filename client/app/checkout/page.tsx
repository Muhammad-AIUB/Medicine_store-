"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createOrderSchema, formatBdt, type CreateOrderInput, type StoreConfigDto } from "@medistore/shared";
import { api, ApiRequestError } from "@/lib/api";
import { cartSubtotalPaisa, loadCart, saveCart, setQty, type CartLine } from "@/lib/cart";

/*
 * Checkout flow:
 *   form (zod resolver — SAME schema the server enforces)
 *     → POST /orders (double-submit guarded)
 *       → success: clear cart, go to /order/[id]
 *       → failure: readable envelope message, cart PRESERVED
 */
export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [config, setConfig] = useState<StoreConfigDto | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { items: [] },
  });

  useEffect(() => {
    const lines = loadCart();
    setCart(lines);
    setValue(
      "items",
      lines.map((l) => ({ productId: l.productId, qty: l.qty })),
    );
    api.config().then((c) => {
      setConfig(c);
      if (c.servedAreas.length === 1) setValue("deliveryArea", c.servedAreas[0]);
    });
  }, [setValue]);

  const updateCart = (lines: CartLine[]) => {
    setCart(lines);
    saveCart(lines);
    setValue(
      "items",
      lines.map((l) => ({ productId: l.productId, qty: l.qty })),
    );
  };

  const onSubmit = async (data: CreateOrderInput) => {
    if (submitted.current) return; // double-click / rapid resubmit guard
    submitted.current = true;
    setSubmitting(true);
    setServerError(null);
    try {
      const order = await api.createOrder(data);
      saveCart([]);
      router.push(`/order/${order.id}`);
    } catch (e: unknown) {
      submitted.current = false;
      setSubmitting(false);
      setServerError(e instanceof ApiRequestError ? e.message : "Could not place the order. Please try again.");
    }
  };

  const subtotal = cartSubtotalPaisa(cart);
  const fee = config?.deliveryFeePaisa ?? 0;

  if (cart.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          Browse medicines
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/" className="text-sm text-emerald-700 hover:underline">
        ← Back to store
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Checkout</h1>

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {cart.map((l) => (
          <li key={l.productId} className="flex items-center justify-between gap-2 p-3 text-sm">
            <span>
              {l.name} {l.strength} <span className="text-slate-400">× {l.qty}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-medium">{formatBdt(l.pricePaisa * l.qty)}</span>
              <button
                type="button"
                onClick={() => updateCart(setQty(cart, l.productId, 0))}
                className="text-xs text-red-500 hover:underline"
                aria-label={`Remove ${l.name}`}
              >
                remove
              </button>
            </span>
          </li>
        ))}
        <li className="flex justify-between p-3 text-sm text-slate-600">
          <span>Delivery ({config?.servedAreas.join(", ")})</span>
          <span>{formatBdt(fee)}</span>
        </li>
        <li className="flex justify-between p-3 font-bold">
          <span>Total — cash on delivery</span>
          <span>{formatBdt(subtotal + fee)}</span>
        </li>
      </ul>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field label="Full name" error={errors.customerName?.message}>
          <input {...register("customerName")} className={inputCls} placeholder="Rahim Uddin" />
        </Field>
        <Field label="Mobile number (we call this to confirm)" error={errors.phone?.message}>
          <input {...register("phone")} className={inputCls} placeholder="01712345678" inputMode="numeric" />
        </Field>
        <Field label="Delivery area" error={errors.deliveryArea?.message}>
          <select {...register("deliveryArea")} className={inputCls}>
            <option value="">Select area…</option>
            {config?.servedAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Full address" error={errors.address?.message}>
          <textarea {...register("address")} className={inputCls} rows={2} placeholder="House 12, Road 5, Dhanmondi" />
        </Field>

        {serverError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {serverError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Placing order…" : `Place order — ${formatBdt(subtotal + fee)} (cash on delivery)`}
        </button>
        <p className="text-xs text-slate-500">
          We will call your number to confirm before delivery.{" "}
          {config ? `Order by ${config.deliveryCutoffHour}:00 for same-day delivery.` : ""}
        </p>
      </form>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-white";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
