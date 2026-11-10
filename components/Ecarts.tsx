"use client";
// Compare le devis provisoire (avant visite) et le devis définitif (après visite), ligne par ligne.
import type { Line } from "@/lib/types";
import { eur } from "@/lib/calc";
import { ecartPct } from "@/lib/mer";

const montant = (l: Line) => (Number(l.qty) || 0) * (Number(l.unit_price) || 0);

export default function Ecarts({ initiales, finales, ttcAvant, ttcApres }: {
  initiales: Line[]; finales: Line[]; ttcAvant: number; ttcApres: number;
}) {
  const pct = ecartPct(ttcAvant, ttcApres);
  const avant = new Map(initiales.filter((l) => l.kind !== "section").map((l) => [l.label.trim().toLowerCase(), l]));
  const apres = new Map(finales.filter((l) => l.kind !== "section").map((l) => [l.label.trim().toLowerCase(), l]));
  const changes: { label: string; type: "ajout" | "retrait" | "modif"; avant?: number; apres?: number; detail?: string }[] = [];
  apres.forEach((l, k) => {
    const a = avant.get(k);
    if (!a) changes.push({ label: l.label, type: "ajout", apres: montant(l) });
    else if (montant(a) !== montant(l)) changes.push({
      label: l.label, type: "modif", avant: montant(a), apres: montant(l),
      detail: Number(a.qty) !== Number(l.qty) ? `quantité ${String(a.qty).replace(".", ",")} → ${String(l.qty).replace(".", ",")} ${l.unit}` : "prix unitaire modifié",
    });
  });
  avant.forEach((l, k) => { if (!apres.has(k)) changes.push({ label: l.label, type: "retrait", avant: montant(l) }); });

  const fort = pct > 15;
  return (
    <div className={`space-y-2 rounded-xl p-3 ${fort ? "bg-red-50" : pct > 0 ? "bg-amber-50" : "bg-green-50"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Après la visite</p>
        <p className="text-sm">{eur(ttcAvant)} → <b>{eur(ttcApres)}</b> <span className={`font-bold ${pct > 0 ? "text-red-700" : "text-green-700"}`}>({pct > 0 ? "+" : ""}{String(pct).replace(".", ",")} %)</span></p>
      </div>
      {fort && <p className="text-xs font-semibold text-red-800">⚠️ Hausse de plus de 15 % : demandez des explications à l'artisan, ou choisissez une autre offre.</p>}
      {!changes.length ? <p className="text-xs text-slate-600">Aucune ligne modifiée.</p> : (
        <ul className="space-y-1 text-xs">
          {changes.map((c, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{c.type === "ajout" ? "➕" : c.type === "retrait" ? "➖" : "✏️"} {c.label}{c.detail && <span className="text-slate-500"> ({c.detail})</span>}</span>
              <span className="shrink-0 font-semibold">{c.type === "ajout" ? `+${eur(c.apres!)}` : c.type === "retrait" ? `−${eur(c.avant!)}` : `${eur(c.avant!)} → ${eur(c.apres!)}`} HT</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
