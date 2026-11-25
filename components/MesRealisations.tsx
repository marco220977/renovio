"use client";
// « Mes réalisations » : l'artisan ajoute jusqu'à 12 photos de chantiers pour sa vitrine. Publiées après validation.
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { compresser, dataUrlToBlob, errMsg, type Artisan } from "@/lib/mer";
import { TRADE } from "@/lib/trades";
import { photoUrl, type Realisation } from "@/lib/realisations";

const MAX = 12;
const STATUT: Record<string, [string, string]> = {
  attente: ["⏳ En cours de validation", "bg-amber-100 text-amber-800"],
  publiee: ["✔ Publiée", "bg-green-100 text-green-800"],
  refusee: ["✖ Refusée", "bg-red-100 text-red-800"],
};

export default function MesRealisations({ a }: { a: Artisan & { slug?: string | null } }) {
  const [liste, setListe] = useState<Realisation[]>([]);
  const [ajout, setAjout] = useState(false);
  const [apres, setApres] = useState("");
  const [avant, setAvant] = useState("");
  const [legende, setLegende] = useState("");
  const [metier, setMetier] = useState(a.metiers?.[0] || "");
  const [ville, setVille] = useState(a.ville || "");
  const [certifie, setCertifie] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const charger = () => sb().from("realisations").select("*").eq("artisan_id", a.id).order("ordre").order("created_at")
    .then(({ data }) => setListe((data as Realisation[]) || []));
  useEffect(() => { charger(); }, [a.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function choisir(f: File | undefined, quoi: "apres" | "avant") {
    if (!f) return;
    setErr("");
    try { const u = await compresser(f, 1600, 0.8); if (quoi === "apres") setApres(u); else setAvant(u); }
    catch { setErr("Photo illisible : essayez une autre image (JPG ou PNG)."); }
  }

  async function envoyer() {
    if (!apres) return setErr("Ajoutez la photo du chantier.");
    if (!certifie) return setErr("Cochez la case : les photos doivent venir de vos propres chantiers.");
    setBusy("Envoi…"); setErr("");
    try {
      const s = sb(), t = Date.now();
      const chemin = `${a.id}/${t}.jpg`;
      const { error: e1 } = await s.storage.from("realisations").upload(chemin, dataUrlToBlob(apres), { contentType: "image/jpeg" });
      if (e1) throw e1;
      let cheminAvant: string | null = null;
      if (avant) {
        cheminAvant = `${a.id}/${t}-avant.jpg`;
        const { error: e2 } = await s.storage.from("realisations").upload(cheminAvant, dataUrlToBlob(avant), { contentType: "image/jpeg" });
        if (e2) throw e2;
      }
      const ordre = liste.length ? Math.max(...liste.map((r) => r.ordre || 0)) + 1 : 0;
      const { error: e3 } = await s.from("realisations").insert({ chemin, avant: cheminAvant, legende: legende.trim() || null, metier: metier || null, ville: ville.trim() || null, ordre, certifie: true });
      if (e3) { await s.storage.from("realisations").remove([chemin, cheminAvant].filter(Boolean) as string[]); throw e3; }
      setApres(""); setAvant(""); setLegende(""); setAjout(false);
      await charger();
    } catch (e) { setErr(errMsg(e)); }
    setBusy("");
  }

  async function supprimer(r: Realisation) {
    if (!confirm("Supprimer cette photo de votre vitrine ?")) return;
    const s = sb();
    const { error } = await s.from("realisations").delete().eq("id", r.id);
    if (error) return setErr(errMsg(error));
    await s.storage.from("realisations").remove([r.chemin, r.avant].filter(Boolean) as string[]);
    charger();
  }

  async function deplacer(k: number, sens: -1 | 1) {
    const j = k + sens;
    if (j < 0 || j >= liste.length) return;
    const n = [...liste]; [n[k], n[j]] = [n[j], n[k]];
    setListe(n);
    await Promise.all(n.map((r, i) => r.ordre === i ? null : sb().from("realisations").update({ ordre: i }).eq("id", r.id)));
  }

  const vitrine = a.slug ? `/pro/${a.slug}` : "";
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">📷 Mes réalisations <span className="font-normal text-slate-500">({liste.length}/{MAX})</span></p>
        {vitrine && <a href={vitrine} target="_blank" className="text-sm font-semibold text-brand">Voir ma vitrine ↗</a>}
      </div>
      <p className="text-xs text-slate-500">
        Vos plus beaux chantiers, affichés sur votre vitrine publique et à côté de vos offres. Chaque photo est vérifiée par Rénolien avant publication.
        {!a.verifie && " Votre vitrine sera visible par les clients une fois votre compte vérifié."}
      </p>

      {liste.length > 0 && (
        <div className="space-y-2">
          {liste.map((r, k) => (
            <div key={r.id} className="flex gap-3 rounded-xl border border-slate-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(r.chemin)} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="truncate font-semibold">{r.legende || "Sans légende"}</p>
                <p className="text-xs text-slate-500">{[r.metier && TRADE[r.metier]?.label, r.ville, r.avant && "avant/après"].filter(Boolean).join(" · ")}</p>
                <span className={`chip !py-0.5 text-[11px] ${STATUT[r.statut || "attente"][1]}`}>{STATUT[r.statut || "attente"][0]}</span>
                {r.statut === "refusee" && r.motif && <p className="text-xs text-red-700">Motif : {r.motif}</p>}
              </div>
              <div className="flex flex-col items-center justify-between text-slate-400">
                <button type="button" onClick={() => deplacer(k, -1)} disabled={k === 0} aria-label="Monter">▲</button>
                <button type="button" onClick={() => supprimer(r)} className="text-red-500" aria-label="Supprimer">🗑</button>
                <button type="button" onClick={() => deplacer(k, 1)} disabled={k === liste.length - 1} aria-label="Descendre">▼</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {liste.length < MAX && !ajout && <button type="button" className="btn-ghost w-full" onClick={() => setAjout(true)}>➕ Ajouter une réalisation</button>}

      {ajout && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            {([["apres", "Photo du chantier fini *", apres], ["avant", "Photo « avant » (facultatif)", avant]] as const).map(([q, l, v]) => (
              <div key={q}>
                <p className="label">{l}</p>
                {v ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    <button type="button" className="absolute right-1 top-1 rounded-full bg-white px-2 text-sm shadow" onClick={() => q === "apres" ? setApres("") : setAvant("")}>×</button>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <label className="btn-ghost cursor-pointer !py-2 text-xs">📷 Photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => choisir(e.target.files?.[0], q)} /></label>
                    <label className="btn-ghost cursor-pointer !py-2 text-xs">🖼️ Galerie<input type="file" accept="image/*" className="hidden" onChange={(e) => choisir(e.target.files?.[0], q)} /></label>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div><label className="label">Légende</label>
            <input className="input" maxLength={120} value={legende} onChange={(e) => setLegende(e.target.value)} placeholder="Ex : Salle de bain complète, douche à l'italienne" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Métier</label>
              <select className="input" value={metier} onChange={(e) => setMetier(e.target.value)}>
                <option value="">—</option>
                {(a.metiers || []).map((m) => <option key={m} value={m}>{TRADE[m]?.label || m}</option>)}
              </select></div>
            <div><label className="label">Ville du chantier</label>
              <input className="input" maxLength={60} value={ville} onChange={(e) => setVille(e.target.value)} /></div>
          </div>
          <p className="text-xs text-slate-500">Évitez les visages, plaques d'immatriculation et numéros de rue : ces photos seraient refusées.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={certifie} onChange={(e) => setCertifie(e.target.checked)} />
            Je certifie que ces photos ont été prises sur mes propres chantiers et que j'ai le droit de les publier.</label>
          {err && <p className="text-sm text-red-700">{err}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" onClick={() => { setAjout(false); setErr(""); }}>Annuler</button>
            <button type="button" className="btn-brand" disabled={!!busy} onClick={envoyer}>{busy || "Envoyer"}</button>
          </div>
        </div>
      )}
      {!ajout && err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
