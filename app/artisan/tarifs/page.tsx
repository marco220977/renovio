"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { eur, VAT_RATES } from "@/lib/calc";
import { TRADE } from "@/lib/trades";
import Modal from "@/components/Modal";
import { Erreur, Info } from "@/components/Espace";
import { errMsg, type Tarif } from "@/lib/mer";

const vide: Partial<Tarif> = { libelle: "", unite: "u", prix_ht: 0, tva: 10, categorie: "Prestation" };

export default function Tarifs() {
  const [liste, setListe] = useState<Tarif[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<Tarif> | null>(null);
  const [prix, setPrix] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const charger = () => sb().from("tarifs").select("*").order("metier").order("libelle").then(({ data }) => setListe((data as Tarif[]) || []));
  useEffect(() => { charger(); }, []);

  async function depart() {
    setBusy(true); setErr("");
    const { data, error } = await sb().rpc("charger_tarifs_depart");
    setBusy(false);
    if (error) return setErr(errMsg(error));
    setInfo(`${data} tarifs ajoutés. Adaptez les prix aux vôtres : l'IA s'en sert pour vos devis.`); charger();
  }

  async function enregistrer() {
    if (!edit?.libelle?.trim()) return setErr("Libellé obligatoire.");
    setErr("");
    const row = { libelle: edit.libelle.trim(), description: edit.description || null, unite: edit.unite || "u",
      prix_ht: Number(prix.replace(",", ".")) || 0, tva: Number(edit.tva) || 0, categorie: edit.categorie || "Prestation", metier: edit.metier || null };
    const s = sb();
    const { error } = edit.id ? await s.from("tarifs").update(row).eq("id", edit.id) : await s.from("tarifs").insert(row);
    if (error) return setErr(errMsg(error));
    setEdit(null); charger();
  }

  async function supprimer() {
    if (!edit?.id || !confirm("Supprimer ce tarif ?")) return;
    await sb().from("tarifs").delete().eq("id", edit.id);
    setEdit(null); charger();
  }

  const ouvrir = (t: Partial<Tarif>) => { setErr(""); setEdit(t); setPrix(String(t.prix_ht ?? 0).replace(".", ",")); };
  const filtres = (liste || []).filter((t) => !q || t.libelle.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Mes tarifs</h1>
        <button className="btn-brand !py-2 text-sm" onClick={() => ouvrir(vide)}>＋ Ajouter</button>
      </div>
      <p className="text-sm text-slate-600">L'IA utilise ces prix pour pré-remplir vos devis. Plus ils sont justes, moins vous aurez à corriger.</p>
      {info && <Info>{info}</Info>}
      <Erreur msg={!edit ? err : ""} />
      {liste?.length === 0 && (
        <div className="card space-y-2 text-center">
          <p className="text-sm">Pas encore de tarifs.</p>
          <button className="btn-primary w-full" disabled={busy} onClick={depart}>{busy ? "…" : "📚 Charger des tarifs de départ pour mes métiers"}</button>
        </div>
      )}
      {!!liste?.length && <input className="input" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="space-y-1.5">
        {filtres.map((t) => (
          <button key={t.id} onClick={() => ouvrir(t)} className="card flex w-full items-center justify-between gap-2 !p-3 text-left">
            <span className="text-sm">{t.metier && TRADE[t.metier]?.emoji} {t.libelle}</span>
            <span className="shrink-0 text-sm font-semibold">{eur(t.prix_ht)}<span className="text-xs font-normal text-slate-500">/{t.unite}</span></span>
          </button>
        ))}
      </div>
      {!!liste?.length && <button className="btn-ghost w-full text-sm" disabled={busy} onClick={depart}>📚 Compléter avec les tarifs de départ</button>}

      {edit && (
        <Modal title={edit.id ? "Modifier le tarif" : "Nouveau tarif"} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <div><label className="label">Libellé</label><input className="input" value={edit.libelle || ""} onChange={(e) => setEdit({ ...edit, libelle: e.target.value })} /></div>
            <div><label className="label">Description (facultatif)</label><input className="input" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="label">Prix HT</label><input className="input" inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} /></div>
              <div><label className="label">Unité</label><input className="input" value={edit.unite || ""} onChange={(e) => setEdit({ ...edit, unite: e.target.value })} /></div>
              <div><label className="label">TVA</label>
                <select className="input" value={edit.tva} onChange={(e) => setEdit({ ...edit, tva: Number(e.target.value) })}>
                  {VAT_RATES.map((r) => <option key={r} value={r}>{String(r).replace(".", ",")} %</option>)}
                </select></div>
            </div>
            <Erreur msg={err} />
            <div className="flex gap-2">
              {edit.id && <button className="btn-danger" onClick={supprimer}>Supprimer</button>}
              <button className="btn-primary flex-1" onClick={enregistrer}>Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
