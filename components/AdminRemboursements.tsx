"use client";
// Admin : crédits à examiner (client qui renonce après la visite car sa demande ne correspondait pas à la réalité).
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";
import { dateFr, eur } from "@/lib/calc";
import Ecarts from "@/components/Ecarts";
import type { Line } from "@/lib/types";

type Ligne = {
  id: string; created_at: string; precision?: string | null; demande_id: string;
  offres?: { numero?: string; total_ttc: number; total_ttc_initial?: number | null; lignes: Line[]; lignes_initiales?: Line[] | null };
  artisans?: { raison_sociale?: string };
  demandes?: { titre?: string; ville?: string; cp?: string };
};

export default function AdminRemboursements() {
  const [liste, setListe] = useState<Ligne[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [detail, setDetail] = useState("");

  const charger = () => sb().from("remboursements_credit")
    .select("id, created_at, precision, demande_id, offres(numero, total_ttc, total_ttc_initial, lignes, lignes_initiales), artisans(raison_sociale), demandes(titre, ville, cp)")
    .eq("statut", "en_attente").order("created_at")
    .then(({ data, error }) => { if (error) setErr(error.message); setListe((data as unknown as Ligne[]) || []); });
  useEffect(() => { charger(); }, []);

  async function decider(r: Ligne, rendre: boolean) {
    if (!confirm(rendre ? `Rendre le crédit à ${r.artisans?.raison_sociale} ?` : `Refuser le remboursement à ${r.artisans?.raison_sociale} ?`)) return;
    setBusy(r.id); setErr("");
    const { error } = await sb().rpc("admin_traiter_remboursement", { p_id: r.id, p_rendre: rendre });
    setBusy("");
    if (error) return setErr(error.message);
    setListe((l) => l.filter((x) => x.id !== r.id));
  }

  if (!liste.length && !err) return null;
  return (
    <div className="card space-y-3 border-violet-300">
      <p className="font-bold">💳 Crédits à examiner ({liste.length})</p>
      <p className="text-xs text-slate-500">Le client a renoncé après la visite en indiquant que sa demande ne correspondait pas à la réalité. Comparez les deux devis puis décidez.</p>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {liste.map((r) => {
        const o = r.offres;
        return (
          <div key={r.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="font-semibold">{r.artisans?.raison_sociale || "Artisan"} <span className="font-normal text-slate-500">· devis {o?.numero}</span></p>
            <p className="text-xs text-slate-500">{r.demandes?.titre} · {r.demandes?.cp} {r.demandes?.ville} · le {dateFr(r.created_at)}</p>
            <p className="text-sm">Provisoire <b>{o?.total_ttc_initial != null ? eur(Number(o.total_ttc_initial)) : "—"}</b> → définitif <b>{eur(Number(o?.total_ttc || 0))}</b> TTC</p>
            {r.precision && <p className="rounded-lg bg-slate-50 p-2 text-sm">💬 « {r.precision} »</p>}
            {o?.lignes_initiales && (
              detail === r.id
                ? <Ecarts initiales={o.lignes_initiales} finales={o.lignes} ttcAvant={Number(o.total_ttc_initial)} ttcApres={Number(o.total_ttc)} />
                : <button className="text-sm text-brand" onClick={() => setDetail(r.id)}>Voir les écarts ligne par ligne</button>
            )}
            <Link href={`/client/demande/${r.demande_id}`} className="block text-sm text-brand">Voir la demande et les photos du client →</Link>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" disabled={busy === r.id} onClick={() => decider(r, false)}>Refuser</button>
              <button className="btn-brand flex-1" disabled={busy === r.id} onClick={() => decider(r, true)}>Rendre le crédit</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
