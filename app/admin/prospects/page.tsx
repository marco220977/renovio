"use client";
// Prospection : entreprises du bâtiment de moins de 2 ans en Île-de-France (registre Sirene + contacts RGE), réservé à l'admin.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

type P = {
  siret: string; siren: string; nom: string; dirigeant: string | null; metier: string; adresse: string; cp: string; ville: string; dep: string;
  creation: string | null; effectif: string | null; forme: string | null; rge: boolean; telephone: string | null; email: string | null; statut: string; note: string | null;
  source: string; domaines_rge: string | null; desinscrit: boolean; email_etape: number; email_dernier: string | null; email_clic: string | null; email_erreur: string | null;
};
type Stats = { reglages: { actif: boolean; par_jour: number; relance_jours: number; expediteur: string }; avec_email: number; a_envoyer: number;
  envoyes: number; aujourdhui: number; erreurs: number; clics: number; desinscrits: number; inscrits: number };
const STATUTS: [string, string, string][] = [
  ["a_contacter", "À contacter", "bg-slate-100 text-slate-700"], ["contacte", "Contacté", "bg-blue-100 text-blue-800"],
  ["interesse", "Intéressé", "bg-amber-100 text-amber-900"], ["inscrit", "Inscrit ✔", "bg-green-100 text-green-800"],
  ["pas_interesse", "Pas intéressé", "bg-red-100 text-red-800"],
];
const DEPS = ["75", "77", "91", "92", "93", "94", "95"];
const PAR_PAGE = 30;
const dateFr = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

/** Prospection automatique par e-mail (Brevo) */
function PanneauEmail() {
  const [st, setSt] = useState<Stats | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [msg, setMsg] = useState("");
  const charger = () => sb().rpc("stats_prospection").then(({ data }) => setSt(data as Stats));
  useEffect(() => { charger(); }, []);
  if (!st) return null;
  const R = st.reglages;
  async function regler(p: Record<string, unknown>) {
    const { error } = await sb().rpc("regler_prospection", { p });
    if (error) setMsg(error.message); else charger();
  }
  async function test(etape: number) {
    setMsg("Envoi du test…");
    const { data, error } = await sb().functions.invoke("prospection-mail", { body: { test: true, etape } });
    let m = data?.error;
    if (error) { m = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) m = j.error; } catch {} }
    setMsg(m ? `❌ ${m}` : `✔ E-mail de test envoyé à ${data.a}. Regardez votre boîte (et les spams).`);
  }
  return (
    <div className={`card space-y-2 !p-3 ${R.actif ? "border-green-300" : ""}`}>
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOuvert(!ouvert)}>
        <span className="font-bold">✉️ Prospection automatique {R.actif ? <span className="chip bg-green-100 text-green-800">En marche</span> : <span className="chip bg-slate-100 text-slate-600">En pause</span>}</span>
        <span className="text-xs text-slate-500">{st.envoyes} envoyés · {st.clics} clics</span>
      </button>
      {ouvert && (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Avec e-mail", st.avec_email], ["Reste à envoyer", st.a_envoyer], ["Aujourd'hui", st.aujourdhui], ["Envoyés", st.envoyes], ["Clics", st.clics], ["Inscrits", st.inscrits], ["Désinscrits", st.desinscrits], ["Erreurs", st.erreurs]].map(([l, v]) => (
              <div key={l as string} className="rounded-lg bg-slate-50 p-2"><p className="text-lg font-extrabold">{v as number}</p><p className="text-[11px] text-slate-500">{l}</p></div>
            ))}
          </div>
          <p className="text-xs text-slate-500">Du lundi au vendredi, entre 8 h 30 et 10 h : premier e-mail puis relance après {R.relance_jours} jours sans clic. Arrêt automatique en cas d'inscription ou de désinscription. Expéditeur : {R.expediteur}.</p>
          <label className="flex items-center justify-between gap-2">E-mails par jour (300 max. en gratuit)
            <select className="input !w-24 !py-1.5" value={R.par_jour} onChange={(e) => regler({ par_jour: Number(e.target.value) })}>
              {[20, 50, 100, 150, 250, 290].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 !py-2" onClick={() => test(1)}>Test e-mail 1</button>
            <button className="btn-ghost flex-1 !py-2" onClick={() => test(2)}>Test relance</button>
          </div>
          <button className={`w-full !py-2.5 ${R.actif ? "btn-danger" : "btn-brand"}`}
            onClick={() => confirm(R.actif ? "Mettre la prospection en pause ?" : "Lancer l'envoi automatique des e-mails de prospection ?") && regler({ actif: !R.actif })}>
            {R.actif ? "⏸ Mettre en pause" : "▶️ Lancer la prospection"}
          </button>
          {msg && <p className="rounded-lg bg-slate-50 p-2">{msg}</p>}
        </div>
      )}
    </div>
  );
}

