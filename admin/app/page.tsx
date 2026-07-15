"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ALLOWED_TRANSITIONS, formatBdt, type OrderDto, type OrderStatus } from "@medistore/shared";
import { adminApi, ApiRequestError } from "@/lib/api";
import { useAdminGuard } from "@/lib/use-admin-auth";

const TRANSITION_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  CONFIRMED: "Confirm",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel",
};

const STATUS_FILTERS: (OrderStatus | "ALL")[] = ["ALL", "NEW", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export default function OrdersPage() {
  const router = useRouter();
  const guard = useAdminGuard();
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(
    async (f: OrderStatus | "ALL") => {
      const result = await guard(() => adminApi.orders(f === "ALL" ? undefined : f));
      if (result) setOrders(result);
    },
    [guard],
  );

  useEffect(() => {
    void refresh(filter);
  }, [filter, refresh]);

  const transition = async (id: number, status: OrderStatus) => {
    if (busyId !== null) return; // one transition at a time — no double-click races
    setBusyId(id);
    setError(null);
    try {
      const result = await guard(() => adminApi.setOrderStatus(id, status));
      if (result) await refresh(filter);
    } catch (e: unknown) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to update order");
      await refresh(filter);
    } finally {
      setBusyId(null);
    }
  };

  const logout = async () => {
    await adminApi.logout().catch(() => {});
    router.push("/login");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/products" className="text-slate-600 hover:text-slate-900 hover:underline">
            Products &amp; stock
          </Link>
          <button onClick={logout} className="text-slate-500 hover:text-red-600 hover:underline">
            Log out
          </button>
        </nav>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600 hover:border-slate-500"
            }`}
          >
            {f === "ALL" ? "All" : f.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          {error}
        </div>
      ) : null}

      {orders === null ? (
        <p className="mt-8 text-sm text-slate-500">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No orders {filter !== "ALL" ? `with status ${filter}` : "yet"}.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-3">#</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 align-top">
                  <td className="p-3 font-mono">{o.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{o.customerName}</div>
                    <a href={`tel:${o.phone}`} className="text-emerald-700 hover:underline">
                      {o.phone}
                    </a>
                    <div className="text-xs text-slate-500">
                      {o.deliveryArea} — {o.address}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {o.items.map((i) => (
                      <div key={i.id}>
                        {i.productName} × {i.qty}
                      </div>
                    ))}
                  </td>
                  <td className="p-3 font-semibold">{formatBdt(o.totalPaisa)}</td>
                  <td className="p-3">
                    <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs">
                      {o.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {ALLOWED_TRANSITIONS[o.status].map((next) => (
                        <button
                          key={next}
                          disabled={busyId !== null}
                          onClick={() => transition(o.id, next)}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-40 ${
                            next === "CANCELLED"
                              ? "border-red-300 text-red-600 hover:bg-red-50"
                              : "border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {TRANSITION_LABELS[next]}
                        </button>
                      ))}
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
