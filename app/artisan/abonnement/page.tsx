"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { dateFr } from "@/lib/calc";
import { Erreur, Info } from "@/components/Espace";
import { FORMULES } from "@/lib/mer";

type Quota = { abonnement: string; fin?: string | null; quota: number | null; utilise: number };

function Abonnement() {
  const params = useSearchParams();
  const [q, setQ] = useState<Quota | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { sb().rpc("mon_quota").then(({ data }) => setQ(data as Quota)); }, []);

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
          {payant && q.fin && <p className="text-xs text-slate-500">Renouvellement vers le {dateFr(q.fin)}</p>}
          {payant && <button className="btn-ghost w-full" disabled={!!busy} onClick={() => aller("/api/abonnement/portail")}>Gérer / résilier mon abonnement</button>}
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
              : payant ? <button className="btn-ghost w-full" disabled={!!busy} onClick={() => aller("/api/abonnement/portail")}>Changer de formule</button>
              : <button className="btn-brand w-full" disabled={!!busy} onClick={() => aller("/api/abonnement", { plan: f.id }, f.id)}>{busy === f.id ? "…" : `Choisir ${f.nom}`}</button>}
          </div>
        ))}
      </div>
      <Erreur msg={err} />
      <p className="text-xs text-slate-400">Paiement par carte via Stripe. Cet abonnement est le seul paiement fait à Rénovio : les travaux se règlent directement entre vous et le client.</p>
    </div>
  );
}

export default function Page() { return <Suspense><Abonnement /></Suspense>; }
