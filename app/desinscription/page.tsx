"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { sb } from "@/lib/supabase";

function Contenu() {
  const q = useSearchParams();
  const [etat, setEtat] = useState<"" | "envoi" | "ok" | "erreur">("");
  async function confirmer() {
    setEtat("envoi");
    const { data, error } = await sb().rpc("prospect_action", { p_siret: q.get("s") || "", p_jeton: q.get("t") || "", p_action: "desinscrire" });
    setEtat(error || !data ? "erreur" : "ok");
  }
  return (
    <main className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="text-2xl font-extrabold">Réno<span className="text-flame">lien</span></p>
      {etat === "ok" ? (
        <>
          <h1 className="mt-8 text-xl font-bold">C'est fait ✔</h1>
          <p className="mt-2 text-slate-600">Vous ne recevrez plus d'e-mail de prospection de Rénolien.</p>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-xl font-bold">Ne plus recevoir nos e-mails</h1>
          <p className="mt-2 text-slate-600">Confirmez pour ne plus être contacté par e-mail par Rénolien.</p>
          <button className="btn-primary mt-6 w-full" disabled={etat === "envoi"} onClick={confirmer}>{etat === "envoi" ? "…" : "Me désinscrire"}</button>
          {etat === "erreur" && <p className="mt-3 text-sm text-red-600">Lien invalide. Écrivez-nous à renolien.contact@gmail.com et nous vous retirerons de la liste.</p>}
        </>
      )}
      <Link href="/entreprises" className="mt-10 block text-sm text-brand">Découvrir Rénolien</Link>
    </main>
  );
}
export default function Desinscription() { return <Suspense><Contenu /></Suspense>; }
