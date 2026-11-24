"use client";
// Aides estimées (MaPrimeRénov' par geste) pour une demande, et reste à charge par offre.
import { useEffect, useState } from "react";
import { eur } from "@/lib/calc";
import { PROFILS, gestesDemande, gestesOffre, memoriserProfil, montantAide, profilDe, profilMemorise, type Profil } from "@/lib/aides";
import type { Artisan, Demande, Offre } from "@/lib/mer";

/** Profil de revenus du client, mémorisé sur l'appareil ; null tant qu'il n'est pas renseigné */
export function useProfilAides(d?: Demande | null) {
  const [v, setV] = useState<{ personnes: number; rfr: number } | null>(null);
  useEffect(() => { setV(profilMemorise()); }, []);
  const profil: Profil | null = v && d ? profilDe(v.personnes, v.rfr, d.departement) : null;
  return { valeurs: v, profil, regler: (x: { personnes: number; rfr: number } | null) => { memoriserProfil(x); setV(x); } };
}

/** Ligne affichée sur une offre : aide estimée et reste à charge (artisan RGE seulement) */
export function AideOffre({ o, a, profil }: { o: Offre; a?: Artisan; profil: Profil | null }) {
  const g = gestesOffre(o.lignes);
  if (!g.length) return null;
  if (!a?.rge) return <p className="text-xs text-slate-500">ℹ️ Artisan non RGE : pas de MaPrimeRénov' possible avec ce devis.</p>;
  if (!profil) return <p className="text-xs font-semibold text-emerald-800">💶 Éligible MaPrimeRénov' (artisan RGE) : renseignez vos revenus plus haut pour voir le montant.</p>;
  const aide = montantAide(g, profil);
  if (!aide) return <p className="text-xs text-slate-500">ℹ️ Revenus supérieurs : pas de MaPrimeRénov' par geste pour ces travaux.</p>;
  return <p className="text-xs font-semibold text-emerald-800">💶 MaPrimeRénov' estimée : {eur(aide)} → reste à charge ≈ {eur(Math.max(0, o.total_ttc - aide))}</p>;
}

export default function Aides({ d, offres, artisans, pa }: { d: Demande; offres: Offre[]; artisans: Record<string, Artisan>; pa: ReturnType<typeof useProfilAides> }) {
  const { valeurs, profil, regler } = pa;
  const [personnes, setPersonnes] = useState("");
  const [rfr, setRfr] = useState("");
  const [modif, setModif] = useState(false);

  // Gestes aidés : ceux du cahier des charges, plus ceux trouvés dans les devis reçus
  const ids = new Set<string>();
  const gestes = [...gestesDemande(d.cahier, d.description), ...offres.flatMap((o) => gestesOffre(o.lignes))].filter((g) => !ids.has(g.id) && ids.add(g.id));
  if (!gestes.length) return null;
  const rge = offres.filter((o) => artisans[o.artisan_id]?.rge).length;

  const valider = () => {
    const p = Number(personnes), r = Number(rfr.replace(/\s/g, ""));
    if (p >= 1 && r >= 0 && rfr.trim()) { regler({ personnes: p, rfr: r }); setModif(false); }
  };

  return (
    <div className="card space-y-2 border-emerald-200 bg-emerald-50/50">
      <p className="font-bold">💶 Aides possibles pour vos travaux</p>
      <p className="text-sm text-slate-700">Vos travaux comprennent : <b>{gestes.map((g) => g.nom.toLowerCase()).join(", ")}</b>. Ils peuvent ouvrir droit à MaPrimeRénov', à condition de passer par un <b>artisan RGE</b>{offres.length ? ` (${rge} offre${rge > 1 ? "s" : ""} sur ${offres.length} reçue${offres.length > 1 ? "s" : ""})` : ""}.</p>

      {profil && !modif ? (
        <div className="space-y-1 rounded-xl bg-white p-3 text-sm">
          <p>Profil estimé : <span className={`chip ${PROFILS[profil].couleur}`}>revenus {PROFILS[profil].nom}</span></p>
          {profil === "rose" ? (
            <p className="text-slate-600">Avec des revenus supérieurs, ces travaux ne sont plus aidés par MaPrimeRénov' par geste. Les primes énergie (CEE) et la TVA à 5,5 % restent possibles.</p>
          ) : (
            <>
              {gestes.map((g) => <p key={g.id} className="flex justify-between gap-2"><span>{g.nom}</span><b className="shrink-0">{eur(g.montants[profil])}</b></p>)}
              <p className="flex justify-between gap-2 border-t pt-1 font-extrabold text-emerald-800"><span>MaPrimeRénov' estimée</span><span>{eur(montantAide(gestes, profil))}</span></p>
              <p className="text-xs text-slate-500">Le reste à charge s'affiche sur chaque offre d'un artisan RGE.</p>
            </>
          )}
          <button className="text-xs font-semibold text-brand" onClick={() => { setModif(true); setPersonnes(String(valeurs?.personnes || "")); setRfr(String(valeurs?.rfr || "")); }}>Modifier mes revenus</button>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl bg-white p-3">
          <p className="text-xs text-slate-600">Pour estimer le montant : le nombre de personnes du foyer et le <b>revenu fiscal de référence</b> (sur votre dernier avis d'impôt). Ces chiffres restent sur votre téléphone, ils ne sont envoyés à personne.</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Personnes</label><input className="input" inputMode="numeric" placeholder="Ex : 3" value={personnes} onChange={(e) => setPersonnes(e.target.value.replace(/\D/g, ""))} /></div>
            <div><label className="label">Revenu fiscal (€)</label><input className="input" inputMode="numeric" placeholder="Ex : 45000" value={rfr} onChange={(e) => setRfr(e.target.value.replace(/[^\d\s]/g, ""))} /></div>
          </div>
          <button className="btn-brand w-full" onClick={valider}>Estimer mes aides</button>
          {valeurs && <button className="w-full text-xs text-slate-500" onClick={() => { regler(null); setModif(false); }}>Effacer mes revenus de ce téléphone</button>}
        </div>
      )}

      <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-600">
        <li>Conditions : résidence principale construite depuis plus de 15 ans, artisan RGE, demande déposée sur maprimerenov.gouv.fr <b>avant le début des travaux</b>.</li>
        <li>Cumulable avec les primes énergie (CEE) des fournisseurs d'énergie, à demander aussi avant de signer, et la TVA à 5,5 % sur ces travaux.</li>
        <li>Estimation indicative selon le barème MaPrimeRénov' en vigueur depuis le 1er septembre 2026. Seule l'Anah confirme le montant : simulateur officiel sur <a className="text-brand underline" href="https://france-renov.gouv.fr" target="_blank" rel="noreferrer">france-renov.gouv.fr</a>.</li>
      </ul>
    </div>
  );
}
