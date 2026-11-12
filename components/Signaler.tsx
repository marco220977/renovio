"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";

/** Bouton artisan : signaler une demande hors sujet (masquée automatiquement à 2 signalements) */
export default function Signaler({ demandeId }: { demandeId: string }) {
  const [etat, setEtat] = useState<"" | "envoi" | "ok" | "erreur">("");
  async function signaler() {
    if (!confirm("Signaler cette demande comme hors sujet (pas une vraie demande de travaux) ?")) return;
    setEtat("envoi");
    const { error } = await sb().rpc("signaler_demande", { p_demande: demandeId, p_motif: "hors_sujet" });
    setEtat(error ? "erreur" : "ok");
  }
  if (etat === "ok") return <p className="text-center text-xs text-slate-500">Merci, la demande a été signalée à Rénolien.</p>;
  return (
    <button type="button" className="mx-auto block text-xs text-slate-400 underline" disabled={etat === "envoi"} onClick={signaler}>
      {etat === "erreur" ? "Signalement impossible, réessayez" : "🚩 Signaler une demande hors sujet"}
    </button>
  );
}
