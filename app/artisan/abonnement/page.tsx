"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { dateFr } from "@/lib/calc";
import { Erreur, Info } from "@/components/Espace";
import { FORMULES } from "@/lib/mer";

type Quota = { abonnement: string; fin?: string | null; quota: number | null; utilise: number; bonus?: number; resilie?: boolean; stripe?: boolean };

function Abonnement() {
  const params = useSearchParams();
  const [q, setQ] = useState<Quota | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const charger = () => sb().rpc("mon_quota").then(({ data }) => setQ(data as Quota));
  useEffect(() => { charger(); }, []);

  async function resilier(annuler = false) {
    if (!annuler && !confirm("Résilier votre abonnement ? Il reste actif jusqu'à la fin du mois payé, puis vous repassez en Découverte (3 offres par mois).")) return;
    setErr(""); setBusy("resilier");
    const r = await fetch("/api/abonnement/resilier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ annuler }) });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) return setErr(j.error || "Erreur");
    setQ(q && { ...q, resilie: j.resilie, fin: j.fin || q.fin }); setTimeout(charger, 4000);
  }

  async function aller(route: string, body?: unknown, cle = "") {
    setErr(""); setBusy(cle || route);
    const r = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (j.url) location.href = j.url; else { setErr(j.error || "Erreur"); setBusy(""); }
  }

  const actuelle = FORMULES.find((f) => f.id === q?.abonnement) || FORMULES[0];
  const payant = actuelle.prix > 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Mon abonnement</h1>
      {params.get("ok") && <Info>✅ Merci ! Votre abonnement est en cours d'activation (quelques secondes).</Info>}
      {q && (
        <div className="card space-y-2">
          <p className="text-sm text-slate-500">Formule actuelle</p>
          <p className="text-xl font-extrabold">{actuelle.nom}</p>
          <p className="text-sm">
            {q.quota === null ? `${q.utilise} offre(s) envoyée(s) ce mois-ci · illimité` : `${q.utilise} / ${q.quota} offres utilisées ce mois-ci`}
          </p>
          {q.quota !== null && (
            <div className="h-2 rounded-full bg-slate-200"><div className={`h-full rounded-full ${q.utilise >= q.quota ? "bg-red-500" : "bg-flame"}`} style={{ width: `${Math.min(100, (q.utilise / q.quota) * 100)}%` }} /></div>
          )}
          {payant && q.fin && <p className="text-xs text-slate-500">Valable jusqu'au {dateFr(q.fin)}</p>}
          {!!q.bonus && <p className="text-sm font-semibold text-green-700">🎁 {q.bonus} offre(s) bonus en réserve</p>}
          {payant && !q.stripe && <p className="text-xs text-green-700">🎁 Formule offerte par Rénolien</p>}
          {payant && q.stripe && (q.resilie ? (
            <>
              <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Abonnement résilié : il s'arrête {q.fin ? `le ${dateFr(q.fin)}` : "à la fin du mois payé"}.</p>
              <button className="btn-ghost w-full" disabled={!!busy} onClick={() => resilier(true)}>Annuler la résiliation</button>
            </>
          ) : (
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" disabled={!!busy} onClick={() => aller("/api/abonnement/portail")}>Factures / carte</button>
              <button className="btn-danger flex-1" disabled={!!busy} onClick={() => resilier()}>Résilier</button>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-slate-600">Le compteur repart à zéro le 1ᵉʳ de chaque mois. Une modification d'offre ne compte pas. Sans engagement, résiliable à tout moment.</p>
      <div className="space-y-3">
        {FORMULES.map((f) => (
          <div key={f.id} className={`card space-y-2 ${f.id === "pro" ? "border-2 border-flame" : ""} ${f.id === actuelle.id ? "bg-slate-50" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold">{f.nom} {f.id === "pro" && <span className="chip ml-1 bg-flame text-white">{f.plus}</span>}</p>
                <p className="text-sm text-slate-600">{f.quota === null ? "Offres illimitées" : `${f.quota} offres par mois`}</p>
              </div>
              <p className="text-right"><span className="text-2xl font-extrabold">{f.prix} €</span><span className="text-xs text-slate-500"> /mois</span></p>
            </div>
            {f.id === actuelle.id ? <p className="text-center text-sm font-semibold text-green-700">✔ Votre formule</p>
              : f.prix === 0 ? null
              : q?.stripe ? <button className="btn-ghost w-full" disabled={!!busy} onClick={() => aller("/api/abonnement/portail")}>Changer de formule</button>
              : <button className="btn-brand w-full" disabled={!!busy} onClick={() => aller("/api/abonnement", { plan: f.id }, f.id)}>{busy === f.id ? "…" : `Choisir ${f.nom}`}</button>}
          </div>
        ))}
      </div>
      <a href="/artisan/parrainage" className="card flex items-center justify-between !p-3 text-sm">
        <span>🎁 Parrainez un artisan : <b>+5 offres</b> pour vous</span><b className="text-brand">→</b>
      </a>
      <Erreur msg={err} />
      <p className="text-xs text-slate-400">En vous abonnant, vous acceptez les <a href="/legal/cgv" className="underline">conditions générales de vente</a>. Paiement par carte via Stripe. Cet abonnement est le seul paiement fait à Rénolien : les travaux se règlent directement entre vous et le client.</p>
    </div>
  );
}

export default function Page() { return <Suspense><Abonnement /></Suspense>; }
