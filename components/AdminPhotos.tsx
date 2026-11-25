"use client";
// Admin : photos de réalisations en attente de validation (publier ou refuser avec un motif).
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { TRADE } from "@/lib/trades";
import { photoUrl, type Realisation } from "@/lib/realisations";

type Ligne = Realisation & { artisans?: { raison_sociale?: string; slug?: string } };
const MOTIFS = ["Visage ou personne reconnaissable", "Plaque d'immatriculation ou adresse visible", "Ce n'est pas une photo de chantier", "Photo de catalogue ou trouvée sur internet", "Photo floue ou trop sombre"];

export default function AdminPhotos() {
  const [liste, setListe] = useState<Ligne[]>([]);
  const [grand, setGrand] = useState("");
  const [err, setErr] = useState("");
  const charger = () => sb().from("realisations").select("*, artisans(raison_sociale, slug)").eq("statut", "attente").order("created_at")
    .then(({ data, error }) => { if (error) setErr(error.message); setListe((data as Ligne[]) || []); });
  useEffect(() => { charger(); }, []);

  async function decider(r: Ligne, statut: "publiee" | "refusee", motif?: string) {
    const { error } = await sb().from("realisations").update({ statut, motif: motif || null }).eq("id", r.id);
    if (error) return setErr(error.message);
    setListe((l) => l.filter((x) => x.id !== r.id));
  }
  function refuser(r: Ligne) {
    const choix = prompt(`Motif du refus (visible par l'artisan) :\n${MOTIFS.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nTapez un numéro ou votre propre motif.`);
    if (choix === null) return;
    const n = Number(choix.trim());
    decider(r, "refusee", n >= 1 && n <= MOTIFS.length ? MOTIFS[n - 1] : choix.trim() || "Photo non conforme");
  }

  if (!liste.length && !err) return null;
  return (
    <div className="card space-y-3 border-amber-300">
      <p className="font-bold">📷 Photos de réalisations à valider ({liste.length})</p>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {liste.map((r) => (
        <div key={r.id} className="space-y-2 rounded-xl border border-slate-200 p-2">
          <div className="flex gap-2">
            {[r.avant, r.chemin].filter(Boolean).map((c, i, t) => (
              <button key={c} className="relative" onClick={() => setGrand(photoUrl(c))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(c)} alt="" className="h-28 w-28 rounded-lg object-cover" />
                {t.length > 1 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{i === 0 ? "avant" : "après"}</span>}
              </button>
            ))}
          </div>
          <p className="text-sm"><b>{r.artisans?.raison_sociale || "Artisan"}</b> · {r.legende || "sans légende"}</p>
          <p className="text-xs text-slate-500">{[r.metier && TRADE[r.metier]?.label, r.ville, new Date(r.created_at!).toLocaleString("fr-FR")].filter(Boolean).join(" · ")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost !py-2 text-sm text-red-700" onClick={() => refuser(r)}>✖ Refuser</button>
            <button className="btn-brand !py-2 text-sm" onClick={() => decider(r, "publiee")}>✔ Publier</button>
          </div>
        </div>
      ))}
      {grand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2" onClick={() => setGrand("")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={grand} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
