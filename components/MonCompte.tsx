"use client";
// Bloc commun « Mon compte » : mes données, documents légaux, contact, suppression du compte.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { LEGAL } from "@/lib/legal";
import { Deconnexion } from "./Espace";

export default function MonCompte({ role }: { role: "client" | "artisan" }) {
  const router = useRouter();
  const [suppr, setSuppr] = useState(false);
  const [mot, setMot] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [mdp, setMdp] = useState("");

  async function exporter() {
    const { data, error } = await sb().rpc("mes_donnees");
    if (error) return setErr(error.message);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mes-donnees-renolien.json"; a.click();
  }

  async function changerMdp() {
    setErr(""); setOk("");
    if (mdp.length < 6) return setErr("6 caractères minimum.");
    const { error } = await sb().auth.updateUser({ password: mdp });
    if (error) return setErr(error.message);
    setMdp(""); setOk("Mot de passe modifié.");
  }

  async function supprimer() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/compte/supprimer", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr((j.error || "Erreur").replace(/^.*?ERROR:\s*/, ""));
    await sb().auth.signOut();
    router.replace("/?compte=supprime");
  }

  const contact = LEGAL.email.startsWith("[") ? null : LEGAL.email;

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <p className="font-bold">🔑 Mot de passe</p>
        <div className="flex gap-2">
          <input className="input" type="password" placeholder="Nouveau mot de passe" value={mdp} onChange={(e) => setMdp(e.target.value)} />
          <button className="btn-ghost shrink-0" onClick={changerMdp}>Changer</button>
        </div>
      </div>
      <div className="card space-y-2 text-sm">
        <p className="font-bold">📄 Documents et aide</p>
        <a className="block text-brand" href="/legal/cgu" target="_blank">Conditions générales d'utilisation</a>
        {role === "artisan" && <a className="block text-brand" href="/legal/cgv" target="_blank">Conditions générales de vente (abonnements)</a>}
        <a className="block text-brand" href="/legal/confidentialite" target="_blank">Politique de confidentialité</a>
        <a className="block text-brand" href="/legal/mentions-legales" target="_blank">Mentions légales</a>
        {contact && <a className="block text-brand" href={`mailto:${contact}`}>✉️ Contacter Rénolien</a>}
        <button className="block text-brand" onClick={exporter}>⬇️ Télécharger mes données</button>
      </div>
      {ok && <p className="text-sm text-green-700">{ok}</p>}
      <Deconnexion />
      {!suppr ? (
        <button className="w-full py-2 text-sm text-red-600" onClick={() => setSuppr(true)}>Supprimer mon compte</button>
      ) : (
        <div className="card space-y-2 border-red-300 bg-red-50 text-sm">
          <p className="font-bold text-red-800">Supprimer définitivement mon compte</p>
          <ul className="list-disc pl-5 text-red-900">
            {role === "client" ? <>
              <li>Vos demandes, photos, messages et avis seront effacés.</li>
              <li>Téléchargez avant vos devis signés (PDF) : ils ne seront plus accessibles.</li>
            </> : <>
              <li>Votre fiche, vos tarifs, vos offres, messages et attestations seront effacés.</li>
              <li>Votre abonnement payant éventuel sera arrêté immédiatement, sans remboursement du mois en cours.</li>
              <li>Téléchargez avant vos devis signés (PDF) : vous devez les conserver 10 ans.</li>
            </>}
            <li>Impossible si un chantier est en cours de choix ou de devis définitif.</li>
          </ul>
          <label className="label">Tapez SUPPRIMER pour confirmer</label>
          <input className="input" value={mot} onChange={(e) => setMot(e.target.value)} />
          {err && <p className="text-red-700">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => { setSuppr(false); setMot(""); setErr(""); }}>Annuler</button>
            <button className="btn-danger flex-1" disabled={busy || mot.trim().toUpperCase() !== "SUPPRIMER"} onClick={supprimer}>{busy ? "…" : "Supprimer"}</button>
          </div>
        </div>
      )}
      {err && !suppr && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
