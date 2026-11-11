"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import TradePicker from "@/components/TradePicker";
import { Erreur, Info, useProfil } from "@/components/Espace";
import MonCompte from "@/components/MonCompte";
import { errMsg, compresser, type Artisan } from "@/lib/mer";
import AnalyseDecennale from "@/components/AnalyseDecennale";
import { dateFr, joursDecennale } from "@/lib/decennale";

function Fiche() {
  const { profil } = useProfil();
  const params = useSearchParams();
  const [a, setA] = useState<Artisan | null>(null);
  const [deps, setDeps] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [analyse, setAnalyse] = useState(false);
  const [rgeEnCours, setRgeEnCours] = useState(false);
  const [rgeErr, setRgeErr] = useState("");
  const [siretInfo, setSiretInfo] = useState<{ etat: "cours" | "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    sb().from("artisans").select("*").eq("id", profil.id).maybeSingle().then(({ data }) => {
      const x = (data as Artisan) || ({ id: profil.id, metiers: [], departements: [] } as Artisan);
      setA(x); setDeps((x.departements || []).join(", "));
      const vieux = !x.rge_details?.verifie_le || Date.now() - new Date(x.rge_details.verifie_le).getTime() > 7 * 86400000;
      if (vieux && (x.siret || "").length === 14) verifierRge(true);
    });
  }, [profil.id]);

  if (!a) return <p className="text-slate-400">Chargement…</p>;
  const set = (p: Partial<Artisan>) => setA({ ...a, ...p });

  async function enregistrer() {
    setErr(""); setOk("");
    const departements = Array.from(new Set(deps.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^(\d{2,3}|2A|2B)$/.test(x))));
    const siret = (a!.siret || "").replace(/\D/g, "");
    if (siret && siret.length !== 14) return setErr("Le SIRET doit faire 14 chiffres.");
    if (siretInfo?.etat === "erreur") return setErr(siretInfo.texte);
    if (!a!.metiers?.length) return setErr("Choisissez au moins un métier.");
    if (!departements.length) return setErr("Indiquez au moins un département (ex : 94, 77).");
    const row = {
      id: profil.id, raison_sociale: a!.raison_sociale, forme: a!.forme, siret, adresse: a!.adresse, cp: a!.cp, ville: a!.ville,
      telephone: a!.telephone, email: a!.email, metiers: a!.metiers, departements, decennale: a!.decennale,
      decennale_fin: a!.decennale_fin || null, tva_franchise: !!a!.tva_franchise, presentation: a!.presentation,
    };
    const { error } = await sb().from("artisans").upsert(row);
    if (error) return setErr(errMsg(error));
    setDeps(departements.join(", ")); setOk("Profil enregistré.");
    if (siret.length === 14 && siret !== (a!.rge_details?.siret || "")) verifierRge(true);
  }

  async function envoyerAttestation(f?: File) {
    if (!f) return;
    if (f.size > 15e6) return setErr("Fichier trop lourd (15 Mo maximum).");
    setErr(""); setOk("");
    let fichier: Blob = f, ext = (f.name.split(".").pop() || "jpg").toLowerCase(), type = f.type;
    if (f.type.startsWith("image/")) {
      // Photo convertie en JPEG net (les photos de téléphone en HEIC ne sont pas lisibles par l'IA)
      try { fichier = await (await fetch(await compresser(f, 2200, 0.88))).blob(); ext = "jpg"; type = "image/jpeg"; } catch {}
    } else if (f.type !== "application/pdf") return setErr("Envoyez une photo ou un PDF.");
    if (fichier.size > 10e6) return setErr("Fichier trop lourd (10 Mo maximum).");
    const path = `${profil.id}/decennale-${Date.now()}.${ext}`;
    const s = sb();
    const { error } = await s.storage.from("attestations").upload(path, fichier, { contentType: type });
    if (error) return setErr(errMsg(error));
    const { error: e2 } = await s.from("artisans").update({ decennale_doc: path }).eq("id", profil.id);
    if (e2) return setErr(errMsg(e2));
    set({ decennale_doc: path });
    analyser();
  }

  async function verifierRge(silencieux = false) {
    setRgeEnCours(true); setRgeErr("");
    const { data, error } = await sb().functions.invoke("verif-rge", { body: {} });
    setRgeEnCours(false);
    let msg = data?.error;
    if (error) { msg = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch {} }
    if (msg) { if (!silencieux) setRgeErr(msg); return; }
    setA((x) => x && ({ ...x, rge: data.rge, rge_details: data.rge_details }));
  }

  async function analyser() {
    setAnalyse(true); setErr(""); setOk("");
    const { data, error } = await sb().functions.invoke("travaux-ia", { body: { action: "attestation" } });
    setAnalyse(false);
    let msg = data?.error;
    if (error) { msg = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch {} }
    if (msg) return setErr(`Attestation enregistrée, mais la lecture automatique a échoué : ${msg}`);
    setA((x) => x && ({ ...x, decennale_analyse: data.analyse, decennale: data.decennale ?? x.decennale, decennale_fin: data.decennale_fin ?? x.decennale_fin }));
    setOk(data.analyse?.alertes?.length ? "Attestation lue : quelques points sont à vérifier, voir ci-dessous." : "Attestation lue et contrôlée ✔");
  }

  async function voirAttestation() {
    const { data } = await sb().storage.from("attestations").createSignedUrl(a!.decennale_doc!, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function verifierSiret(valeur: string) {
    const siret = valeur.replace(/\D/g, "");
    if (siret.length !== 14) return setSiretInfo(null);
    setSiretInfo({ etat: "cours", texte: "Vérification du SIRET…" });
    try {
      const r = await fetch(`/api/siret?siret=${siret}`);
      const d = await r.json();
      if (!r.ok) return setSiretInfo({ etat: "erreur", texte: d.erreur || "Vérification impossible." });
      if (!d.actif) return setSiretInfo({ etat: "erreur", texte: `${d.nom_complet} : cet établissement est fermé au répertoire INSEE.` });
      setA((x) => x && ({
        ...x, siret,
        raison_sociale: d.nom_complet || d.nom || x.raison_sociale,
        forme: d.forme || x.forme, adresse: d.adresse || x.adresse, cp: d.cp || x.cp, ville: d.ville || x.ville,
      }));
      if (d.cp && !deps.trim()) setDeps(d.cp.startsWith("97") ? d.cp.slice(0, 3) : d.cp.slice(0, 2));
      setSiretInfo({ etat: "ok", texte: `✔ ${d.nom_complet} — entreprise active. Les informations ont été remplies, vérifiez-les puis enregistrez.` });
    } catch {
      setSiretInfo({ etat: "erreur", texte: "Vérification impossible pour le moment. Réessayez." });
    }
  }

  const champ = (k: keyof Artisan, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="label">{label}</label>
      <input className="input" value={(a[k] as string) || ""} onChange={(e) => set({ [k]: e.target.value } as Partial<Artisan>)} {...props} /></div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Mon entreprise</h1>
      {params.get("bienvenue") && <Info>👋 Bienvenue ! Complétez votre fiche (SIRET, décennale, départements) pour recevoir les demandes de votre secteur.</Info>}
      {(() => { const j = joursDecennale(a); if (j === null || j > 30) return null;
        return <Info>{j < 0 ? `⛔ Votre assurance décennale a expiré le ${dateFr(a.decennale_analyse?.date_fin || a.decennale_fin)}. Le badge « Vérifié » est retiré : envoyez votre nouvelle attestation ci-dessous.` : `⏰ Votre assurance décennale expire ${j === 0 ? "aujourd'hui" : `dans ${j} jour${j > 1 ? "s" : ""}`}. Pensez à envoyer la nouvelle attestation dès que vous l'avez.`}</Info>; })()}
      {a.verifie ? <p className="chip bg-green-100 text-green-800">✔ Profil vérifié</p> : <p className="text-xs text-slate-500">Votre SIRET et votre décennale seront contrôlés pour obtenir le badge « Vérifié ».</p>}

      <div className="card space-y-3">
        {champ("raison_sociale", "Nom de l'entreprise")}
        <div className="grid grid-cols-2 gap-2">
          {champ("forme", "Forme juridique", { placeholder: "EI, SARL, SASU…" })}
          <div><label className="label">SIRET</label>
            <input className="input" inputMode="numeric" placeholder="14 chiffres" maxLength={17} value={a.siret || ""}
              onChange={(e) => { set({ siret: e.target.value }); verifierSiret(e.target.value); }} /></div>
        </div>
        {siretInfo && (
          <p className={`rounded-xl p-3 text-sm ${siretInfo.etat === "ok" ? "bg-green-50 text-green-900" : siretInfo.etat === "erreur" ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-600"}`}>{siretInfo.texte}</p>
        )}
        {!siretInfo && (a.siret || "").replace(/\D/g, "").length === 14 && (
          <button type="button" className="text-sm font-semibold text-brand" onClick={() => verifierSiret(a.siret || "")}>🔎 Vérifier mon SIRET et remplir automatiquement</button>
        )}
        {(a.siret || "").replace(/\D/g, "").length > 0 && (a.siret || "").replace(/\D/g, "").length < 14 && (
          <p className="text-xs text-slate-500">{(a.siret || "").replace(/\D/g, "").length}/14 chiffres — la vérification se lance automatiquement.</p>
        )}
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
          <p className="mt-1 text-xs text-slate-500">Visible uniquement par Rénolien. L'IA lit l'attestation (assureur, dates, activités couvertes) et la compare à votre fiche.</p>
        </div>
        {analyse && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">🔎 Lecture de votre attestation par l'IA… (20 secondes environ)</p>}
        {!analyse && <AnalyseDecennale an={a.decennale_analyse} />}
        {!analyse && a.decennale_doc && (
          <button type="button" className="text-sm font-semibold text-brand" onClick={analyser}>
            {a.decennale_analyse ? "🔄 Relancer la lecture (après avoir modifié vos métiers ou votre SIRET, enregistrez d'abord)" : "🔎 Faire lire mon attestation par l'IA"}
          </button>
        )}
        <div className={`rounded-xl p-3 text-sm ${a.rge ? "bg-green-50 text-green-900" : "bg-slate-50 text-slate-700"}`}>
          <p className="font-bold">{a.rge ? "🌿 Certifié RGE (vérifié au registre ADEME)" : "Certification RGE"}</p>
          {rgeEnCours ? <p className="mt-1">🔎 Vérification au registre officiel…</p> : a.rge_details ? (
            a.rge ? (
              <>
                <p className="mt-1">Domaines : {a.rge_details.domaines?.join(", ") || "—"}</p>
                {a.rge_details.fin && <p>Valable jusqu'au {dateFr(a.rge_details.fin)}{(joursDecennale({ decennale_fin: a.rge_details.fin }) ?? 99) <= 30 && " ⏰ bientôt expirée : pensez à la renouveler"}</p>}
                {a.rge_details.autre_etablissement && <p className="text-xs">Qualification trouvée sur un autre établissement de votre entreprise.</p>}
              </>
            ) : (
              <p className="mt-1">{a.rge_details.trouve ? "Vos qualifications RGE ont expiré. Une fois renouvelées, relancez la vérification." : "Votre SIRET n'apparaît pas dans le registre RGE de l'ADEME. Si vous êtes certifié, vérifiez auprès de votre organisme (Qualibat, Qualit'EnR, Qualifelec…) que votre SIRET est le bon."}</p>
            )
          ) : <p className="mt-1">Le badge RGE est attribué uniquement après vérification de votre SIRET dans le registre officiel (annuaire France Rénov').</p>}
          {rgeErr && <p className="mt-1 text-red-700">{rgeErr}</p>}
          {!rgeEnCours && <button type="button" className="mt-2 font-semibold text-brand" onClick={() => verifierRge()}>{a.rge_details ? "🔄 Vérifier à nouveau" : "🔎 Vérifier ma certification RGE"}</button>}
          {a.rge_details?.verifie_le && <p className="mt-1 text-xs opacity-70">Dernière vérification : {dateFr(a.rge_details.verifie_le)}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!a.tva_franchise} onChange={(e) => set({ tva_franchise: e.target.checked })} /> Franchise de TVA (micro-entreprise, art. 293 B)</label>
        <div><label className="label">Présentation (visible par les clients)</label>
          <textarea className="input" value={a.presentation || ""} onChange={(e) => set({ presentation: e.target.value })} placeholder="Ex : plombier chauffagiste depuis 15 ans, spécialiste salle de bain et PAC." /></div>
      </div>

      <Erreur msg={err} />
      {ok && <p className="text-sm text-green-700">{ok}</p>}
      <button className="btn-primary w-full py-3.5" onClick={enregistrer}>Enregistrer</button>
      <div className="grid grid-cols-2 gap-2">
        <a href="/artisan/abonnement" className="btn-ghost">💳 Abonnement</a>
        <a href="/artisan/parrainage" className="btn-brand">🎁 Parrainer</a>
      </div>
      <MonCompte role="artisan" />
    </div>
  );
}

export default function Page() { return <Suspense><Fiche /></Suspense>; }
