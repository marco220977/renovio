"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import TradePicker from "@/components/TradePicker";
import { Erreur, Info, useProfil } from "@/components/Espace";
import MonCompte from "@/components/MonCompte";
import { errMsg, type Artisan } from "@/lib/mer";

function Fiche() {
  const { profil } = useProfil();
  const params = useSearchParams();
  const [a, setA] = useState<Artisan | null>(null);
  const [deps, setDeps] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    sb().from("artisans").select("*").eq("id", profil.id).maybeSingle().then(({ data }) => {
      const x = (data as Artisan) || ({ id: profil.id, metiers: [], departements: [] } as Artisan);
      setA(x); setDeps((x.departements || []).join(", "));
    });
  }, [profil.id]);

  if (!a) return <p className="text-slate-400">Chargement…</p>;
  const set = (p: Partial<Artisan>) => setA({ ...a, ...p });

  async function enregistrer() {
    setErr(""); setOk("");
    const departements = Array.from(new Set(deps.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^(\d{2,3}|2A|2B)$/.test(x))));
    const siret = (a!.siret || "").replace(/\D/g, "");
    if (siret && siret.length !== 14) return setErr("Le SIRET doit faire 14 chiffres.");
    if (!a!.metiers?.length) return setErr("Choisissez au moins un métier.");
    if (!departements.length) return setErr("Indiquez au moins un département (ex : 94, 77).");
    const row = {
      id: profil.id, raison_sociale: a!.raison_sociale, forme: a!.forme, siret, adresse: a!.adresse, cp: a!.cp, ville: a!.ville,
      telephone: a!.telephone, email: a!.email, metiers: a!.metiers, departements, decennale: a!.decennale,
      decennale_fin: a!.decennale_fin || null, rge: !!a!.rge, tva_franchise: !!a!.tva_franchise, presentation: a!.presentation,
    };
    const { error } = await sb().from("artisans").upsert(row);
    if (error) return setErr(errMsg(error));
    setDeps(departements.join(", ")); setOk("Profil enregistré.");
  }

  async function envoyerAttestation(f?: File) {
    if (!f) return;
    if (f.size > 10e6) return setErr("Fichier trop lourd (10 Mo maximum).");
    setErr(""); setOk("");
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${profil.id}/decennale-${Date.now()}.${ext}`;
    const s = sb();
    const { error } = await s.storage.from("attestations").upload(path, f, { contentType: f.type });
    if (error) return setErr(errMsg(error));
    const { error: e2 } = await s.from("artisans").update({ decennale_doc: path }).eq("id", profil.id);
    if (e2) return setErr(errMsg(e2));
    set({ decennale_doc: path }); setOk("Attestation envoyée.");
  }

  async function voirAttestation() {
    const { data } = await sb().storage.from("attestations").createSignedUrl(a!.decennale_doc!, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  const champ = (k: keyof Artisan, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="label">{label}</label>
      <input className="input" value={(a[k] as string) || ""} onChange={(e) => set({ [k]: e.target.value } as Partial<Artisan>)} {...props} /></div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Mon entreprise</h1>
      {params.get("bienvenue") && <Info>👋 Bienvenue ! Complétez votre fiche (SIRET, décennale, départements) pour recevoir les demandes de votre secteur.</Info>}
      {a.verifie ? <p className="chip bg-green-100 text-green-800">✔ Profil vérifié</p> : <p className="text-xs text-slate-500">Votre SIRET et votre décennale seront contrôlés pour obtenir le badge « Vérifié ».</p>}

      <div className="card space-y-3">
        {champ("raison_sociale", "Nom de l'entreprise")}
        <div className="grid grid-cols-2 gap-2">
          {champ("forme", "Forme juridique", { placeholder: "EI, SARL, SASU…" })}
          {champ("siret", "SIRET", { inputMode: "numeric", placeholder: "14 chiffres" })}
        </div>
        {champ("adresse", "Adresse")}
        <div className="grid grid-cols-2 gap-2">{champ("cp", "Code postal", { inputMode: "numeric" })}{champ("ville", "Ville")}</div>
        <div className="grid grid-cols-2 gap-2">{champ("telephone", "Téléphone", { type: "tel" })}{champ("email", "E-mail", { type: "email" })}</div>
      </div>

      <div className="card space-y-3">
        <div><label className="label">Mes métiers</label><TradePicker value={a.metiers || []} onChange={(m) => set({ metiers: m })} /></div>
        <div><label className="label">Départements où j'interviens</label>
          <input className="input" value={deps} onChange={(e) => setDeps(e.target.value)} placeholder="Ex : 94, 77, 91" />
          <p className="mt-1 text-xs text-slate-500">Numéros séparés par des virgules. Vous voyez les demandes de ces départements.</p></div>
      </div>

      <div className="card space-y-3">
        {champ("decennale", "Assurance décennale (assureur et n° de contrat)")}
        {champ("decennale_fin", "Valable jusqu'au", { type: "date" })}
        <div>
          <label className="label">Attestation d'assurance (photo ou PDF)</label>
          {a.decennale_doc ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-700">✔ Attestation envoyée</span>
              <button type="button" className="text-brand underline" onClick={voirAttestation}>Voir</button>
              <label className="cursor-pointer text-brand underline">Remplacer<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => envoyerAttestation(e.target.files?.[0])} /></label>
            </div>
          ) : (
            <label className="btn-ghost w-full cursor-pointer">📎 Envoyer mon attestation<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => envoyerAttestation(e.target.files?.[0])} /></label>
          )}
          <p className="mt-1 text-xs text-slate-500">Visible uniquement par Rénovio, pour vérifier votre profil et vous donner le badge « Vérifié ».</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!a.rge} onChange={(e) => set({ rge: e.target.checked })} /> Certifié RGE</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!a.tva_franchise} onChange={(e) => set({ tva_franchise: e.target.checked })} /> Franchise de TVA (micro-entreprise, art. 293 B)</label>
        <div><label className="label">Présentation (visible par les clients)</label>
          <textarea className="input" value={a.presentation || ""} onChange={(e) => set({ presentation: e.target.value })} placeholder="Ex : plombier chauffagiste depuis 15 ans, spécialiste salle de bain et PAC." /></div>
      </div>

      <Erreur msg={err} />
      {ok && <p className="text-sm text-green-700">{ok}</p>}
      <button className="btn-primary w-full py-3.5" onClick={enregistrer}>Enregistrer</button>
      <a href="/artisan/abonnement" className="btn-ghost w-full">💳 Mon abonnement</a>
      <MonCompte role="artisan" />
    </div>
  );
}

export default function Page() { return <Suspense><Fiche /></Suspense>; }
