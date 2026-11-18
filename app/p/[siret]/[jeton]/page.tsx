"use client";
// Pré-inscription : l'artisan valide le profil préparé pour lui (lien personnel reçu par e-mail).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { TRADES } from "@/lib/trades";
import { useLancement } from "@/components/OffreLancement";
import LogoMark from "@/components/LogoMark";

type Infos = { erreur?: string; deja?: boolean; nom?: string; dirigeant?: string; forme?: string; adresse?: string; cp?: string; ville?: string;
  dep?: string; email?: string; telephone?: string; rge?: boolean; creation?: string; metiers?: string[]; departements?: string[] };
const DEPS: [string, string][] = [["75", "Paris"], ["77", "Seine-et-Marne"], ["78", "Yvelines"], ["91", "Essonne"], ["92", "Hauts-de-Seine"], ["93", "Seine-Saint-Denis"], ["94", "Val-de-Marne"], ["95", "Val-d'Oise"]];
const titre = (s?: string) => (s || "").toLowerCase().replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase());
const siretLisible = (s: string) => s.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");

export default function PreInscription() {
  const { siret, jeton } = useParams<{ siret: string; jeton: string }>();
  const router = useRouter();
  const l = useLancement();
  const [i, setI] = useState<Infos | null>(null);
  const [f, setF] = useState({ raison_sociale: "", contact: "", telephone: "", email: "", adresse: "", cp: "", ville: "", mot_de_passe: "" });
  const [metiers, setMetiers] = useState<string[]>([]);
  const [deps, setDeps] = useState<string[]>([]);
  const [cgu, setCgu] = useState(false);
  const [voirTout, setVoirTout] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const demo = siret === "demo";
  useEffect(() => {
    if (demo) {
      const d: Infos = { nom: "PLOMBERIE EXEMPLE", dirigeant: "Jean Dupont", adresse: "12 rue de Paris", cp: "94000", ville: "Créteil", email: "contact@exemple.fr", telephone: "06 00 00 00 00", rge: true, metiers: ["plomberie", "chauffage"], departements: ["94"] };
      setI(d);
      setF((x) => ({ ...x, raison_sociale: d.nom!, contact: d.dirigeant!, telephone: d.telephone!, email: d.email!, adresse: d.adresse!, cp: d.cp!, ville: d.ville! }));
      setMetiers(d.metiers!); setDeps(d.departements!);
      return;
    }
    sb().rpc("preinscription_infos", { p_siret: siret, p_jeton: jeton }).then(({ data }) => {
      const d = (data as Infos) || { erreur: "lien" };
      setI(d);
      if (!d.erreur && !d.deja) {
        setF((x) => ({ ...x, raison_sociale: d.nom || "", contact: titre(d.dirigeant), telephone: d.telephone || "", email: d.email || "",
          adresse: titre(d.adresse), cp: d.cp || "", ville: titre(d.ville) }));
        setMetiers(d.metiers || []); setDeps(d.departements || []);
      }
    });
  }, [siret, jeton, demo]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const bascule = (liste: string[], v: string, maj: (x: string[]) => void) => maj(liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

  async function valider(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!metiers.length) { setVoirTout(true); return setErr("Choisissez au moins un métier."); }
    if (!deps.length) { setVoirTout(true); return setErr("Choisissez au moins un département."); }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) { setVoirTout(true); return setErr("Indiquez votre adresse e-mail."); }
    if (!cgu) return setErr("Cochez la case des conditions pour continuer.");
    if (demo) return setErr("Ceci est un aperçu de test : aucun compte n'est créé. Les vrais artisans arrivent ici depuis leur e-mail.");
    setBusy(true);
    const s = sb();
    const { data, error } = await s.functions.invoke("preinscription", { body: { siret, jeton, ...f, mot_de_passe: "", metiers, departements: deps } });
    const msg = (data as any)?.error || (error ? await (error as any).context?.json?.().then((x: any) => x?.error).catch(() => null) : null);
    if (msg || error) { setErr(msg || "Une erreur est survenue, réessayez."); setBusy(false); return; }
    const th = (data as any)?.token_hash;
    const { error: e2 } = th ? await s.auth.verifyOtp({ token_hash: th, type: "magiclink" }) : { error: true };
    if (e2) { router.replace("/connexion?role=artisan"); return; }
    if (i?.rge) s.functions.invoke("verif-rge", { body: {} }).catch(() => {});
    router.replace("/mot-de-passe?bienvenue=1");
  }

  if (!i) return <div className="flex min-h-screen items-center justify-center text-slate-400">Chargement de votre profil…</div>;

  if (i.erreur || i.deja) return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-orange-50 p-5">
      <div className="card w-full max-w-md space-y-4 p-6 text-center">
        <p className="text-xl font-extrabold"><LogoMark />Réno<span className="text-flame">lien</span></p>
        {i.deja
          ? <><p className="font-bold">{i.nom} a déjà un compte Rénolien.</p><Link href="/connexion?role=artisan" className="btn-primary w-full">Me connecter</Link></>
          : <><p className="font-bold">Ce lien n'est plus valide.</p><Link href="/entreprises" className="btn-brand w-full">Découvrir Rénolien</Link></>}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50 pb-16">
      <div className="mx-auto max-w-lg px-4">
        <p className="py-5 text-2xl font-extrabold"><LogoMark />Réno<span className="text-flame">lien</span></p>
        {demo && <p className="mb-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">👁️ Aperçu de test : c'est la page que voit un artisan en cliquant sur « Valider mon profil ».</p>}
        {(!l || l.actif) && (
          <div className="rounded-2xl bg-gradient-to-r from-flame to-orange-400 p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-white/90">🚀 Membre fondateur</p>
            <p className="font-extrabold">100 % gratuit et illimité{l ? ` jusqu'au ${new Date(l.fin + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }).replace(/^1 /, "1er ")}` : ""}, puis -{l?.remise ?? 30} % à vie</p>
          </div>
        )}
        <h1 className="mt-5 text-2xl font-extrabold leading-tight">Bonjour{f.contact ? ` ${f.contact.split(" ")[0]}` : ""}, votre profil est prêt 👋</h1>
        <p className="mt-1 text-sm text-slate-600">Un seul clic pour l'activer. Vous pourrez tout modifier ensuite dans votre espace.</p>

        <form onSubmit={valider} className="card mt-4 space-y-4 p-5">
          <div className="space-y-1">
            <p className="text-lg font-extrabold">🏢 {f.raison_sociale}</p>
            <p className="text-sm text-slate-600">📍 {[f.cp, f.ville].filter(Boolean).join(" ")}</p>
            <p className="text-sm text-green-700">✅ SIRET {demo ? "123 456 789 00012" : siretLisible(siret)} vérifié{i.rge && " · 🌿 RGE"}</p>
            {metiers.length > 0 && <p className="text-sm text-slate-600">🔧 {metiers.map((m) => TRADES.find((t) => t.id === m)?.label || m).join(", ")} · dép. {deps.join(", ")}</p>}
            {f.email && <p className="text-sm text-slate-600">✉️ {f.email}</p>}
          </div>

          {!voirTout ? (
            <button type="button" className="text-sm font-semibold text-brand underline" onClick={() => setVoirTout(true)}>Modifier mes informations</button>
          ) : (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div><label className="label">Entreprise</label><input className="input" value={f.raison_sociale} onChange={set("raison_sociale")} required /></div>
              <div><label className="label">E-mail de connexion</label><input className="input" type="email" autoComplete="email" value={f.email} onChange={set("email")} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Votre nom</label><input className="input" value={f.contact} onChange={set("contact")} /></div>
                <div><label className="label">Téléphone</label><input className="input" type="tel" value={f.telephone} onChange={set("telephone")} /></div>
              </div>
              <div>
                <label className="label">Vos métiers</label>
                <div className="flex flex-wrap gap-2">
                  {TRADES.map((t) => (
                    <button type="button" key={t.id} onClick={() => bascule(metiers, t.id, setMetiers)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${metiers.includes(t.id) ? "border-flame bg-flame-light font-semibold text-ink" : "border-slate-200 text-slate-500"}`}>
                      {t.emoji} {t.label}{metiers.includes(t.id) && " ✓"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Où intervenez-vous ?</label>
                <div className="grid grid-cols-2 gap-2">
                  {DEPS.map(([c, n]) => (
                    <button type="button" key={c} onClick={() => bascule(deps, c, setDeps)}
                      className={`rounded-xl border p-2 text-left text-sm ${deps.includes(c) ? "border-flame bg-flame-light font-semibold" : "border-slate-200 text-slate-500"}`}>
                      {deps.includes(c) ? "✓ " : ""}{c} · {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={cgu} onChange={(e) => setCgu(e.target.checked)} />
            <span>J'accepte les <Link href="/legal/cgu" target="_blank" className="underline">conditions d'utilisation</Link> et les <Link href="/legal/cgv" target="_blank" className="underline">conditions de vente</Link>.</span>
          </label>
          {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <button className="btn-brand w-full py-4 text-lg" disabled={busy}>{busy ? "Activation…" : "✅ Oui, j'active mon profil"}</button>
          <p className="text-center text-xs text-slate-500">Gratuit, sans engagement, sans carte bancaire.</p>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">Ce n'est pas pour vous ? Ignorez simplement cette page : rien n'est publié sans votre validation.</p>
      </div>
    </main>
  );
}
