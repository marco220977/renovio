"use client";
// Avenants : travaux imprévus pendant le chantier, proposés par l'artisan, signés (ou refusés) par le client dans l'appli.
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { eur, dateFr } from "@/lib/calc";
import type { Line } from "@/lib/types";
import SignaturePad from "./SignaturePad";
import LignesEditeur, { nettoyerLignes } from "./LignesEditeur";
import { LignesVue } from "./Vues";
import { errMsg, type Avenant, type Tarif } from "@/lib/mer";

const STATUT: Record<string, [string, string]> = {
  propose: ["À signer", "bg-amber-100 text-amber-800"],
  accepte: ["Signé", "bg-green-100 text-green-800"],
  refuse: ["Refusé", "bg-red-100 text-red-700"],
  retire: ["Retiré", "bg-slate-100 text-slate-600"],
};

export default function Avenants({ offreId, moi, franchise, tarifs = [], nomClient = "" }: {
  offreId: string; moi: "client" | "artisan"; franchise?: boolean; tarifs?: Tarif[]; nomClient?: string;
}) {
  const [liste, setListe] = useState<Avenant[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [signer, setSigner] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);
  const [motif, setMotif] = useState("");
  const [lignes, setLignes] = useState<Line[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const charger = () => sb().from("avenants").select("*").eq("offre_id", offreId).order("created_at")
    .then(({ data }) => setListe((data as Avenant[]) || []));
  useEffect(() => { charger(); }, [offreId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function rpc(nom: string, args: Record<string, unknown>) {
    setErr(""); setBusy(true);
    const { error } = await sb().rpc(nom, args);
    setBusy(false);
    if (error) { setErr(errMsg(error)); return false; }
    charger(); return true;
  }

  async function proposer() {
    if (await rpc("proposer_avenant", { p_offre: offreId, p_motif: motif, p_lignes: nettoyerLignes(lignes) })) {
      setCreation(false); setMotif(""); setLignes([]);
    }
  }

  const signes = liste.filter((a) => a.statut === "accepte");
  const enAttente = liste.filter((a) => a.statut === "propose").length;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold">Avenants {enAttente > 0 && <span className="chip ml-1 bg-amber-100 text-amber-800">{enAttente} à signer</span>}</p>
        {signes.length > 0 && <p className="text-xs text-slate-500">Total signé : {eur(signes.reduce((s, a) => s + Number(a.total_ttc), 0))} TTC</p>}
      </div>
      <p className="text-xs text-slate-500">
        {moi === "artisan"
          ? "Travaux imprévus découverts pendant le chantier ? Faites signer un avenant au client avant de les réaliser."
          : "Tout travail en plus du devis signé doit passer par un avenant que vous signez ici. Ne validez rien à l'oral."}
      </p>
      {liste.map((a) => (
        <div key={a.id} className="rounded-xl border border-slate-200 p-3">
          <button className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setOuvert(ouvert === a.id ? null : a.id)}>
            <span><span className="font-semibold">{a.numero}</span><span className="block text-xs text-slate-500">{a.motif}</span></span>
            <span className="text-right"><b>{eur(a.total_ttc)}</b><span className={`chip mt-1 block ${STATUT[a.statut][1]}`}>{STATUT[a.statut][0]}</span></span>
          </button>
          {ouvert === a.id && (
            <div className="mt-2 space-y-2">
              <LignesVue lignes={a.lignes} franchise={franchise} />
              {a.signe_le && <p className="text-xs text-slate-500">Signé le {dateFr(a.signe_le)} par {a.signataire}</p>}
              {moi === "client" && a.statut === "propose" && (signer === a.id ? (
                <SignaturePad allowPhoto={false} defaultName={nomClient} onCancel={() => setSigner(null)}
                  onDone={async (nom, sig) => { if (await rpc("repondre_avenant", { p_avenant: a.id, p_accepte: true, p_nom: nom, p_signature: sig })) setSigner(null); }} />
              ) : (
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" disabled={busy} onClick={() => confirm("Refuser cet avenant ?") && rpc("repondre_avenant", { p_avenant: a.id, p_accepte: false })}>Refuser</button>
                  <button className="btn-brand flex-1" onClick={() => setSigner(a.id)}>Signer</button>
                </div>
              ))}
              {moi === "artisan" && a.statut === "propose" && (
                <button className="btn-ghost w-full" disabled={busy} onClick={() => rpc("retirer_avenant", { p_avenant: a.id })}>Retirer cet avenant</button>
              )}
            </div>
          )}
        </div>
      ))}
      {moi === "artisan" && !creation && <button className="btn-ghost w-full" onClick={() => setCreation(true)}>＋ Proposer un avenant</button>}
      {creation && (
        <div className="space-y-2">
          <label className="label">Pourquoi ces travaux en plus ?</label>
          <textarea className="input" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : canalisation en plomb découverte derrière la faïence, à remplacer." />
          <LignesEditeur lignes={lignes} onChange={setLignes} tarifs={tarifs} franchise={franchise} />
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setCreation(false)}>Annuler</button>
            <button className="btn-brand flex-1" disabled={busy} onClick={proposer}>Envoyer au client</button>
          </div>
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
