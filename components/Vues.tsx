"use client";
// Affichages partagés : cahier des charges, lignes de devis, photos, étoiles.
import { useEffect, useState } from "react";
import type { Line } from "@/lib/types";
import { computeTotals, eur, sectionTotals } from "@/lib/calc";
import { TRADE } from "@/lib/trades";
import { urlsPhotos, type Cahier } from "@/lib/mer";

export function Metiers({ ids }: { ids: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(ids || []).map((m) => <span key={m} className="chip bg-slate-100 text-slate-700">{TRADE[m]?.emoji} {TRADE[m]?.label || m}</span>)}
    </div>
  );
}

export function CahierVue({ cahier, budget = true }: { cahier: Cahier; budget?: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">{cahier.resume}</p>
      {budget && cahier.budget_max > 0 && (
        <div className="rounded-xl bg-flame-light p-3">
          <p className="text-xs font-semibold uppercase text-flame">Budget estimé (indicatif)</p>
          <p className="text-xl font-extrabold">{eur(cahier.budget_min)} – {eur(cahier.budget_max)} <span className="text-sm font-medium text-slate-500">TTC</span></p>
        </div>
      )}
      {cahier.lots?.map((l) => (
        <div key={l.titre} className="rounded-xl border border-slate-200 p-3">
          <p className="font-bold">{l.titre}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {l.postes?.map((p, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{p.designation}{p.precisions && <span className="block text-xs text-slate-500">{p.precisions}</span>}</span>
                {p.quantite != null && <span className="shrink-0 font-semibold text-slate-600">{String(p.quantite).replace(".", ",")} {p.unite}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!!cahier.points_attention?.length && (
        <div className="text-sm">
          <p className="font-semibold">À vérifier lors de la visite</p>
          <ul className="list-disc pl-5 text-slate-600">{cahier.points_attention.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export function LignesVue({ lignes, franchise }: { lignes: Line[]; franchise?: boolean }) {
  const lots = sectionTotals(lignes);
  const t = computeTotals(lignes, 0, franchise);
  return (
    <div className="space-y-1 text-sm">
      {lignes.map((l, i) => l.kind === "section" ? (
        <div key={i} className="mt-2 flex justify-between rounded-lg bg-slate-100 px-2 py-1 font-bold">
          <span>{l.label}</span><span>{eur(lots[i])} HT</span>
        </div>
      ) : (
        <div key={i} className="flex justify-between gap-3 border-b border-slate-100 px-2 py-1.5">
          <span>{l.label}
            {l.description && <span className="block text-xs text-slate-500">{l.description}</span>}
            <span className="block text-xs text-slate-500">{String(l.qty).replace(".", ",")} {l.unit} × {eur(l.unit_price)}{!franchise && ` · TVA ${String(l.vat_rate).replace(".", ",")} %`}</span>
          </span>
          <span className="shrink-0 font-semibold">{eur((Number(l.qty) || 0) * (Number(l.unit_price) || 0))}</span>
        </div>
      ))}
      <div className="mt-3 space-y-0.5 px-2 text-right">
        <p>Total HT : <b>{eur(t.ht)}</b></p>
        {franchise ? <p className="text-xs text-slate-500">TVA non applicable, art. 293 B du CGI</p> : <p>TVA : <b>{eur(t.vat)}</b></p>}
        <p className="text-lg">Total TTC : <b>{eur(t.ttc)}</b></p>
      </div>
    </div>
  );
}

export function Photos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { urlsPhotos(paths).then(setUrls); }, [paths]);
  if (!urls.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto">
      {urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" /></a>)}
    </div>
  );
}

export function Etoiles({ note, nb }: { note?: number; nb?: number }) {
  if (!nb) return <span className="text-xs text-slate-400">Pas encore d'avis</span>;
  return <span className="text-xs font-semibold text-amber-600">★ {String(note).replace(".", ",")} <span className="text-slate-400">({nb} avis)</span></span>;
}
