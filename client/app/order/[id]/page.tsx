"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { OrderDto } from "@medistore/shared";
import { formatBdt } from "@medistore/shared";
import { api } from "@/lib/api";

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      setError("Invalid order number");
      return;
    }
    api
      .getOrder(id)
      .then(setOrder)
      .catch(() => setError("Order not found"));
  }, [params.id]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{error}</h1>
        <Link href="/" className="mt-4 inline-block text-emerald-700 underline">
          Back to store
        </Link>
      </main>
    );
  }

  if (!order) return <main className="mx-auto max-w-lg px-4 py-16 text-center text-slate-500">Loading…</main>;

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-3xl">✅</div>
        <h1 className="mt-2 text-2xl font-bold text-emerald-900">Order #{order.id} received</h1>
        <p className="mt-2 text-sm text-emerald-800">
          We will call <span className="font-semibold">{order.phone}</span> shortly to confirm your order.
          Pay {formatBdt(order.totalPaisa)} in cash when it arrives.
        </p>
      </div>

      <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between p-3 text-sm">
            <span>
              {i.productName} <span className="text-slate-400">× {i.qty}</span>
            </span>
            <span>{formatBdt(i.unitPricePaisa * i.qty)}</span>
          </li>
        ))}
        <li className="flex justify-between p-3 text-sm text-slate-600">
          <span>Delivery</span>
          <span>{formatBdt(order.deliveryFeePaisa)}</span>
        </li>
        <li className="flex justify-between p-3 font-bold">
          <span>Total (cash on delivery)</span>
          <span>{formatBdt(order.totalPaisa)}</span>
        </li>
      </ul>

      <p className="mt-4 text-center text-xs text-slate-500">
        Save your order number: <span className="font-mono font-semibold">#{order.id}</span>
      </p>
      <div className="mt-6 text-center">
        <Link href="/" className="text-emerald-700 underline">
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
