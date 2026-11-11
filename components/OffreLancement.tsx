"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

export const INSCRIPTION_PRO = "/connexion?mode=signup&role=artisan";

/** Bandeau de l'offre de lancement : 2 mois d'Illimité offerts aux 50 premiers inscrits, avec le compteur de places. */
export default function OffreLancement({ bouton = true, compact = false }: { bouton?: boolean; compact?: boolean }) {
  const [places, setPlaces] = useState<number | null>(null);
  useEffect(() => {
    sb().rpc("places_lancement").then(({ data }: { data: number | null }) => { if (typeof data === "number") setPlaces(data); });
  }, []);
  if (places === 0) return null;
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-flame to-orange-400 text-white shadow-sm ${compact ? "p-3" : "p-5"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-white/90">🎁 Offre de lancement</p>
      <p className={`${compact ? "text-base" : "mt-1 text-xl"} font-extrabold`}>2 mois de contacts illimités offerts aux 50 premiers inscrits</p>
      <p className="mt-1 text-sm text-white/90">
        {places === null ? "Places limitées." : <>Plus que <b className="text-white">{places} place{places > 1 ? "s" : ""}</b>.</>} Activé automatiquement à l'inscription, sans carte bancaire. Ensuite, vous passez à la formule gratuite si vous ne choisissez rien.
      </p>
      {bouton && <Link href={INSCRIPTION_PRO} className="btn mt-3 w-full bg-white py-3 font-bold text-flame sm:w-auto sm:px-8">J'en profite →</Link>}
    </div>
  );
}
