"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";
import { eur, dateFr } from "@/lib/calc";
import { useProfil } from "@/components/Espace";
import { STATUT_OFFRE, type Offre } from "@/lib/mer";

type Ligne = Offre & { demandes: { titre?: string; cp: string; ville?: string } | null };

export default function MesOffres() {
  const { profil } = useProfil();
  const [liste, setListe] = useState<Ligne[] | null>(null);
  const [nonLus, setNonLus] = useState<Record<string, number>>({});
  useEffect(() => {
    sb().from("messages").select("demande_id").eq("artisan_id", profil.id).eq("lu", false).eq("auteur", "client").then(({ data }) => {
      const n: Record<string, number> = {};
      (data || []).forEach((m: { demande_id: string }) => { n[m.demande_id] = (n[m.demande_id] || 0) + 1; });
      setNonLus(n);
    });
  }, [profil.id]);

  useEffect(() => {
    sb().from("offres").select("*, demandes(titre, cp, ville)").eq("artisan_id", profil.id)
      .order("updated_at", { ascending: false }).then(({ data }) => setListe((data as Ligne[]) || []));
  }, [profil.id]);

  const gagnees = liste?.filter((o) => o.statut === "acceptee") || [];
  const ca = gagnees.reduce((s, o) => s + Number(o.total_ht), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Mes offres</h1>
      {liste && liste.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="card !p-3"><p className="text-xl font-extrabold">{liste.length}</p><p className="text-xs text-slate-500">envoyées</p></div>
          <div className="card !p-3"><p className="text-xl font-extrabold">{gagnees.length}</p><p className="text-xs text-slate-500">gagnées</p></div>
          <div className="card !p-3"><p className="text-xl font-extrabold">{eur(ca).replace(/,\d\d/, "")}</p><p className="text-xs text-slate-500">HT signés</p></div>
        </div>
      )}
      {liste === null && <p className="text-slate-400">Chargement…</p>}
      {liste?.length === 0 && <div className="card text-center text-sm text-slate-600">Vous n'avez pas encore envoyé d'offre.</div>}
      {liste?.map((o) => (
        <Link key={o.id} href={`/artisan/demande/${o.demande_id}`} className="card block space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold">{o.demandes?.titre || "Demande"}</p>
            {o.en_pause && o.statut === "envoyee" ? <span className="chip shrink-0 bg-slate-200 text-slate-700">⏸ En pause</span>
              : <span className={`chip shrink-0 ${STATUT_OFFRE[o.statut][1]}`}>{STATUT_OFFRE[o.statut][0]}</span>}
          </div>
          <p className="text-sm text-slate-500">{o.numero} · {o.demandes?.ville} {o.demandes?.cp} · {dateFr(o.updated_at)}</p>
          <p className="font-semibold">{eur(o.total_ttc)} TTC</p>
          {nonLus[o.demande_id] > 0 && <p className="text-sm font-semibold text-red-600">💬 {nonLus[o.demande_id]} nouveau(x) message(s)</p>}
        </Link>
      ))}
    </div>
  );
}
