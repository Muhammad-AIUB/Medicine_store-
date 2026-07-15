"use client";

import { useEffect, useState } from "react";
import type { StoreConfigDto } from "@medistore/shared";
import { api } from "@/lib/api";

/**
 * Trust layer (eng review T3): medicine buyers silently ask "is this store
 * real?" — answer with a name, a phone number, and a sourcing statement.
 */
export function TrustStrip() {
  const [config, setConfig] = useState<StoreConfigDto | null>(null);

  useEffect(() => {
    api.config().then(setConfig).catch(() => setConfig(null));
  }, []);

  return (
    <div className="border-b border-slate-100 bg-emerald-50">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-emerald-900">
        <span>
          Independently operated in {config?.servedAreas.join(", ") ?? "your area"} · medicines sourced
          from licensed local pharmacies · invoice with every delivery
        </span>
        {config?.supportPhone ? (
          <a href={`tel:${config.supportPhone}`} className="font-semibold hover:underline">
            Call us: {config.supportPhone}
          </a>
        ) : null}
      </div>
    </div>
  );
}
