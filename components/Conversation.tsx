"use client";
// Messagerie client ↔ artisan pour une demande, avec propositions de créneaux de visite.
import { useEffect, useRef, useState } from "react";
import { sb } from "@/lib/supabase";
import { errMsg, quand, type Message } from "@/lib/mer";

// Repère un numéro, un e-mail, un lien, un réseau ou une demande de coordonnées (le vrai filtre est fait par la base)
const CONTACT = /(\d[\s.\-/()]*){8,}|@|https?:|www\.|\.(fr|com|net)\b|whats\s*app|insta|facebook|snap|telegram|messenger|co+r?do+n+[ée]+e?s?|\b(vos|votre|ton|tes|mon|mes|veux)\s+(num|num[ée]ro|t[ée]l|t[ée]l[ée]phone|portable|mail|e-?mail)\b/i;

export default function Conversation({ demandeId, artisanId, moi, visite = true, ferme = false, avantChoix = false }: {
  demandeId: string; artisanId: string; moi: "client" | "artisan"; visite?: boolean; ferme?: boolean; avantChoix?: boolean;
}) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [creneau, setCreneau] = useState("");
  const [ouvrirVisite, setOuvrirVisite] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const bas = useRef<HTMLDivElement>(null);

  async function charger() {
    const { data } = await sb().from("messages").select("*").eq("demande_id", demandeId).eq("artisan_id", artisanId).order("created_at");
    const liste = (data as Message[]) || [];
    setMsgs((avant) => {
      if (liste.length !== avant.length) setTimeout(() => bas.current?.scrollIntoView({ block: "nearest" }), 50);
      return liste;
    });
    if (liste.some((m) => !m.lu && m.auteur !== moi)) sb().rpc("marquer_lus", { p_demande: demandeId, p_artisan: artisanId });
  }
  useEffect(() => {
    charger();
    const t = setInterval(charger, 15000); // rafraîchit toutes les 15 s
    return () => clearInterval(t);
  }, [demandeId, artisanId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function envoyer(avecCreneau = false) {
    setErr("");
    if (avecCreneau && !creneau) return setErr("Choisissez une date et une heure.");
    if (avantChoix && CONTACT.test(texte) && !confirm(moi === "artisan"
      ? "Les coordonnées ne peuvent pas être échangées avant que le client vous choisisse : elles seront masquées dans votre message, et la tentative est enregistrée. Elles vous seront transmises automatiquement si le client vous choisit.\n\nEnvoyer quand même ?"
      : "Les coordonnées ne peuvent pas être échangées avant votre choix : elles seront masquées. Si vous choisissez cet artisan, vos coordonnées lui seront transmises automatiquement.\n\nEnvoyer quand même ?")) return;
    setBusy(true);
    const { error } = await sb().rpc("envoyer_message", {
      p_demande: demandeId, p_artisan: artisanId, p_texte: texte,
      p_creneau: avecCreneau ? new Date(creneau).toISOString() : null,
    });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    setTexte(""); setCreneau(""); setOuvrirVisite(false); charger();
  }

  async function repondre(id: string, accepte: boolean) {
    const { error } = await sb().rpc("repondre_visite", { p_message: id, p_accepte: accepte });
    if (error) return setErr(errMsg(error));
    charger();
  }

  const visiteOk = msgs.find((m) => m.kind === "visite" && m.visite_statut === "acceptee");

  return (
    <div className="space-y-2">
      {avantChoix && (
        <p className="rounded-xl bg-blue-50 p-2.5 text-xs text-blue-900">
          🔒 Échangez ici sur le projet. Les numéros, e-mails et liens sont masqués automatiquement : {moi === "artisan"
            ? "les coordonnées du client vous seront transmises s'il vous choisit."
            : "vos coordonnées seront transmises à l'artisan seulement si vous le choisissez."}
        </p>
      )}
      {visiteOk && (
        <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-900">📅 Visite prévue {quand(visiteOk.creneau)}</p>
      )}
      <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-2">
        {!msgs.length && <p className="p-2 text-center text-xs text-slate-400">Aucun message. Posez vos questions ici.</p>}
        {msgs.map((m) => {
          const mien = m.auteur === moi;
          return (
            <div key={m.id} className={`flex ${mien ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mien ? "bg-ink text-white" : "border border-slate-200 bg-white"}`}>
                {m.kind === "visite" ? (
                  <div className="space-y-1.5">
                    <p className="font-semibold">📅 Proposition de visite</p>
                    <p>{quand(m.creneau)}</p>
                    {m.texte && <p>{m.texte}</p>}
                    {m.visite_statut === "proposee" && !mien && !ferme ? (
                      <div className="flex gap-1.5 pt-1">
                        <button onClick={() => repondre(m.id, true)} className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white">Accepter</button>
                        <button onClick={() => repondre(m.id, false)} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-semibold text-ink">Refuser</button>
                      </div>
                    ) : (
                      <p className="text-xs opacity-75">{m.visite_statut === "acceptee" ? "✅ Acceptée" : m.visite_statut === "refusee" ? "❌ Refusée" : "En attente de réponse"}</p>
                    )}
                  </div>
                ) : <p className="whitespace-pre-line">{m.texte}</p>}
                {(m as Message & { masque?: boolean }).masque && <p className={`mt-0.5 text-[10px] italic ${mien ? "text-white/60" : "text-slate-400"}`}>Coordonnées masquées : échangées seulement après le choix du client.</p>}
                <p className={`mt-0.5 text-[10px] ${mien ? "text-white/60" : "text-slate-400"}`}>{quand(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bas} />
      </div>
      {!ferme && (
        <>
          {ouvrirVisite && visite && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-2">
              <label className="label">Créneau proposé pour la visite</label>
              <input type="datetime-local" className="input" value={creneau} onChange={(e) => setCreneau(e.target.value)} />
              <button className="btn-brand w-full" disabled={busy} onClick={() => envoyer(true)}>Proposer ce créneau</button>
            </div>
          )}
          <div className="flex gap-2">
            {visite && <button type="button" className="btn-ghost !px-3" title="Proposer une visite" onClick={() => setOuvrirVisite(!ouvrirVisite)}>📅</button>}
            <input className="input" placeholder="Votre message…" value={texte} onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && texte.trim()) envoyer(); }} />
            <button className="btn-primary !px-4" disabled={busy || !texte.trim()} onClick={() => envoyer()}>➤</button>
          </div>
        </>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
