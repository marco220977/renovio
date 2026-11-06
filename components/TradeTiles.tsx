"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { tradesOf } from "@/lib/trades";

/** Accueil : un rectangle par corps de métier de l'entreprise, qui ouvre son espace métier */
export default function TradeTiles({ trades }: { trades?: string[] | null }) {
  const list = tradesOf(trades);
  const [count, setCount] = useState<Record<string, number>>({});
  useEffect(() => {
    sb().from("catalog_items").select("trade").then(({ data }) => {
      const c: Record<string, number> = {};
      (data || []).forEach((r: any) => { if (r.trade) c[r.trade] = (c[r.trade] || 0) + 1; });
      setCount(c);
    });
  }, []);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">Mes métiers</h2>
        <Link href="/app/parametres" className="text-sm text-brand">Modifier →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {list.map((t) => (
          <Link key={t.id} href={`/app/metier/${t.id}`} className="card flex items-center gap-3 !p-3 active:scale-[0.98]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl">{t.emoji}</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{t.label}</span>
              <span className="block text-xs text-slate-500">{count[t.id] || 0} prestation(s)</span>
            </span>
          </Link>
        ))}
        <Link href="/app/parametres" className="card flex items-center justify-center gap-2 border-dashed !p-3 text-sm font-semibold text-slate-500">
          ＋ {list.length ? "Ajouter un métier" : "Choisir mes métiers"}
        </Link>
      </div>
    </section>
  );
}
