"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { eur, VAT_RATES } from "@/lib/calc";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import type { CatalogItem } from "@/lib/types";
import { useCompany } from "@/components/CompanyContext";
import { TRADE, TRADES, tradeLabel } from "@/lib/trades";

export default function Catalogue() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [edit, setEdit] = useState<Partial<CatalogItem> | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [msg, setMsg] = useState("");
  const [trade, setTrade] = useState("all");
  const [addTrade, setAddTrade] = useState(false);
  const { company } = useCompany();
  const load = () => sb().from("catalog_items").select("*").order("category").order("label").then(({ data }) => setItems(data || []));
  useEffect(() => {
    load();
    const m = new URLSearchParams(location.search).get("metier");
    if (m) setTrade(m);
  }, []);

  async function save() {
    if (!edit?.label) return;
    const { id, ...rest } = edit as CatalogItem;
    const row = { ...rest, unit_price: Number(String(rest.unit_price).replace(",", ".")) || 0, cost_price: Number(String(rest.cost_price ?? 0).replace(",", ".")) || 0 };
    id ? await sb().from("catalog_items").update(row).eq("id", id) : await sb().from("catalog_items").insert(row);
    setEdit(null); load();
  }
  async function del() { if (edit?.id && confirm("Supprimer ?")) { await sb().from("catalog_items").delete().eq("id", edit.id); setEdit(null); load(); } }
  async function starter(trades?: string[]) {
    const { data, error } = await sb().rpc("complete_my_catalog", trades ? { p_trades: trades } : {});
    setMsg(error ? `⚠️ ${error.message}` : `✅ ${data || 0} article(s) ajouté(s)`); setTimeout(() => setMsg(""), 4000);
    setAddTrade(false); load();
  }

  const trades = Array.from(new Set(items.map((i) => i.trade).filter(Boolean))) as string[];
  const inTrade = items.filter((i) => trade === "all" || i.trade === trade);
  const cats = Array.from(new Set(inTrade.map((i) => i.category)));
  const shown = inTrade.filter((i) => (cat === "all" || i.category === cat) && (!q || `${i.label} ${i.category}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <Header back title="Catalogue" right={<button className="btn-brand !px-3 !py-1.5 text-sm" onClick={() => setEdit({ category: "Prestation", unit: "u", vat_rate: 10, unit_price: 0, trade: trade !== "all" ? trade : company?.trades?.[0] || null })}>＋ Article</button>} />
      <div className="space-y-3 p-4">
        {items.length === 0 && (
          <div className="card text-center">
            <p className="mb-3 text-sm text-slate-600">{company?.trades?.length ? `Démarrez avec le catalogue type de vos métiers : ${tradeLabel(company.trades)} (prix modifiables).` : "Choisissez vos métiers pour charger un catalogue type (prix modifiables)."}</p>
            {company?.trades?.length ? <button className="btn-primary w-full" onClick={() => starter()}>Charger le catalogue type</button>
              : <button className="btn-primary w-full" onClick={() => setAddTrade(true)}>Choisir un métier</button>}
          </div>
        )}
        {msg && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{msg}</p>}
        {items.length > 0 && <input className="input" placeholder={`Rechercher parmi ${items.length} articles…`} value={q} onChange={(e) => setQ(e.target.value)} />}
        {(trades.length > 1 || trade !== "all") && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {["all", ...trades].map((t) => (
              <button key={t} onClick={() => { setTrade(t); setCat("all"); }} className={`chip whitespace-nowrap border py-1.5 ${trade === t ? "border-flame bg-flame text-white" : "border-slate-200 bg-white"}`}>{t === "all" ? "Tous métiers" : t === "commun" ? "🧾 Commun" : `${TRADE[t]?.emoji || ""} ${TRADE[t]?.label || t}`}</button>
            ))}
          </div>
        )}
        {items.length > 0 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {["all", ...cats].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`chip whitespace-nowrap border py-1.5 ${cat === c ? "border-ink bg-ink text-white" : "border-slate-200 bg-white"}`}>{c === "all" ? "Tout" : c}</button>
            ))}
          </div>
        )}
        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost text-sm" onClick={() => starter()}>📚 Compléter mon catalogue</button>
            <button className="btn-ghost text-sm" onClick={() => setAddTrade(true)}>＋ Articles d'un autre métier</button>
          </div>
        )}
        {cats.map((c) => {
          const rows = shown.filter((i) => i.category === c);
          if (!rows.length) return null;
          return (
            <div key={c}>
              <h2 className="label mt-2">{c}</h2>
              <div className="space-y-2">
                {rows.map((i) => (
                  <button key={i.id} className="card flex w-full justify-between gap-3 text-left" onClick={() => setEdit(i)}>
                    <span className="font-medium">{i.label}</span>
                    <span className="whitespace-nowrap text-sm">{eur(i.unit_price)}<span className="text-slate-400"> /{i.unit}</span></span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {addTrade && (
        <Modal title="Ajouter les articles d'un métier" onClose={() => setAddTrade(false)}>
          <p className="mb-3 text-sm text-slate-600">Les articles déjà présents ne sont pas modifiés.</p>
          <div className="space-y-2">
            {TRADES.map((t) => (
              <button key={t.id} className="card flex w-full items-center gap-3 text-left" onClick={() => starter([t.id])}>
                <span className="text-xl">{t.emoji}</span><span className="font-semibold">{t.label}</span>
                {company?.trades?.includes(t.id) && <span className="chip ml-auto bg-green-100 text-green-800">Mon métier</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {edit && (
        <Modal title={edit.id ? "Modifier l'article" : "Nouvel article"} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <div><label className="label">Catégorie</label><input className="input" list="cats" value={edit.category || ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
              <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></div>
            <div><label className="label">Métier</label>
              <select className="input" value={edit.trade || ""} onChange={(e) => setEdit({ ...edit, trade: e.target.value || null })}>
                <option value="">—</option><option value="commun">Commun</option>
                {TRADES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select></div>
            <div><label className="label">Désignation</label><input className="input" value={edit.label || ""} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></div>
            <div><label className="label">Description</label><textarea className="input" rows={2} value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="label">Prix HT</label><input className="input" inputMode="decimal" value={edit.unit_price ?? ""} onChange={(e) => setEdit({ ...edit, unit_price: e.target.value as any })} /></div>
              <div><label className="label">Unité</label><input className="input" value={edit.unit || ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></div>
              <div><label className="label">TVA</label><select className="input" value={edit.vat_rate} onChange={(e) => setEdit({ ...edit, vat_rate: Number(e.target.value) })}>{VAT_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</select></div>
            </div>
            <div><label className="label">Prix d'achat HT (pour la marge, non affiché au client)</label><input className="input" inputMode="decimal" value={edit.cost_price ?? ""} onChange={(e) => setEdit({ ...edit, cost_price: e.target.value as any })} /></div>
            <button className="btn-primary w-full" onClick={save}>Enregistrer</button>
            {edit.id && <button className="btn-danger w-full" onClick={del}>Supprimer</button>}
          </div>
        </Modal>
      )}
    </>
  );
}
