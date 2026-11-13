"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { dateFr } from "@/lib/calc";
import { Erreur, Info } from "@/components/Espace";
import { FORMULES } from "@/lib/mer";
import { texteClients, texteAttente } from "@/lib/formules";

type Quota = { abonnement: string; fin?: string | null; quota: number | null; utilise: number; bonus?: number; attente?: number; plafond?: number | null; en_pause?: number; resilie?: boolean; stripe?: boolean; fondateur?: boolean; lancement?: boolean; lancement_fin?: string; remise?: number };

function Abonnement() {
  const params = useSearchParams();
  const [q, setQ] = useState<Quota | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const charger = () => sb().rpc("mon_quota").then(({ data }) => setQ(data as Quota));
  useEffect(() => { charger(); }, []);

  async function resilier(annuler = false) {
    if (!annuler && !confirm("Résilier votre abonnement ? Il reste actif jusqu'à la fin du mois payé, puis vous repassez en Découverte (1 client par mois).")) return;
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
  const gratuitLancement = !!(q?.fondateur && q?.lancement);
  const remise = q?.fondateur ? q?.remise || 0 : 0;
  const prixFinal = (p: number) => Math.round(p * (100 - remise)) / 100;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Mon abonnement</h1>
      {params.get("ok") && <Info>✅ Merci ! Votre abonnement est en cours d'activation (quelques secondes).</Info>}
      {q?.fondateur && (
        <div className="rounded-2xl bg-gradient-to-r from-flame to-orange-400 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-white/90">🚀 Membre fondateur</p>
          {gratuitLancement ? (
            <p className="mt-1 text-sm">Rénolien est <b>100 % gratuit et illimité</b> pour vous jusqu'au <b>{q.lancement_fin ? dateFr(q.lancement_fin) : "la fin du lancement"}</b>. Vous n'avez rien à payer. Ensuite, vous gardez <b>-{q.remise} % à vie</b> sur toutes les formules. Nous vous préviendrons un mois avant.</p>
          ) : (
            <p className="mt-1 text-sm">Merci d'avoir été là dès le début : vous bénéficiez de <b>-{q.remise} % à vie</b> sur toutes les formules.</p>
          )}
        </div>
      )}
      {q && (
        <div className="card space-y-2">
          <p className="text-sm text-slate-500">Formule actuelle</p>
          <p className="text-xl font-extrabold">{actuelle.nom}</p>
          <p className="text-sm">
            {q.quota === null ? `${q.utilise} client(s) ce mois-ci · illimité` : `${q.utilise} / ${q.quota} client(s) ce mois-ci`}
          </p>
          {q.quota !== null && (
            <div className="h-2 rounded-full bg-slate-200"><div className={`h-full rounded-full ${q.utilise >= q.quota ? "bg-red-500" : "bg-flame"}`} style={{ width: `${Math.min(100, (q.utilise / q.quota) * 100)}%` }} /></div>
          )}
          {!!q.en_pause && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-900">🔒 {q.en_pause} offre(s) en pause, invisibles pour les clients. Passez à une formule supérieure pour les réactiver immédiatement.</p>}
          {q.plafond != null && <p className="text-xs text-slate-500">📨 {q.attente || 0} / {q.plafond} offres en attente de réponse</p>}
          {payant && q.fin && <p className="text-xs text-slate-500">Valable jusqu'au {dateFr(q.fin)}</p>}
          {!!q.bonus && <p className="text-sm font-semibold text-green-700">🎁 {q.bonus} client(s) offert(s) en réserve</p>}
          {payant && !q.stripe && <p className="text-xs text-green-700">🎁 {gratuitLancement ? "Offerte pendant la phase de lancement" : "Formule offerte par Rénolien"}</p>}
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
      <p className="text-sm text-slate-600"><b>Vous ne payez que les clients qui vous choisissent.</b> Envoyer une offre ne coûte rien : un crédit est décompté seulement quand un client choisit votre offre, et il vous est rendu si le client renonce avant la visite. Le compteur repart à zéro le 1ᵉʳ de chaque mois. Sans engagement, résiliable à tout moment.</p>
      <div className="space-y-3">
        {FORMULES.map((f) => (
          <div key={f.id} className={`card space-y-2 ${f.id === "pro" ? "border-2 border-flame" : ""} ${f.id === actuelle.id ? "bg-slate-50" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold">{f.nom} {f.id === "pro" && <span className="chip ml-1 bg-flame text-white">{f.plus}</span>}</p>
                <p className="text-sm text-slate-600">{texteClients(f.quota)} · {texteAttente(f.attente)}</p>
              </div>
              <p className="text-right">
                {remise > 0 && f.prix > 0 && <span className="block text-xs text-slate-400 line-through">{f.prix} €</span>}
                <span className="text-2xl font-extrabold">{remise > 0 && f.prix > 0 ? prixFinal(f.prix).toLocaleString("fr-FR") : f.prix} €</span><span className="text-xs text-slate-500"> /mois</span>
              </p>
            </div>
            {f.id === actuelle.id ? <p className="text-center text-sm font-semibold text-green-700">✔ Votre formule{gratuitLancement ? " (offerte pendant le lancement)" : ""}</p>
              : gratuitLancement ? null
              : f.prix === 0 ? null
              : q?.stripe ? <button className="btn-ghost w-full" disabled={!!busy} onClick={() => aller("/api/abonnement/portail")}>Changer de formule</button>
              : <button className="btn-brand w-full" disabled={!!busy} onClick={() => aller("/api/abonnement", { plan: f.id }, f.id)}>{busy === f.id ? "…" : `Choisir ${f.nom}`}</button>}
          </div>
        ))}
      </div>
      <a href="/artisan/parrainage" className="card flex items-center justify-between !p-3 text-sm">
        <span>🎁 Parrainez un artisan : <b>+2 clients offerts</b> pour vous</span><b className="text-brand">→</b>
      </a>
      <Erreur msg={err} />
      <p className="text-xs text-slate-400">En vous abonnant, vous acceptez les <a href="/legal/cgv" className="underline">conditions générales de vente</a>. Paiement par carte via Stripe. Cet abonnement est le seul paiement fait à Rénolien : les travaux se règlent directement entre vous et le client.</p>
    </div>
  );
}

export default function Page() { return <Suspense><Abonnement /></Suspense>; }
