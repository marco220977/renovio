"use client";
// Prospection : entreprises du bâtiment de moins de 2 ans en Île-de-France (registre Sirene + contacts RGE), réservé à l'admin.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

type P = {
  siret: string; siren: string; nom: string; dirigeant: string | null; metier: string; adresse: string; cp: string; ville: string; dep: string;
  creation: string; effectif: string | null; forme: string; rge: boolean; telephone: string | null; email: string | null; statut: string; note: string | null;
};
const STATUTS: [string, string, string][] = [
  ["a_contacter", "À contacter", "bg-slate-100 text-slate-700"], ["contacte", "Contacté", "bg-blue-100 text-blue-800"],
  ["interesse", "Intéressé", "bg-amber-100 text-amber-900"], ["inscrit", "Inscrit ✔", "bg-green-100 text-green-800"],
  ["pas_interesse", "Pas intéressé", "bg-red-100 text-red-800"],
];
const DEPS = ["75", "77", "91", "92", "93", "94", "95"];
const PAR_PAGE = 30;
const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR");

export default function Prospects() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [liste, setListe] = useState<P[]>([]);
  const [total, setTotal] = useState(0);
  const [metiers, setMetiers] = useState<string[]>([]);
  const [f, setF] = useState({ dep: "", metier: "", statut: "", contact: false, q: "" });
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
    const q = f.q.trim().replace(/[,()]/g, " ");
    if (q) r = r.or(`nom.ilike.%${q}%,ville.ilike.%${q}%,dirigeant.ilike.%${q}%,cp.ilike.${q}%`);
    return r;
  }, [f]);

  const charger = useCallback(async () => {
    const { data, count } = await requete("*", true).order("creation", { ascending: false }).range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
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
        <p className="text-xs text-slate-500">Entreprises du bâtiment créées il y a moins de 2 ans en Île-de-France (registre officiel Sirene), avec téléphone et e-mail quand ils sont publiés au registre RGE. Mise à jour automatique chaque lundi.</p>
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
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.contact} onChange={(e) => set({ contact: e.target.checked })} /> Seulement avec téléphone ou e-mail</label>
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
                <p className="text-xs text-slate-500">{p.metier} · {p.ville} ({p.cp}) · créée le {dateFr(p.creation)}{p.rge && " · 🌿 RGE"}</p>
              </button>
              <div className="flex flex-wrap gap-2 text-sm">
                {p.telephone && <a className="chip bg-green-100 text-green-800" href={`tel:${p.telephone.replace(/\s/g, "")}`}>📞 {p.telephone}</a>}
                {p.email && <a className="chip bg-blue-100 text-blue-800" href={`mailto:${p.email}?subject=${encodeURIComponent("Des chantiers près de chez vous avec Rénolien")}`}>✉️ E-mail</a>}
                {!p.telephone && <a className="chip bg-slate-100 text-slate-700" href={google} target="_blank" rel="noreferrer">🔎 Trouver le téléphone</a>}
              </div>
              {ouvert === p.siret && (
                <div className="space-y-2 border-t border-slate-100 pt-2 text-sm">
                  {p.dirigeant && <p>👤 {p.dirigeant}</p>}
                  <p className="text-slate-600">{p.adresse}, {p.cp} {p.ville} · {p.forme}{p.effectif ? ` · ${p.effectif}` : ""}</p>
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