export default function Prospects() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [liste, setListe] = useState<P[]>([]);
  const [total, setTotal] = useState(0);
  const [metiers, setMetiers] = useState<string[]>([]);
  const [f, setF] = useState({ dep: "", metier: "", statut: "", contact: false, q: "", source: "" });
  const [page, setPage] = useState(0);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const s = sb();
    s.rpc("est_admin").then(({ data }) => setAdmin(!!data));
    s.from("prospects").select("metier").limit(5000).then(({ data }) => setMetiers([...new Set((data || []).map((x: any) => x.metier))].sort()));
  }, []);

  const requete = useCallback((sel: string, count = false) => {
    let r = sb().from("prospects").select(sel, count ? { count: "exact" } : undefined);
    if (f.dep) r = r.eq("dep", f.dep);
    if (f.metier) r = r.eq("metier", f.metier);
    if (f.statut) r = r.eq("statut", f.statut);
    if (f.contact) r = r.or("telephone.not.is.null,email.not.is.null");
    if (f.source) r = r.eq("source", f.source);
    const q = f.q.trim().replace(/[,()]/g, " ");
    if (q) r = r.or(`nom.ilike.%${q}%,ville.ilike.%${q}%,dirigeant.ilike.%${q}%,cp.ilike.${q}%`);
    return r;
  }, [f]);

  const charger = useCallback(async () => {
    const { data, count } = await requete("*", true).order("creation", { ascending: false, nullsFirst: false }).range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
    setListe((data as unknown as P[]) || []); setTotal(count || 0);
  }, [requete, page]);
  useEffect(() => { if (admin) charger(); }, [admin, charger]);

  async function maj(siret: string, p: Partial<P>) {
    setListe((l) => l.map((x) => (x.siret === siret ? { ...x, ...p } : x)));
    await sb().from("prospects").update({ ...p, maj_le: new Date().toISOString() }).eq("siret", siret);
  }

  async function exporter() {
    setBusy("export"); setInfo("");
    const lignes: P[] = [];
    for (let i = 0; ; i += 1000) {
      const { data } = await requete("*").order("creation", { ascending: false }).range(i, i + 999);
      lignes.push(...((data as unknown as P[]) || []));
      if (!data || data.length < 1000) break;
    }
    const cols: [keyof P, string][] = [["nom", "Entreprise"], ["dirigeant", "Dirigeant"], ["metier", "Métier"], ["forme", "Forme"], ["creation", "Création"],
      ["adresse", "Adresse"], ["cp", "Code postal"], ["ville", "Ville"], ["telephone", "Téléphone"], ["email", "E-mail"], ["rge", "RGE"], ["siret", "SIRET"], ["statut", "Statut"], ["note", "Note"]];
    const esc = (v: unknown) => { const s = v === true ? "oui" : v === false ? "" : String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = "﻿" + [cols.map((c) => c[1]).join(";"), ...lignes.map((l) => cols.map(([k]) => esc(k === "creation" ? dateFr(l.creation) : k === "statut" ? STATUTS.find((s) => s[0] === l.statut)?.[1] : k === "siret" ? `'${l.siret}` : l[k])).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `prospects-renolien-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setBusy(""); setInfo(`${lignes.length} entreprises exportées.`);
  }

  async function actualiser() {
    setBusy("maj"); setInfo("Mise à jour en cours (environ 1 minute)…");
    const s = sb();
    const { error } = await s.rpc("prospects_demander");
    if (error) { setBusy(""); return setInfo(error.message); }
    await new Promise((r) => setTimeout(r, 60000));
    const { data, error: e2 } = await s.rpc("prospects_integrer");
    setBusy("");
    setInfo(e2 ? e2.message : `Liste à jour : ${data?.prospects} entreprises, dont ${data?.avec_contact} avec contact.`);
    charger();
  }

  if (admin === null) return <p className="p-6 text-center text-slate-500">Chargement…</p>;
  if (!admin) return <p className="p-6 text-center">Accès réservé à l'administrateur. <Link href="/" className="text-brand">Accueil</Link></p>;

  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setPage(0); };
  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-sm font-semibold text-brand">← Admin</Link>
          <span className="font-extrabold">🎯 Prospects</span>
          <span className="text-xs text-slate-500">{total.toLocaleString("fr-FR")}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <PanneauEmail />
        <p className="text-xs text-slate-500">Entreprises du bâtiment de moins de 2 ans en Île-de-France (registre Sirene) et entreprises RGE avec e-mail (registre ADEME). Mise à jour automatique chaque lundi.</p>
        <input className="input" placeholder="🔍 Nom, ville, dirigeant ou code postal" value={f.q} onChange={(e) => set({ q: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <select className="input !py-2 text-sm" value={f.dep} onChange={(e) => set({ dep: e.target.value })}>
            <option value="">Tous dép.</option>{DEPS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input !py-2 text-sm" value={f.metier} onChange={(e) => set({ metier: e.target.value })}>
            <option value="">Tous métiers</option>{metiers.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input !py-2 text-sm" value={f.statut} onChange={(e) => set({ statut: e.target.value })}>
            <option value="">Tous statuts</option>{STATUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.contact} onChange={(e) => set({ contact: e.target.checked })} /> Avec téléphone ou e-mail</label>
          <select className="input !w-auto !py-1.5 text-sm" value={f.source} onChange={(e) => set({ source: e.target.value })}>
            <option value="">Toutes sources</option><option value="sirene">Moins de 2 ans</option><option value="rge">RGE avec e-mail</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-brand flex-1 !py-2.5 text-sm" disabled={!!busy} onClick={exporter}>{busy === "export" ? "Export…" : "⬇️ Exporter (Excel / CSV)"}</button>
          <button className="btn-ghost !py-2.5 text-sm" disabled={!!busy} onClick={actualiser}>{busy === "maj" ? "…" : "↻ Actualiser"}</button>
        </div>
        {info && <p className="rounded-xl bg-slate-50 p-2 text-sm text-slate-700">{info}</p>}

        {liste.map((p) => {
          const st = STATUTS.find((s) => s[0] === p.statut) || STATUTS[0];
          const google = `https://www.google.com/search?q=${encodeURIComponent(`${p.nom} ${p.ville} téléphone`)}`;
          return (
            <div key={p.siret} className="card space-y-1.5 !p-3">
              <button className="block w-full text-left" onClick={() => setOuvert(ouvert === p.siret ? null : p.siret)}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold leading-tight">{p.nom}</p>
                  <span className={`chip shrink-0 ${st[2]}`}>{st[1]}</span>
                </div>
                <p className="text-xs text-slate-500">{p.metier} · {p.ville} ({p.cp}){p.creation && ` · créée le ${dateFr(p.creation)}`}{p.rge && " · 🌿 RGE"}</p>
                {p.email && (
                  <p className="text-[11px] text-slate-500">
                    {p.desinscrit ? "🚫 Désinscrit des e-mails" : p.email_erreur ? `⚠️ E-mail en erreur : ${p.email_erreur}` : p.email_etape === 0 ? "✉️ E-mail pas encore envoyé"
                      : `✉️ ${p.email_etape === 1 ? "1er e-mail" : "Relance"} envoyé le ${dateFr(p.email_dernier)}`}{p.email_clic && ` · 👆 a cliqué le ${dateFr(p.email_clic)}`}
                  </p>
                )}
              </button>
              <div className="flex flex-wrap gap-2 text-sm">
                {p.telephone && <a className="chip bg-green-100 text-green-800" href={`tel:${p.telephone.replace(/\s/g, "")}`}>📞 {p.telephone}</a>}
                {p.email && <a className="chip bg-blue-100 text-blue-800" href={`mailto:${p.email}?subject=${encodeURIComponent("Des chantiers près de chez vous avec Rénolien")}`}>✉️ E-mail</a>}
                {!p.telephone && <a className="chip bg-slate-100 text-slate-700" href={google} target="_blank" rel="noreferrer">🔎 Trouver le téléphone</a>}
              </div>
              {ouvert === p.siret && (
                <div className="space-y-2 border-t border-slate-100 pt-2 text-sm">
                  {p.dirigeant && <p>👤 {p.dirigeant}</p>}
                  <p className="text-slate-600">{p.adresse}, {p.cp} {p.ville}{p.forme ? ` · ${p.forme}` : ""}{p.effectif ? ` · ${p.effectif}` : ""}</p>
                  {p.domaines_rge && <p className="text-xs text-slate-500">RGE : {p.domaines_rge}</p>}
                  <p className="text-xs text-slate-500">SIRET {p.siret} · <a className="text-brand" href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${p.siren}`} target="_blank" rel="noreferrer">Fiche officielle ↗</a></p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUTS.map(([k, l, c]) => (
                      <button key={k} className={`chip ${p.statut === k ? c + " ring-2 ring-offset-1 ring-slate-300" : "bg-white text-slate-500 border border-slate-200"}`} onClick={() => maj(p.siret, { statut: k })}>{l}</button>
                    ))}
                  </div>
                  <textarea className="input text-sm" rows={2} placeholder="Note (rappeler lundi, a déjà un logiciel…)" defaultValue={p.note || ""}
                    onBlur={(e) => e.target.value !== (p.note || "") && maj(p.siret, { note: e.target.value })} />
                </div>
              )}
            </div>
          );
        })}
        {!liste.length && <p className="py-8 text-center text-sm text-slate-500">Aucune entreprise pour ces filtres.</p>}
        {total > PAR_PAGE && (
          <div className="flex items-center justify-between">
            <button className="btn-ghost !py-2 text-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>← Précédent</button>
            <span className="text-xs text-slate-500">Page {page + 1} / {Math.ceil(total / PAR_PAGE)}</span>
            <button className="btn-ghost !py-2 text-sm" disabled={(page + 1) * PAR_PAGE >= total} onClick={() => setPage(page + 1)}>Suivant →</button>
          </div>
        )}
      </main>
    </div>
  );
}
