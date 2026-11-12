"use client";
// Admin : offrir une formule d'essai à plusieurs artisans pour une durée au choix, et régler l'essai automatique des nouveaux inscrits.
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import Modal from "./Modal";
import { FORMULES, errMsg, type Artisan } from "@/lib/mer";

const DUREES: [number, string][] = [[7, "7 jours"], [14, "14 jours"], [30, "1 mois"], [60, "2 mois"], [90, "3 mois"], [180, "6 mois"], [365, "1 an"]];
const PAYANTES = FORMULES.filter((f) => f.prix > 0);
const actif = (a: Artisan) => a.abonnement && a.abonnement !== "gratuit" && (!a.abonnement_fin || new Date(a.abonnement_fin) > new Date());
const paye = (a: Artisan) => !!a.stripe_subscription_id && actif(a);

function Duree({ jours, setJours }: { jours: number; setJours: (n: number) => void }) {
  const perso = !DUREES.some(([d]) => d === jours);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DUREES.map(([d, l]) => (
          <button key={d} type="button" onClick={() => setJours(d)}
            className={`chip border py-1.5 ${jours === d ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700"}`}>{l}</button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">ou</span>
        <input className={`input !w-24 !py-1.5 ${perso ? "border-ink" : ""}`} inputMode="numeric" value={jours}
          onChange={(e) => setJours(Math.min(730, Number(e.target.value.replace(/\D/g, "")) || 0))} />
        <span className="text-slate-500">jours</span>
      </div>
    </div>
  );
}

export default function OffrirEssai({ artisans, onClose, onFait }: { artisans: Artisan[]; onClose: () => void; onFait: () => void }) {
  const [formule, setFormule] = useState("pro");
  const [jours, setJours] = useState(30);
  const [qui, setQui] = useState<"gratuits" | "choix">("gratuits");
  const [choix, setChoix] = useState<string[]>([]);
  const [auto, setAuto] = useState({ actif: false, formule: "pro", jours: 30 });
  const [autoCharge, setAutoCharge] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb().from("reglages").select("valeur").eq("cle", "essai_auto").maybeSingle().then(({ data }) => {
      if (data?.valeur) setAuto(data.valeur as typeof auto);
      setAutoCharge(true);
    });
  }, []);

  const possibles = artisans.filter((a) => a.statut !== "suspendu" && !paye(a));
  const cibles = qui === "gratuits" ? possibles.filter((a) => !actif(a)).map((a) => a.id) : choix;
  const nom = (id: string) => FORMULES.find((f) => f.id === id)?.nom;
  const fin = new Date(Date.now() + jours * 864e5).toLocaleDateString("fr-FR");

  async function offrir() {
    setErr(""); setMsg("");
    if (!cibles.length) return setErr("Aucun artisan sélectionné.");
    if (jours < 1) return setErr("Durée invalide.");
    if (!confirm(`Offrir ${nom(formule)} pendant ${jours} jours (jusqu'au ${fin}) à ${cibles.length} artisan(s) ?`)) return;
    setBusy(true);
    const { data, error } = await sb().rpc("offrir_essai", { p_ids: cibles, p_formule: formule, p_jours: jours });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    setMsg(`✅ Essai ${nom(formule)} offert à ${data} artisan(s) jusqu'au ${fin}.`); setChoix([]); onFait();
  }

  async function enregistrerAuto() {
    setErr(""); setMsg("");
    if (auto.actif && auto.jours < 1) return setErr("Durée invalide.");
    const { error } = await sb().from("reglages").upsert({ cle: "essai_auto", valeur: auto, maj_le: new Date().toISOString() });
    if (error) return setErr(errMsg(error));
    setMsg(auto.actif ? `✅ Chaque nouvel artisan recevra ${nom(auto.formule)} pendant ${auto.jours} jours.` : "✅ Essai automatique désactivé.");
  }

  return (
    <Modal title="🎁 Offrir un essai" onClose={onClose} tall>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto text-sm">
        <div className="space-y-2">
          <p className="font-bold">Formule</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PAYANTES.map((f) => (
              <button key={f.id} type="button" onClick={() => setFormule(f.id)}
                className={`rounded-xl border-2 p-2 text-center ${formule === f.id ? "border-flame bg-flame-light" : "border-slate-200"}`}>
                <b>{f.nom}</b><span className="block text-xs text-slate-500">{f.quota ?? "∞"} clients/mois</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-bold">Durée <span className="font-normal text-slate-500">· jusqu'au {fin}</span></p>
          <Duree jours={jours} setJours={setJours} />
        </div>
        <div className="space-y-2">
          <p className="font-bold">À qui ?</p>
          <label className="flex items-center gap-2"><input type="radio" checked={qui === "gratuits"} onChange={() => setQui("gratuits")} />
            Tous les artisans en Découverte ({possibles.filter((a) => !actif(a)).length})</label>
          <label className="flex items-center gap-2"><input type="radio" checked={qui === "choix"} onChange={() => setQui("choix")} /> Choisir les artisans</label>
          {qui === "choix" && (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {possibles.map((a) => (
                <label key={a.id} className="flex items-center justify-between gap-2 py-1">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={choix.includes(a.id)} onChange={(e) => setChoix(e.target.checked ? [...choix, a.id] : choix.filter((x) => x !== a.id))} />
                    {a.raison_sociale || "(sans nom)"}
                  </span>
                  <span className="text-xs text-slate-500">{actif(a) ? `${nom(a.abonnement!)}${a.abonnement_fin ? ` → ${new Date(a.abonnement_fin).toLocaleDateString("fr-FR")}` : ""}` : "Découverte"}</span>
                </label>
              ))}
              {!possibles.length && <p className="text-slate-500">Aucun artisan.</p>}
            </div>
          )}
          <p className="text-xs text-slate-500">Les artisans qui paient déjà par carte ne sont pas concernés. À la fin de l'essai, ils repassent en Découverte automatiquement.</p>
        </div>
        <button className="btn-brand w-full py-3" disabled={busy || !cibles.length} onClick={offrir}>
          {busy ? "…" : `Offrir à ${cibles.length} artisan(s)`}
        </button>

        {autoCharge && (
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <label className="flex items-center justify-between gap-2 font-bold">
              Essai automatique pour chaque nouvel artisan
              <input type="checkbox" className="h-5 w-5" checked={auto.actif} onChange={(e) => setAuto({ ...auto, actif: e.target.checked })} />
            </label>
            {auto.actif && (
              <>
                <select className="input !py-1.5" value={auto.formule} onChange={(e) => setAuto({ ...auto, formule: e.target.value })}>
                  {PAYANTES.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
                <Duree jours={auto.jours} setJours={(n) => setAuto({ ...auto, jours: n })} />
              </>
            )}
            <button className="btn-ghost w-full" onClick={enregistrerAuto}>Enregistrer ce réglage</button>
          </div>
        )}
        {msg && <p className="rounded-xl bg-green-50 p-3 text-green-900">{msg}</p>}
        {err && <p className="rounded-xl bg-red-50 p-3 text-red-700">{err}</p>}
      </div>
    </Modal>
  );
}
