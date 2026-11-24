"use client";
// Comparatif des devis poste par poste : les lots du cahier des charges en lignes, les artisans en colonnes.
import { Fragment, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { eur } from "@/lib/calc";
import type { Artisan, Demande, Offre } from "@/lib/mer";
import type { Line } from "@/lib/types";

type Groupe = { titre: string; lignes: Line[]; ttc: number };

const ttcLigne = (l: Line) => (Number(l.qty) || 0) * (Number(l.unit_price) || 0) * (1 + (Number(l.vat_rate) || 0) / 100);
const numeroLot = (s: string) => { const m = /lot\s*(\d+)/i.exec(s || ""); return m ? Number(m[1]) : null; };
const court = (s?: string) => { const t = (s || "Artisan").trim(); return t.length > 16 ? t.slice(0, 15) + "…" : t; };

/** Découpe un devis en lots (titres de section) avec leur total TTC */
function groupes(lignes: Line[]): Groupe[] {
  const out: Groupe[] = [];
  let cur: Groupe | null = null;
  for (const l of lignes || []) {
    if (l.kind === "section") { cur = { titre: l.label, lignes: [], ttc: 0 }; out.push(cur); continue; }
    if (!cur) { cur = { titre: "", lignes: [], ttc: 0 }; out.push(cur); }
    cur.lignes.push(l); cur.ttc += ttcLigne(l);
  }
  return out.filter((g) => g.lignes.length);
}

export default function Comparatif({ d, offres, artisans, onVoir }: {
  d: Demande; offres: Offre[]; artisans: Record<string, Artisan>; onVoir: (o: Offre) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);

  const t = useMemo(() => {
    const lots = (d.cahier?.lots || []).map((l, i) => ({ titre: l.titre, num: numeroLot(l.titre) ?? i + 1 }));
    const rows: { titre: string }[] = lots.map((l) => ({ titre: l.titre }));
    const autres = rows.length; // ligne « Autres postes » pour ce qui ne correspond à aucun lot
    rows.push({ titre: "Autres postes" });
    // cellules[ligne][offre] = { ttc, lignes }
    const cel: { ttc: number; lignes: Line[] }[][] = rows.map(() => offres.map(() => ({ ttc: 0, lignes: [] })));
    offres.forEach((o, j) => {
      groupes(o.lignes).forEach((g, k) => {
        const n = numeroLot(g.titre);
        let i = n !== null ? lots.findIndex((l) => l.num === n) : -1;
        if (i < 0 && !g.titre) i = autres;
        if (i < 0) i = lots.length && k < lots.length && n === null ? k : autres;
        cel[i][j].ttc += g.ttc; cel[i][j].lignes.push(...g.lignes);
      });
    });
    const garder = rows.map((_, i) => cel[i].some((c) => c.lignes.length));
    return { rows, cel, garder };
  }, [d.cahier, offres]);

  if (offres.length < 2) return null;

  const minMax = (vals: number[]) => {
    const v = vals.filter((x) => x > 0);
    return v.length >= 2 ? [Math.min(...v), Math.max(...v)] : [NaN, NaN];
  };
  const totaux = offres.map((o) => o.total_ttc);
  const [tMin, tMax] = minMax(totaux);

  return (
    <>
      <button className="btn-ghost w-full" onClick={() => setOuvert(true)}>📊 Comparer les {offres.length} devis poste par poste</button>
      {ouvert && (
        <Modal title="Comparatif poste par poste" onClose={() => { setOuvert(false); setDetail(null); }} tall>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            <p className="text-xs text-slate-500">Montants TTC par lot du cahier des charges. <span className="font-semibold text-green-700">Vert</span> = le moins cher, <span className="font-semibold text-red-700">rouge</span> = le plus cher. Touchez un lot pour voir le détail de chaque devis.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-max text-sm">
                <thead className="bg-slate-50 text-xs">
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-50 p-2 text-left">Lot</th>
                    {offres.map((o) => (
                      <th key={o.id} className="p-2 text-right">
                        <button className="font-bold text-brand underline" onClick={() => onVoir(o)}>{court(artisans[o.artisan_id]?.raison_sociale)}</button>
                        {artisans[o.artisan_id]?.rge && <span className="block font-normal text-emerald-700">🌿 RGE</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, i) => {
                    if (!t.garder[i]) return null;
                    const vals = t.cel[i].map((c) => c.ttc);
                    const [mn, mx] = minMax(vals);
                    return (
                      <Fragment key={i}>
                        <tr className={`cursor-pointer border-t border-slate-100 ${detail === i ? "bg-orange-50" : ""}`} onClick={() => setDetail(detail === i ? null : i)}>
                          <td className="sticky left-0 z-10 max-w-[9rem] bg-white p-2 text-xs font-semibold leading-tight">{r.titre} <span className="text-slate-400">{detail === i ? "▲" : "▼"}</span></td>
                          {t.cel[i].map((c, j) => (
                            <td key={j} className={`p-2 text-right tabular-nums ${c.ttc === mn ? "font-bold text-green-700" : c.ttc === mx ? "text-red-700" : ""}`}>
                              {c.lignes.length ? eur(c.ttc) : <span className="text-xs text-slate-400">non chiffré</span>}
                            </td>
                          ))}
                        </tr>
                        {detail === i && (
                          <tr className="bg-orange-50/50">
                            <td colSpan={offres.length + 1} className="space-y-2 p-2">
                              {offres.map((o, j) => (
                                <div key={o.id} className="rounded-lg bg-white p-2 text-xs">
                                  <p className="font-bold">{artisans[o.artisan_id]?.raison_sociale || "Artisan"}</p>
                                  {t.cel[i][j].lignes.length ? t.cel[i][j].lignes.map((l, k) => (
                                    <p key={k} className="flex justify-between gap-2 border-t border-slate-100 py-0.5">
                                      <span>{l.label} <span className="text-slate-400">· {l.qty} {l.unit}</span></span>
                                      <span className="shrink-0 tabular-nums">{eur(ttcLigne(l))}</span>
                                    </p>
                                  )) : <p className="text-slate-400">Rien de chiffré pour ce lot : demandez-lui pourquoi (oubli, ou compris ailleurs ?).</p>}
                                </div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-extrabold">
                    <td className="sticky left-0 z-10 bg-slate-50 p-2">Total TTC</td>
                    {offres.map((o) => <td key={o.id} className={`p-2 text-right tabular-nums ${o.total_ttc === tMin ? "text-green-700" : o.total_ttc === tMax ? "text-red-700" : ""}`}>{eur(o.total_ttc)}</td>)}
                  </tr>
                  <tr className="text-xs text-slate-600">
                    <td className="sticky left-0 z-10 bg-white p-2">Démarrage</td>
                    {offres.map((o) => <td key={o.id} className="p-2 text-right">{o.delai_jours != null ? `sous ${o.delai_jours} j` : "—"}</td>)}
                  </tr>
                  <tr className="text-xs text-slate-600">
                    <td className="sticky left-0 z-10 bg-white p-2">Durée</td>
                    {offres.map((o) => <td key={o.id} className="p-2 text-right">{o.duree_jours ? `${o.duree_jours} j` : "—"}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">⚠️ Un lot « non chiffré » ou beaucoup moins cher peut cacher un oubli : posez la question à l'artisan avant de choisir. Prix provisoires, confirmés après la visite.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
