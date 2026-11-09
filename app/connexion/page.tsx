"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import TradePicker from "@/components/TradePicker";

const frError = (m: string) => /rate limit/i.test(m) ? "Trop d'inscriptions en peu de temps. Réessayez dans une heure."
  : /registered|already/i.test(m) ? "Un compte existe déjà avec cet e-mail. Connectez-vous."
  : /password/i.test(m) ? "Mot de passe trop court (6 caractères minimum)." : m;

/** Après connexion : on envoie chacun vers son espace */
async function destination(): Promise<string> {
  const s = sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return "/connexion";
  const { data } = await s.from("profils").select("role").eq("id", user.id).maybeSingle();
  if (!data) return "/bienvenue";
  return data.role === "artisan" ? "/artisan" : "/client";
}

function Form() {
  const params = useSearchParams();
  const router = useRouter();
  const [signup, setSignup] = useState(params.get("mode") === "signup");
  const [role, setRole] = useState<"client" | "artisan">(params.get("role") === "artisan" ? "artisan" : "client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [trades, setTrades] = useState<string[]>([]);
  const [accept, setAccept] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (signup && role === "artisan" && !trades.length) return setMsg("Choisissez au moins un métier.");
    setBusy(true); setMsg("");
    const s = sb();
    if (signup) {
      const { data, error } = await s.auth.signUp({
        email, password,
        options: {
          data: { app: "mer", role, full_name: name, phone, company_name: company, trades },
          emailRedirectTo: `${location.origin}/${role}`,
        },
      });
      if (error) setMsg(frError(error.message));
      else if (!data.session) setMsg("Compte créé ! Confirmez votre adresse avec l'e-mail reçu, puis connectez-vous.");
      else router.replace(role === "artisan" ? "/artisan/profil?bienvenue=1" : "/client/nouvelle");
    } else {
      const { error } = await s.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou mot de passe incorrect.");
      else router.replace(await destination());
    }
    setBusy(false);
  }

  async function reset() {
    if (!email) return setMsg("Saisissez votre e-mail d'abord.");
    await sb().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/connexion` });
    setMsg("E-mail de réinitialisation envoyé.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-orange-50 p-5">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6">
        <Link href="/" className="text-xl font-extrabold">Réno<span className="text-flame">vio</span></Link>
        <h1 className="text-2xl font-extrabold">{signup ? "Créer mon compte" : "Connexion"}</h1>
        {signup && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(["client", "artisan"] as const).map((r) => (
                <button type="button" key={r} onClick={() => setRole(r)}
                  className={`rounded-xl border-2 p-3 text-sm font-semibold ${role === r ? "border-flame bg-flame-light text-ink" : "border-slate-200 text-slate-500"}`}>
                  {r === "client" ? "🏠 J'ai des travaux" : "🧰 Je suis artisan"}
                </button>
              ))}
            </div>
            <div><label className="label">Votre nom</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label">Téléphone</label><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            {role === "artisan" && (
              <>
                <div><label className="label">Nom de l'entreprise</label><input className="input" required value={company} onChange={(e) => setCompany(e.target.value)} /></div>
                <div><label className="label">Vos métiers</label><TradePicker value={trades} onChange={setTrades} /></div>
              </>
            )}
          </>
        )}
        <div><label className="label">E-mail</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Mot de passe</label><input className="input" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {signup && (
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" className="mt-0.5" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>J'accepte les <a href="/legal/cgv" target="_blank" className="text-brand underline">conditions générales</a> et la <a href="/legal/confidentialite" target="_blank" className="text-brand underline">politique de confidentialité</a>.</span>
          </label>
        )}
        {msg && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy || (signup && !accept)}>{busy ? "…" : signup ? "Créer mon compte" : "Se connecter"}</button>
        <button type="button" className="w-full text-sm text-brand" onClick={() => { setSignup(!signup); setMsg(""); }}>
          {signup ? "J'ai déjà un compte" : "Pas encore de compte ? Inscription gratuite"}
        </button>
        {!signup && <button type="button" className="w-full text-xs text-slate-500" onClick={reset}>Mot de passe oublié</button>}
      </form>
    </main>
  );
}

export default function Page() { return <Suspense><Form /></Suspense>; }
