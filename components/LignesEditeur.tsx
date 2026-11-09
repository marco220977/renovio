"use client";
// Édition des lignes du devis (lots, quantités, prix, TVA) + ajout depuis les tarifs de l'artisan.
import { useState } from "react";
import type { Line } from "@/lib/types";
import { computeTotals, eur, VAT_RATES } from "@/lib/calc";
import Modal from "./Modal";
import type { Tarif } from "@/lib/mer";

/** Saisie en cours (virgule acceptée) ; convertie en nombre à l'envoi avec nettoyerLignes */
const brut = (v: string) => v.replace(",", ".").replace(/[^\d.]/g, "") as unknown as number;

export const nettoyerLignes = (l: Line[]): Line[] => l.map((x): Line => x.kind === "section"
  ? { kind: "section", label: x.label.trim() || "Lot", qty: 0, unit: "", unit_price: 0, vat_rate: 0 }
  : { label: x.label.trim(), description: x.description || "", qty: Number(x.qty) || 0, unit: x.unit || "u", unit_price: Number(x.unit_price) || 0, vat_rate: Number(x.vat_rate) || 0 })
  .filter((x) => x.kind === "section" || x.label);

export default function LignesEditeur({ lignes, onChange, tarifs, franchise }: {
  lignes: Line[]; onChange: (l: Line[]) => void; tarifs: Tarif[]; franchise?: boolean;
}) {
  const [choix, setChoix] = useState(false);
  const [q, setQ] = useState("");
  const maj = (i: number, p: Partial<Line>) => onChange(lignes.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const suppr = (i: number) => onChange(lignes.filter((_, j) => j !== i));
  const monter = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= lignes.length) return;
    const c = [...lignes]; [c[i], c[j]] = [c[j], c[i]]; onChange(c);
  };
  const t = computeTotals(lignes, 0, franchise);
  const filtres = tarifs.filter((x) => !q || x.libelle.toLowerCase().includes(q.toLowerCase())).slice(0, 80);

  return (
    <div className="space-y-2">
      {lignes.map((l, i) => l.kind === "section" ? (
        <div key={i} className="flex items-center gap-1 rounded-xl bg-slate-100 p-2">
          <input className="input !bg-transparent !py-1.5 font-bold" value={l.label} onChange={(e) => maj(i, { label: e.target.value })} />
          <Fleches i={i} monter={monter} suppr={suppr} />
        </div>
      ) : (
        <div key={i} className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex items-start gap-1">
            <input className="input !py-1.5" value={l.label} onChange={(e) => maj(i, { label: e.target.value })} placeholder="Désignation" />
            <Fleches i={i} monter={monter} suppr={suppr} />
          </div>
          {l.description !== undefined && l.description !== "" && (
            <input className="input !py-1 text-xs text-slate-500" value={l.description} onChange={(e) => maj(i, { description: e.target.value })} />
          )}
          <div className="grid grid-cols-4 gap-1.5 text-sm">
            <label><span className="text-[10px] text-slate-400">Qté</span>
              <input className="input !px-2 !py-1.5" inputMode="decimal" value={String(l.qty)} onChange={(e) => maj(i, { qty: brut(e.target.value) })} /></label>
            <label><span className="text-[10px] text-slate-400">Unité</span>
              <input className="input !px-2 !py-1.5" value={l.unit} onChange={(e) => maj(i, { unit: e.target.value })} /></label>
            <label><span className="text-[10px] text-slate-400">PU HT</span>
              <input className="input !px-2 !py-1.5" inputMode="decimal" value={String(l.unit_price)} onChange={(e) => maj(i, { unit_price: brut(e.target.value) })} /></label>
            <label><span className="text-[10px] text-slate-400">TVA</span>
              <select className="input !px-1 !py-1.5" value={l.vat_rate} disabled={franchise} onChange={(e) => maj(i, { vat_rate: Number(e.target.value) })}>
                {VAT_RATES.map((r) => <option key={r} value={r}>{String(r).replace(".", ",")} %</option>)}
              </select></label>
          </div>
          <p className="text-right text-sm font-semibold">{eur((Number(l.qty) || 0) * (Number(l.unit_price) || 0))} HT</p>
        </div>
      ))}

      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="btn-ghost !px-2 text-sm" onClick={() => onChange([...lignes, { kind: "section", label: `Lot ${lignes.filter((x) => x.kind === "section").length + 1}`, qty: 0, unit: "", unit_price: 0, vat_rate: 0 }])}>＋ Lot</button>
        <button type="button" className="btn-ghost !px-2 text-sm" onClick={() => onChange([...lignes, { label: "", qty: 1, unit: "u", unit_price: 0, vat_rate: franchise ? 0 : 10 }])}>＋ Ligne</button>
        <button type="button" className="btn-ghost !px-2 text-sm" onClick={() => setChoix(true)}>💶 Mes tarifs</button>
      </div>

      <div className="rounded-xl bg-ink p-3 text-right text-white">
        <p className="text-sm">HT {eur(t.ht)} · TVA {eur(t.vat)}</p>
        <p className="text-xl font-extrabold">{eur(t.ttc)} TTC</p>
      </div>

      {choix && (
        <Modal title="Ajouter depuis mes tarifs" onClose={() => setChoix(false)} tall>
          <input className="input mb-2 shrink-0" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {!tarifs.length && <p className="text-sm text-slate-500">Aucun tarif. Ajoutez-les dans l'onglet « Tarifs ».</p>}
            {filtres.map((x) => (
              <button key={x.id} type="button" className="flex w-full justify-between gap-2 rounded-lg border border-slate-100 p-2 text-left text-sm"
                onClick={() => { onChange([...lignes, { label: x.libelle, description: x.description || "", qty: 1, unit: x.unite, unit_price: Number(x.prix_ht), vat_rate: franchise ? 0 : Number(x.tva) }]); setChoix(false); }}>
                <span>{x.libelle}</span><span className="shrink-0 font-semibold">{eur(x.prix_ht)}/{x.unite}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Fleches({ i, monter, suppr }: { i: number; monter: (i: number, d: -1 | 1) => void; suppr: (i: number) => void }) {
  return (
    <div className="flex shrink-0 text-slate-400">
      <button type="button" className="px-1.5" onClick={() => monter(i, -1)}>↑</button>
      <button type="button" className="px-1.5" onClick={() => monter(i, 1)}>↓</button>
      <button type="button" className="px-1.5 text-red-500" onClick={() => suppr(i)}>✕</button>
    </div>
  );
}
