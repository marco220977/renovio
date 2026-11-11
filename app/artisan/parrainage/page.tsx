"use client";
// Parrainage : l'artisan partage son lien ; filleul +3 offres bonus, parrain +5 offres bonus à la 1re offre du filleul.
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { dateFr } from "@/lib/calc";
import { useProfil } from "@/components/Espace";

type Filleul = { raison_sociale: string; inscrit_le: string; recompense: boolean };

export default function Parrainage() {
  const { profil } = useProfil();
  const [code, setCode] = useState("");
  const [filleuls, setFilleuls] = useState<Filleul[]>([]);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    const s = sb();
    s.from("artisans").select("code_parrain").eq("id", profil.id).maybeSingle().then(({ data }) => setCode(data?.code_parrain || ""));
    s.rpc("mes_filleuls").then(({ data }) => setFilleuls((data as Filleul[]) || []));
  }, [profil.id]);

  const lien = code ? `${typeof window !== "undefined" ? location.origin : ""}/connexion?mode=signup&role=artisan&parrain=${code}` : "";
  const texte = `Je reçois des demandes de travaux près de chez moi avec Rénolien, et le devis est prêt en 1 clic grâce à l'IA. Inscris-toi avec mon lien, tu as 3 offres offertes : ${lien}`;
  const gagnes = filleuls.filter((f) => f.recompense).length * 5;

  async function copier() {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch {}
  }
  async function partager() {
    const nav = navigator as any;
    if (nav.share) { try { await nav.share({ title: "Rénolien", text: texte }); return; } catch {} }
    copier();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Parrainer un artisan</h1>
      <div className="card space-y-2 bg-flame-light">
        <p className="font-bold">🎁 Gagnez 5 offres par artisan parrainé</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Votre filleul reçoit <b>3 offres bonus</b> dès son inscription.</li>
          <li>Vous recevez <b>5 offres bonus</b> quand il envoie sa première offre.</li>
          <li>Pas de limite : plus vous parrainez, plus vous gagnez.</li>
        </ul>
      </div>
      <div className="card space-y-3">
        <p className="text-sm text-slate-500">Votre code</p>
        <p className="text-3xl font-extrabold tracking-widest">{code || "…"}</p>
        <input className="input text-xs" readOnly value={lien} onFocus={(e) => e.target.select()} />
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={copier} disabled={!code}>{copie ? "✔ Copié" : "📋 Copier le lien"}</button>
          <button className="btn-brand" onClick={partager} disabled={!code}>📤 Partager</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a className="btn-ghost text-sm" href={`https://wa.me/?text=${encodeURIComponent(texte)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="btn-ghost text-sm" href={`sms:?&body=${encodeURIComponent(texte)}`}>SMS</a>
        </div>
      </div>
      <div className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="font-bold">Mes filleuls ({filleuls.length})</p>
          {gagnes > 0 && <p className="text-sm font-semibold text-green-700">+{gagnes} offres gagnées</p>}
        </div>
        {!filleuls.length && <p className="text-sm text-slate-500">Aucun filleul pour l'instant. Partagez votre lien à vos collègues artisans !</p>}
        {filleuls.map((f, i) => (
          <div key={i} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
            <span>{f.raison_sociale} <span className="text-xs text-slate-400">· {dateFr(f.inscrit_le)}</span></span>
            {f.recompense ? <span className="chip bg-green-100 text-green-800">+5 offres</span> : <span className="chip bg-slate-100 text-slate-500">En attente de sa 1re offre</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
