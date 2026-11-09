"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { Deconnexion, Erreur, useProfil } from "@/components/Espace";
import { errMsg } from "@/lib/mer";

export default function Compte() {
  const { profil, recharger } = useProfil();
  const [nom, setNom] = useState(profil.nom || "");
  const [tel, setTel] = useState(profil.telephone || "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function enregistrer() {
    setErr(""); setMsg("");
    const { error } = await sb().from("profils").update({ nom, telephone: tel }).eq("id", profil.id);
    if (error) return setErr(errMsg(error));
    setMsg("Enregistré."); recharger();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Mon compte</h1>
      <div className="card space-y-3">
        <p className="text-sm text-slate-500">{profil.email}</p>
        <div><label className="label">Nom</label><input className="input" value={nom} onChange={(e) => setNom(e.target.value)} /></div>
        <div><label className="label">Téléphone</label><input className="input" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></div>
        <Erreur msg={err} />
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <button className="btn-primary w-full" onClick={enregistrer}>Enregistrer</button>
      </div>
      <Deconnexion />
    </div>
  );
}
