"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";
import { dateFr } from "@/lib/calc";
import { STATUT_DEMANDE, statutDemande, tempsRestant, type Demande } from "@/lib/mer";

type Ligne = Demande & { offres: { count: number }[] };

export default function MesDemandes() {
  const [liste, setListe] = useState<Ligne[] | null>(null);

  useEffect(() => {
    (async () => {
      const s = sb();
      const { data: { user } } = await s.auth.getUser();
      const { data } = await s.from("demandes").select("*, offres(count)").eq("client_id", user!.id)
        .order("created_at", { ascending: false });
      setListe((data as Ligne[]) || []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Mes demandes</h1>
        <Link href="/client/nouvelle" className="btn-brand !py-2 text-sm">＋ Nouvelle</Link>
      </div>
      {liste === null && <p className="text-slate-400">Chargement…</p>}
      {liste?.length === 0 && (
        <div className="card space-y-3 text-center">
          <p className="text-4xl">🏗️</p>
          <p className="font-semibold">Aucune demande pour l'instant</p>
          <p className="text-sm text-slate-600">Décrivez vos travaux en quelques phrases : l'IA prépare votre cahier des charges et les artisans de votre secteur vous envoient leur devis.</p>
          <Link href="/client/nouvelle" className="btn-primary w-full">Décrire mes travaux</Link>
        </div>
      )}
      {liste?.map((d) => {
        const st = statutDemande(d);
        const [label, color] = STATUT_DEMANDE[st];
        const nb = d.offres?.[0]?.count || 0;
        return (
          <Link key={d.id} href={`/client/demande/${d.id}`} className="card block space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold">{d.titre || d.description.slice(0, 60)}</p>
              <span className={`chip shrink-0 ${color}`}>{label}</span>
            </div>
            <p className="text-sm text-slate-500">{d.ville || d.cp} · créée le {dateFr(d.created_at)}</p>
            {st !== "brouillon" && st !== "annulee" && (
              <p className="text-sm font-semibold">
                {nb} offre{nb > 1 ? "s" : ""} reçue{nb > 1 ? "s" : ""}
                {st === "ouverte" && <span className="font-normal text-slate-500"> · fermeture dans {tempsRestant(d.ferme_le)}</span>}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
