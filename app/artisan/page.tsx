"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { joursDecennale } from "@/lib/decennale";
import { sb } from "@/lib/supabase";
import { eur } from "@/lib/calc";
import { Metiers } from "@/components/Vues";
import { useProfil } from "@/components/Espace";
import { tempsRestant, type Artisan, type Demande } from "@/lib/mer";

export default function DemandesDispo() {
  const { profil } = useProfil();
  const [a, setA] = useState<Artisan | null>(null);
  const [liste, setListe] = useState<Demande[] | null>(null);
  const [quota, setQuota] = useState<{ quota: number | null; utilise: number; bonus?: number; attente?: number; plafond?: number | null; en_pause?: number; abonnement?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const s = sb();
      const { data: art } = await s.from("artisans").select("*").eq("id", profil.id).maybeSingle();
      setA(art as Artisan);
      const [{ data: d }, { data: mes }] = await Promise.all([
        s.from("demandes").select("*, visible:demande_visible_artisan").eq("statut", "ouverte").gt("ferme_le", new Date().toISOString()).order("publiee_le", { ascending: false }),
        s.from("offres").select("demande_id").eq("artisan_id", profil.id),
      ]);
      s.rpc("mon_quota").then(({ data }) => setQuota(data));
      const deja = new Set(((mes as { demande_id: string }[]) || []).map((x) => x.demande_id));
      // Les règles de la base ne renvoient que les demandes de vos métiers et départements ; on retire celles déjà traitées
      // (le filtre « visible » écarte aussi les demandes qu'un compte admin voit grâce à ses droits)
      setListe(((d as (Demande & { visible?: boolean })[]) || []).filter((x) => x.visible !== false && !deja.has(x.id) && x.client_id !== profil.id));
    })();
  }, [profil.id]);

  const manque = !a ? [] : [
    !a.departements?.length && "vos départements d'intervention",
    !a.metiers?.length && "vos métiers",
    (a.siret || "").replace(/\D/g, "").length !== 14 && "votre SIRET",
    !a.decennale && "votre assurance décennale",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Demandes près de chez vous</h1>
      {(() => { const j = joursDecennale(a); if (j === null || j > 30) return null;
        return <Link href="/artisan/profil" className={`card block text-sm ${j < 0 ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
          {j < 0 ? "⛔ Votre assurance décennale a expiré : le badge « Vérifié » est retiré." : `⏰ Votre assurance décennale expire dans ${j} jour${j > 1 ? "s" : ""}.`} <b>Envoyer la nouvelle attestation →</b></Link>; })()}
      {manque.length > 0 && (
        <Link href="/artisan/profil" className="card block border-amber-300 bg-amber-50 text-sm text-amber-900">
          ⚠️ Pour voir les demandes et y répondre, complétez {manque.join(", ")}. <b>Compléter mon profil →</b>
        </Link>
      )}
      {!!quota?.en_pause && (
        <Link href="/artisan/abonnement" className="card block border-red-300 bg-red-50 text-sm text-red-900">
          🔒 <b>{quota.en_pause} offre{quota.en_pause > 1 ? "s" : ""} en pause</b> : vous avez atteint vos {quota.quota} client{(quota.quota || 0) > 1 ? "s" : ""} du mois, les clients ne les voient plus.
          Elles reviennent automatiquement le 1ᵉʳ du mois, ou tout de suite en passant à une formule supérieure. <b>Réactiver maintenant →</b>
        </Link>
      )}
      {quota && quota.quota !== null && (() => {
        const bloque = (quota.utilise >= quota.quota! && !quota.bonus) || (quota.plafond != null && (quota.attente || 0) >= quota.plafond);
        return (
          <Link href="/artisan/abonnement" className={`card block !p-3 text-sm ${bloque ? "border-red-300 bg-red-50" : ""}`}>
            <span className="flex items-center justify-between">
              <span>{quota.utilise >= quota.quota! ? (quota.bonus ? `🎁 ${quota.bonus} client(s) offert(s) en réserve` : "🔒 Clients du mois atteints") : `🤝 ${quota.quota! - quota.utilise} client(s) restant(s) ce mois-ci${quota.bonus ? ` + ${quota.bonus} offert(s)` : ""}`}</span>
              <b className="text-brand">Abonnement →</b>
            </span>
            {quota.plafond != null && <span className="mt-1 block text-xs text-slate-500">📨 {quota.attente || 0} / {quota.plafond} offres en attente de réponse · vous ne payez que quand un client vous choisit</span>}
          </Link>
        );
      })()}
      {quota && quota.quota !== null && quota.utilise >= quota.quota && !quota.bonus && (
        <Link href="/artisan/parrainage" className="block text-center text-sm font-semibold text-brand">🎁 Gagnez des clients offerts en parrainant un artisan →</Link>
      )}
      {liste === null && <p className="text-slate-400">Chargement…</p>}
      {liste?.length === 0 && !manque.length && (
        <div className="card text-center text-sm text-slate-600">
          <p className="text-4xl">📭</p>
          <p className="mt-2">Aucune nouvelle demande pour vos métiers dans vos départements pour l'instant.</p>
          <p className="mt-1 text-xs text-slate-400">Astuce : préparez vos tarifs pour répondre en 1 clic.</p>
        </div>
      )}
      {liste?.map((d) => (
        <Link key={d.id} href={`/artisan/demande/${d.id}`} className="card block space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold">{d.titre || d.description.slice(0, 60)}</p>
            <span className="chip shrink-0 bg-blue-100 text-blue-800">⏱ {tempsRestant(d.ferme_le)}</span>
          </div>
          <p className="text-sm text-slate-500">📍 {d.ville || ""} {d.cp} · {d.delai}</p>
          <p className="line-clamp-2 text-sm text-slate-600">{d.cahier?.resume || d.description}</p>
          <Metiers ids={d.metiers} />
          {d.budget_max ? <p className="text-xs text-slate-500">Estimation IA : {eur(d.budget_min)} – {eur(d.budget_max)} TTC</p> : null}
        </Link>
      ))}
    </div>
  );
}
