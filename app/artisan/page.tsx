"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";
import { eur } from "@/lib/calc";
import { Metiers } from "@/components/Vues";
import { useProfil } from "@/components/Espace";
import { tempsRestant, type Artisan, type Demande } from "@/lib/mer";

export default function DemandesDispo() {
  const { profil } = useProfil();
  const [a, setA] = useState<Artisan | null>(null);
  const [liste, setListe] = useState<Demande[] | null>(null);
  const [quota, setQuota] = useState<{ quota: number | null; utilise: number; bonus?: number } | null>(null);

  useEffect(() => {
    (async () => {
      const s = sb();
      const { data: art } = await s.from("artisans").select("*").eq("id", profil.id).maybeSingle();
      setA(art as Artisan);
      const [{ data: d }, { data: mes }] = await Promise.all([
        s.from("demandes").select("*").eq("statut", "ouverte").gt("ferme_le", new Date().toISOString()).order("publiee_le", { ascending: false }),
        s.from("offres").select("demande_id").eq("artisan_id", profil.id),
      ]);
      s.rpc("mon_quota").then(({ data }) => setQuota(data));
      const deja = new Set(((mes as { demande_id: string }[]) || []).map((x) => x.demande_id));
      // Les règles de la base ne renvoient que les demandes de vos métiers et départements ; on retire celles déjà traitées
      setListe(((d as Demande[]) || []).filter((x) => !deja.has(x.id) && x.client_id !== profil.id));
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
      {manque.length > 0 && (
        <Link href="/artisan/profil" className="card block border-amber-300 bg-amber-50 text-sm text-amber-900">
          ⚠️ Pour voir les demandes et y répondre, complétez {manque.join(", ")}. <b>Compléter mon profil →</b>
        </Link>
      )}
      {quota && quota.quota !== null && (
        <Link href="/artisan/abonnement" className={`card flex items-center justify-between !p-3 text-sm ${quota.utilise >= quota.quota && !quota.bonus ? "border-red-300 bg-red-50" : ""}`}>
          <span>{quota.utilise >= quota.quota ? (quota.bonus ? `🎁 ${quota.bonus} offre(s) bonus disponible(s)` : "🔒 Limite d'offres atteinte ce mois-ci") : `📨 ${quota.quota - quota.utilise} offre(s) restante(s) ce mois-ci${quota.bonus ? ` + ${quota.bonus} bonus` : ""}`}</span>
          <b className="text-brand">Abonnement →</b>
        </Link>
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
