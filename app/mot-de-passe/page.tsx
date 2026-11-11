"use client";
// Lien « mot de passe oublié » reçu par e-mail : l'utilisateur choisit un nouveau mot de passe.
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [pret, setPret] = useState(false);
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const s = sb();
      const code = params.get("code");
      if (code) await s.auth.exchangeCodeForSession(code).catch(() => {});
      const { data: { session } } = await s.auth.getSession();
      if (session) setPret(true); else setMsg("Lien expiré ou déjà utilisé. Redemandez un e-mail depuis la page de connexion.");
    })();
  }, [params]);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    if (mdp.length < 6) return setMsg("6 caractères minimum.");
    if (mdp !== mdp2) return setMsg("Les deux mots de passe sont différents.");
    const s = sb();
    const { error } = await s.auth.updateUser({ password: mdp });
    if (error) return setMsg(error.message);
    const { data: { user } } = await s.auth.getUser();
    const { data } = await s.from("profils").select("role").eq("id", user!.id).maybeSingle();
    router.replace(data?.role === "admin" ? "/admin" : data?.role === "artisan" ? "/artisan" : data ? "/client" : "/bienvenue");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-orange-50 p-5">
      <form onSubmit={valider} className="card w-full max-w-md space-y-4 p-6">
        <Link href="/" className="text-xl font-extrabold">Réno<span className="text-flame">lien</span></Link>
        <h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1>
        {pret && (
          <>
            <div><label className="label">Nouveau mot de passe</label><input className="input" type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} /></div>
            <div><label className="label">Confirmer</label><input className="input" type="password" value={mdp2} onChange={(e) => setMdp2(e.target.value)} /></div>
            <button className="btn-primary w-full">Enregistrer</button>
          </>
        )}
        {msg && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{msg}</p>}
        {!pret && <Link href="/connexion" className="btn-ghost w-full">Retour à la connexion</Link>}
      </form>
    </main>
  );
}

export default function Page() { return <Suspense><Form /></Suspense>; }
