"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { eur, VAT_RATES } from "@/lib/calc";
import Header from "@/components/Header";
import { useCompany } from "@/components/CompanyContext";
import { TRADES, tradesOf } from "@/lib/trades";
import { FIELD_LABEL, findHeader, guessMapping, prices, SUPPLIERS, toItems, type Field, type Mapping, type Raw } from "@/lib/supplier-import";

const MAX_SHOW = 150;

async function readAsDataUrl(f: File) {
  return new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(f); });
}

/** Réduit une photo pour l'envoi (2000 px max) */
async function shrinkImage(f: File) {
  const url = await readAsDataUrl(f);
  const img = new Image(); img.src = url; await img.decode();
  const k = Math.min(1, 2000 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export default function ImportSupplier() {
  const router = useRouter();
  const { company } = useCompany();
  const [supplier, setSupplier] = useState("");
  const [trade, setTrade] = useState<string>("");
  const [vat, setVat] = useState(10);
  const [remise, setRemise] = useState("0");
  const [coef, setCoef] = useState("1.30");
  const [update, setUpdate] = useState(true);
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<unknown[][] | null>(null); // lignes Excel/CSV sans l'en-tête
  const [header, setHeader] = useState<string[]>([]);
  const [map, setMap] = useState<Mapping>({});
  const [aiItems, setAiItems] = useState<Raw[] | null>(null);
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ inserted: number; updated: number } | null>(null);

  const myTrades = tradesOf(company?.trades);
  const items: Raw[] = useMemo(() => aiItems || (table ? toItems(table, map) : []), [aiItems, table, map]);
  const r = Number(remise.replace(",", ".")) || 0;
  const k = Number(coef.replace(",", ".")) || 1;
  const selected = items.filter((_, i) => !unchecked.has(i));
  const filtered = items.map((it, i) => [it, i] as const).filter(([it]) => !q || `${it.ref} ${it.label} ${it.category}`.toLowerCase().includes(q.toLowerCase()));

  async function onFile(f: File) {
    setErr(""); setDone(null); setTable(null); setAiItems(null); setUnchecked(new Set()); setFileName(f.name);
    if (!supplier) { const s = SUPPLIERS.find((x) => f.name.toLowerCase().includes(x.toLowerCase().split(" ")[0])); if (s) setSupplier(s); }
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    try {
      if (["xlsx", "xls", "xlsm", "ods", "csv", "txt"].includes(ext)) {
        setBusy("Lecture du fichier…");
        const XLSX = await import("xlsx");
        const buf = await f.arrayBuffer();
        let wb;
        if (ext === "csv" || ext === "txt") {
          const txt = new TextDecoder(/�/.test(new TextDecoder("utf-8").decode(buf)) ? "windows-1252" : "utf-8").decode(buf);
          const first = txt.split(/\r?\n/)[0] || "";
          const FS = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : (first.includes("\t") ? "\t" : ",");
          wb = XLSX.read(txt, { type: "string", FS, raw: true } as any);
        } else wb = XLSX.read(buf, { type: "array" });
        // la feuille la plus remplie
        const sheets = wb.SheetNames.map((n) => XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, defval: "", raw: true }));
        const rows = sheets.sort((a, b) => b.length - a.length)[0] || [];
        const h = findHeader(rows);
        const body = rows.slice(h + 1).filter((x) => x.some((c) => String(c).trim()));
        setHeader(h >= 0 ? rows[h].map((c) => String(c)) : (rows[0] || []).map((_, i) => `Colonne ${String.fromCharCode(65 + i)}`));
        setMap(guessMapping(h >= 0 ? rows[h] : [], body.slice(0, 30)));
        setTable(body);
      } else if (ext === "pdf" || f.type.startsWith("image/")) {
        if (f.size > 20 * 1024 * 1024) throw new Error("Fichier trop lourd (20 Mo maximum). Envoyez quelques pages, ou le fichier Excel du fournisseur.");
        setBusy("Lecture du document par l'IA… (jusqu'à 1 à 2 minutes)");
        const file = ext === "pdf" ? await readAsDataUrl(f) : await shrinkImage(f);
        const { data, error } = await sb().functions.invoke("lire-catalogue", { body: { file } });
        if (error) { let m = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) m = j.error; } catch {} throw new Error(m); }
        if (data?.error) throw new Error(data.error);
        setAiItems(data.items || []);
        if (data.truncated) setErr("Document long : seule une partie des articles a été lue. Importez-les, puis envoyez la suite (pages suivantes).");
        if (!data.items?.length) throw new Error("Aucun article avec un prix n'a été trouvé dans ce document.");
      } else throw new Error("Format non reconnu. Utilisez un fichier Excel (.xlsx, .xls), CSV, PDF ou une photo.");
    } catch (e: any) { setErr(e.message || String(e)); }
    setBusy("");
  }

  async function doImport() {
    if (!supplier.trim()) return setErr("Indiquez le nom du fournisseur.");
    if (!selected.length) return setErr("Aucun article sélectionné.");
    setErr(""); setDone(null);
    const rows = selected.map((it) => {
      const p = prices(it.price, r, k);
      return { ref: it.ref, label: it.label, unit: it.unit, category: it.category || supplier.trim(), trade: trade || null, vat_rate: vat, cost_price: p.cost, unit_price: p.sale };
    });
    let ins = 0, upd = 0;
    for (let i = 0; i < rows.length; i += 400) {
      setBusy(`Import… ${Math.min(i + 400, rows.length)} / ${rows.length}`);
      const { data, error } = await sb().rpc("import_supplier_items", { p_supplier: supplier.trim(), p_items: rows.slice(i, i + 400), p_update: update });
      if (error) { setBusy(""); return setErr(error.message); }
      ins += data.inserted; upd += data.updated;
    }
    setBusy(""); setDone({ inserted: ins, updated: upd });
  }

  return (
    <>
      <Header back title="Importer un catalogue fournisseur" />
      <div className="space-y-4 p-4">
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        {done && (
          <div className="card space-y-3 border-green-200 bg-green-50">
            <p className="font-semibold text-green-800">✅ {done.inserted} article(s) ajouté(s){done.updated ? `, ${done.updated} prix mis à jour` : ""}.</p>
            <button className="btn-primary w-full" onClick={() => router.push("/app/catalogue")}>Voir mon catalogue</button>
          </div>
        )}

        <section className="card space-y-3">
          <h2 className="font-bold">1. Fournisseur</h2>
          <div><label className="label">Nom du fournisseur</label>
            <input className="input" list="suppliers" placeholder="Ex : Cedeo, Point P, Rexel…" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            <datalist id="suppliers">{SUPPLIERS.map((s) => <option key={s} value={s} />)}</datalist></div>
          <div><label className="label">Métier des articles</label>
            <select className="input" value={trade} onChange={(e) => setTrade(e.target.value)}>
              <option value="">— Aucun en particulier —</option>
              {(myTrades.length ? myTrades : TRADES).map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
            </select></div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-bold">2. Fichier du tarif</h2>
          <p className="text-sm text-slate-600">Le mieux : le <b>fichier Excel ou CSV</b> envoyé par le fournisseur (demandez-le à votre agence ou téléchargez-le sur votre espace pro). Un <b>PDF</b> ou une <b>photo</b> de tarif marche aussi : l'IA lit les articles (quelques pages à la fois).</p>
          <label className="btn-primary flex w-full cursor-pointer items-center justify-center">
            📥 Choisir le fichier
            <input type="file" className="hidden" accept=".xlsx,.xls,.xlsm,.ods,.csv,.txt,.pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          </label>
          {fileName && <p className="text-sm text-slate-500">📄 {fileName}</p>}
          {busy && <p className="animate-pulse text-sm font-semibold text-brand">{busy}</p>}
        </section>

        {table && (
          <section className="card space-y-3">
            <h2 className="font-bold">3. Colonnes du fichier</h2>
            <p className="text-sm text-slate-600">Vérifiez la correspondance. Si le fichier a un prix public et un prix net, choisissez le <b>prix net</b>.</p>
            {(Object.keys(FIELD_LABEL) as Field[]).map((f) => (
              <div key={f} className="grid grid-cols-[110px_1fr] items-center gap-2">
                <span className="text-sm font-semibold">{FIELD_LABEL[f]}{["label", "price"].includes(f) ? " *" : ""}</span>
                <select className="input !py-2 text-sm" value={map[f] ?? ""} onChange={(e) => setMap({ ...map, [f]: e.target.value === "" ? undefined : Number(e.target.value) })}>
                  <option value="">— Aucune —</option>
                  {header.map((h, i) => <option key={i} value={i}>{h || `Colonne ${String.fromCharCode(65 + i)}`}{table[0]?.[i] !== undefined ? ` (ex : ${String(table[0][i]).slice(0, 25)})` : ""}</option>)}
                </select>
              </div>
            ))}
          </section>
        )}

        {items.length > 0 && (
          <>
            <section className="card space-y-3">
              <h2 className="font-bold">{table ? "4" : "3"}. Vos prix</h2>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="label">Remise fourn. %</label><input className="input" inputMode="decimal" value={remise} onChange={(e) => setRemise(e.target.value)} /></div>
                <div><label className="label">Coefficient</label><input className="input" inputMode="decimal" value={coef} onChange={(e) => setCoef(e.target.value)} /></div>
                <div><label className="label">TVA</label>
                  <select className="input" value={vat} onChange={(e) => setVat(Number(e.target.value))}>{VAT_RATES.map((v) => <option key={v} value={v}>{String(v).replace(".", ",")} %</option>)}</select></div>
              </div>
              <p className="text-xs text-slate-500">Prix d'achat = prix du fichier − remise. Prix de vente = prix d'achat × coefficient (1,30 = 30 % de marge sur l'achat). Laissez la remise à 0 si le fichier donne déjà votre prix net.</p>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={update} onChange={(e) => setUpdate(e.target.checked)} /> Mettre à jour les prix des articles déjà importés (même référence)</label>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{selected.length} / {items.length} article(s)</h2>
                <div className="flex gap-3 text-sm">
                  <button className="text-brand" onClick={() => setUnchecked(new Set())}>Tout</button>
                  <button className="text-brand" onClick={() => setUnchecked(new Set(items.map((_, i) => i)))}>Aucun</button>
                </div>
              </div>
              <input className="input" placeholder="Filtrer (référence, désignation)…" value={q} onChange={(e) => setQ(e.target.value)} />
              {q && (
                <div className="flex gap-3 text-sm">
                  <button className="text-brand" onClick={() => { const s = new Set(unchecked); filtered.forEach(([, i]) => s.delete(i)); setUnchecked(s); }}>Cocher ces {filtered.length}</button>
                  <button className="text-brand" onClick={() => { const s = new Set(unchecked); filtered.forEach(([, i]) => s.add(i)); setUnchecked(s); }}>Décocher ces {filtered.length}</button>
                </div>
              )}
              {filtered.slice(0, MAX_SHOW).map(([it, i]) => {
                const p = prices(it.price, r, k);
                const on = !unchecked.has(i);
                return (
                  <label key={i} className={`card flex items-start gap-3 !p-3 ${on ? "" : "opacity-50"}`}>
                    <input type="checkbox" className="mt-1" checked={on} onChange={() => { const s = new Set(unchecked); on ? s.add(i) : s.delete(i); setUnchecked(s); }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-tight">{it.label}</span>
                      <span className="block text-xs text-slate-500">{[it.ref && `Réf. ${it.ref}`, it.category, it.unit].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="whitespace-nowrap text-right text-xs">
                      <span className="block text-slate-500">achat {eur(p.cost)}</span>
                      <span className="block text-sm font-bold">{eur(p.sale)}</span>
                    </span>
                  </label>
                );
              })}
              {filtered.length > MAX_SHOW && <p className="text-center text-xs text-slate-500">… et {filtered.length - MAX_SHOW} autres (utilisez le filtre pour les voir)</p>}
            </section>
            <div className="sticky bottom-24 z-20">
              <button className="btn-primary w-full shadow-lg" disabled={!!busy} onClick={doImport}>
                {busy || `📥 Importer ${selected.length} article(s)`}
              </button>
            </div>
          </>
        )}
      </div>

    </>
  );
}
