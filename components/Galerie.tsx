"use client";
// Galerie des réalisations d'un artisan : miniatures, agrandissement au toucher, avant/après.
import { useState } from "react";
import { TRADE } from "@/lib/trades";
import { photoUrl, type Realisation } from "@/lib/realisations";

export default function Galerie({ photos, max }: { photos: Realisation[]; max?: number }) {
  const [i, setI] = useState<number | null>(null);
  const [avant, setAvant] = useState(false);
  if (!photos.length) return null;
  const liste = max ? photos.slice(0, max) : photos;
  const p = i !== null ? photos[i] : null;
  const ouvrir = (k: number) => { setI(k); setAvant(false); };
  return (
    <>
      <div className={max ? "flex gap-1.5" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
        {liste.map((r, k) => (
          <button key={r.id} type="button" onClick={() => ouvrir(k)} className={`relative overflow-hidden rounded-xl bg-slate-100 ${max ? "h-16 w-16 shrink-0" : "aspect-square"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(r.chemin)} alt={r.legende || "Réalisation"} loading="lazy" className="h-full w-full object-cover" />
            {r.avant && !max && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">avant / après</span>}
            {!max && r.legende && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-1.5 text-left text-[11px] font-semibold text-white">{r.legende}</span>}
          </button>
        ))}
        {max && photos.length > max && <span className="flex h-16 w-10 items-center text-xs text-slate-500">+{photos.length - max}</span>}
      </div>
      {p && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setI(null)}>
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm">{i! + 1} / {photos.length}</span>
            <button className="text-3xl leading-none" aria-label="Fermer">×</button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button className="px-2 text-4xl text-white/70" onClick={() => ouvrir((i! - 1 + photos.length) % photos.length)} aria-label="Précédente">‹</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(avant && p.avant ? p.avant : p.chemin)} alt={p.legende || "Réalisation"} className="max-h-full min-w-0 flex-1 object-contain" />
            <button className="px-2 text-4xl text-white/70" onClick={() => ouvrir((i! + 1) % photos.length)} aria-label="Suivante">›</button>
          </div>
          <div className="space-y-2 p-4 text-center text-white" onClick={(e) => e.stopPropagation()}>
            {p.avant && (
              <div className="mx-auto flex w-48 rounded-full bg-white/15 p-1 text-sm">
                <button className={`flex-1 rounded-full py-1 ${avant ? "bg-white text-ink" : ""}`} onClick={() => setAvant(true)}>Avant</button>
                <button className={`flex-1 rounded-full py-1 ${!avant ? "bg-white text-ink" : ""}`} onClick={() => setAvant(false)}>Après</button>
              </div>
            )}
            {p.legende && <p className="font-semibold">{p.legende}</p>}
            <p className="text-xs text-white/70">{[p.metier && TRADE[p.metier]?.label, p.ville].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      )}
    </>
  );
}
