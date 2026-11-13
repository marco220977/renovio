"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

export const INSCRIPTION_PRO = "/connexion?mode=signup&role=artisan";
export type Lancement = { actif: boolean; fin: string; remise: number; fondateurs: number };
const dateLongue = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function useLancement() {
  const [l, setL] = useState<Lancement | null>(null);
  useEffect(() => { sb().rpc("infos_lancement").then(({ data }: { data: Lancement | null }) => setL(data)); }, []);
  return l;
}

/** Bandeau « Phase de lancement : gratuit pour les membres fondateurs » */
export default function OffreLancement({ bouton = true, compact = false }: { bouton?: boolean; compact?: boolean }) {
  const l = useLancement();
  if (l && !l.actif) return null;
  const fin = l ? dateLongue(l.fin) : "la fin du lancement";
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-flame to-orange-400 text-white shadow-sm ${compact ? "p-3" : "p-5"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-white/90">🚀 Phase de lancement · Membres fondateurs</p>
      <p className={`${compact ? "text-base" : "mt-1 text-xl"} font-extrabold`}>100 % gratuit et illimité jusqu'au {fin}</p>
      <p className="mt-1 text-sm text-white/90">
        Inscrivez-vous pendant le lancement : aucun abonnement, aucune carte bancaire, clients illimités. Ensuite, vous gardez <b className="text-white">-{l?.remise ?? 30} % à vie</b> sur toutes les formules, et la formule Découverte reste gratuite.
      </p>
      {bouton && <Link href={INSCRIPTION_PRO} className="btn mt-3 w-full bg-white py-3 font-bold text-flame sm:w-auto sm:px-8">Devenir membre fondateur →</Link>}
    </div>
  );
}
