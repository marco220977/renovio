"use client";
// Compte existant sans profil (ex : compte créé sur l'ancienne appli) : on choisit client ou artisan.
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { errMsg } from "@/lib/mer";

function Choix() {
  const router = useRouter();
  const params = useSearchParams();
  const [nom, setNom] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function choisir(role: "client" | "artisan") {
    setBusy(true); setMsg("");
    const s = sb();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return router.replace(`/connexion?role=${params.get("role") || "client"}`);
    const { error } = await s.from("profils").insert({ id: user.id, role, nom, email: user.email });
    if (error) { setMsg(errMsg(error)); setBusy(false); return; }
    if (role === "artisan") {
      const { error: e2 } = await s.from("artisans").insert({ id: user.id, email: user.email });
      if (e2) { setMsg(errMsg(e2)); setBusy(false); return; }
      router.replace("/artisan/profil?bienvenue=1");
    } else router.replace("/client/nouvelle");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-orange-50 p-5">
      <div className="card w-full max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-extrabold">Bienvenue sur Rénovio</h1>
        <p className="text-sm text-slate-600">Dites-nous comment vous utilisez l'appli.</p>
        <div><label className="label">Votre nom</label><input className="input" value={nom} onChange={(e) => setNom(e.target.value)} /></div>
        {msg && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{msg}</p>}
        <button className="btn-primary w-full py-4" disabled={busy} onClick={() => choisir("client")}>🏠 J'ai des travaux</button>
        <button className="btn-brand w-full py-4" disabled={busy} onClick={() => choisir("artisan")}>🧰 Je suis artisan</button>
      </div>
    </main>
  );
}

export default function Page() { return <Suspense><Choix /></Suspense>; }
