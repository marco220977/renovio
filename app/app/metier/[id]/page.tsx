"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { dateFr, eur, STATUS_COLOR, STATUS_LABEL } from "@/lib/calc";
import Header from "@/components/Header";
import { useCompany } from "@/components/CompanyContext";
import { TRADE } from "@/lib/trades";
import type { Doc } from "@/lib/types";

type Row = { id: string; title?: string; number?: string; status: string; client_snapshot?: { name?: string } | null; created_at?: string; start_date?: string; problem?: string };

/** Espace d'un corps de métier : toutes les fonctions de l'appli, rattachées à ce métier */
export default function TradeSpace() {
  const { id } = useParams<{ id: string }>();
  const t = TRADE[id];
  const { isSup } = useCompany();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [chantiers, setChantiers] = useState<Row[]>([]);
  const [sav, setSav] = useState<Row[]>([]);
  const [articles, setArticles] = useState(0);

  useEffect(() => {
    const s = sb();
    if (isSup) s.from("documents").select("*").eq("trade", id).order("created_at", { ascending: false }).then(({ data }) => setDocs(data || []));
    s.from("chantiers").select("id, title, status, client_snapshot, start_date").eq("trade", id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setChantiers(data || []));
    s.from("sav_tickets").select("id, number, status, client_snapshot, problem").eq("trade", id).not("status", "in", "(resolved,closed)").order("created_at", { ascending: false }).limit(5).then(({ data }) => setSav(data || []));
    s.from("catalog_items").select("id", { count: "exact", head: true }).eq("trade", id).then(({ count }) => setArticles(count || 0));
  }, [id, isSup]);

  if (!t) return <><Header back title="Métier" /><p className="p-6 text-center text-slate-500">Métier inconnu.</p></>;

  const q = `metier=${id}`;
  const quotes = (docs || []).filter((d) => d.kind === "quote");
  const invoices = (docs || []).filter((d) => d.kind !== "quote");
  const pending = quotes.filter((d) => ["draft", "sent"].includes(d.status));
  const toBill = quotes.filter((d) => d.status === "signed");
  const year = new Date().getFullYear().toString();
  const billedYear = invoices.filter((d) => d.status !== "draft" && d.status !== "canceled" && (d.issue_date || "").startsWith(year)).reduce((s, d) => s + Number(d.total_ht || 0), 0);
  const unpaid = invoices.filter((d) => d.status === "issued");

  const actions: [string, string, string, boolean?][] = [
    ...(isSup ? [[`/app/doc/nouveau?kind=quote&${q}`, "📝", "Nouveau devis", true], [`/app/doc/nouveau?kind=invoice&${q}`, "💶", "Nouvelle facture"]] as [string, string, string, boolean?][] : []),
    [`/app/chantiers/nouveau?${q}`, "🏗️", "Nouveau chantier"],
    [`/app/planning?${q}`, "🗓", "Planifier une intervention"],
    [`/app/sav/nouveau?${q}`, "🛠", "Nouveau SAV"],
    [`/app/quitus/nouveau?${q}`, "✅", "Quitus / PV de réception"],
    ...(t.maintenance ? [["/app/entretien", "🔧", "Contrats et entretiens"]] as [string, string, string][] : []),
    ...(t.scan ? [["/app/scan", "📷", "Scanner une plaque"]] as [string, string, string][] : []),
    [`/app/catalogue?${q}`, "📚", `Catalogue (${articles})`],
    ["/app/clients", "📇", "Clients"],
  ];

  const Stat = ({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) => (
    <Link href={href || "#"} className="card !p-3"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="text-xl font-extrabold">{value}</p>{sub && <p className="text-xs text-slate-500">{sub}</p>}</Link>
  );

  return (
    <>
      <Header back title={`${t.emoji} ${t.label}`} />
      <div className="space-y-5 p-4">
        {isSup && (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Devis en attente" value={String(pending.length)} sub={eur(pending.reduce((s, d) => s + Number(d.total_ttc || 0), 0))} href={`/app/devis?${q}`} />
            <Stat label="Signés à facturer" value={String(toBill.length)} sub={eur(toBill.reduce((s, d) => s + Number(d.total_ttc || 0), 0))} href={`/app/devis?${q}`} />
            <Stat label={`Facturé ${year} (HT)`} value={eur(billedYear)} href={`/app/factures?${q}`} />
            <Stat label="À encaisser" value={eur(unpaid.reduce((s, d) => s + Number(d.total_ttc || 0), 0))} sub={`${unpaid.length} facture(s)`} href={`/app/factures?${q}`} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {actions.map(([href, icon, label, main]) => (
            <Link key={label} href={href} className={`card flex flex-col items-start gap-1 !p-3 active:scale-[0.98] ${main ? "!border-flame !bg-flame text-white" : ""}`}>
              <span className="text-2xl">{icon}</span><span className="text-sm font-bold leading-tight">{label}</span>
            </Link>
          ))}
        </div>

        {isSup && (
          <section>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-bold">Devis</h2><Link href={`/app/devis?${q}`} className="text-sm text-brand">Tout voir →</Link></div>
            {docs === null ? <p className="text-sm text-slate-400">Chargement…</p> : quotes.length === 0 ? <p className="text-sm text-slate-500">Aucun devis pour ce métier.</p> : (
              <div className="space-y-2">{quotes.slice(0, 5).map((d) => (
                <Link key={d.id} href={`/app/doc/${d.id}`} className="card flex items-center justify-between gap-3 !p-3">
                  <div className="min-w-0"><p className="truncate font-semibold">{d.client_snapshot?.name || "Sans client"}</p><p className="truncate text-xs text-slate-500">{d.number || "Brouillon"} · {d.title || "—"}</p></div>
                  <div className="text-right"><p className="font-bold">{eur(d.total_ttc)}</p><span className={`chip ${STATUS_COLOR[d.status]}`}>{STATUS_LABEL[d.status]}</span></div>
                </Link>))}</div>
            )}
          </section>
        )}

        {isSup && invoices.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-bold">Factures</h2><Link href={`/app/factures?${q}`} className="text-sm text-brand">Tout voir →</Link></div>
            <div className="space-y-2">{invoices.slice(0, 5).map((d) => (
              <Link key={d.id} href={`/app/doc/${d.id}`} className="card flex items-center justify-between gap-3 !p-3">
                <div className="min-w-0"><p className="truncate font-semibold">{d.client_snapshot?.name || "Sans client"}</p><p className="truncate text-xs text-slate-500">{d.kind === "credit" ? "Avoir " : ""}{d.number || "Brouillon"} · {dateFr(d.issue_date)}</p></div>
                <div className="text-right"><p className="font-bold">{eur(d.total_ttc)}</p><span className={`chip ${STATUS_COLOR[d.status]}`}>{STATUS_LABEL[d.status]}</span></div>
              </Link>))}</div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-lg font-bold">Chantiers</h2>
          {chantiers.length === 0 ? <p className="text-sm text-slate-500">Aucun chantier pour ce métier.</p> : (
            <div className="space-y-2">{chantiers.map((c) => (
              <Link key={c.id} href={`/app/chantiers/${c.id}`} className="card !p-3"><p className="font-semibold">{c.title}</p><p className="text-xs text-slate-500">{c.client_snapshot?.name || ""}{c.start_date ? ` · début ${dateFr(c.start_date)}` : ""}</p></Link>))}</div>
          )}
        </section>

        {sav.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-bold">SAV en cours</h2>
            <div className="space-y-2">{sav.map((x) => (
              <Link key={x.id} href={`/app/sav/${x.id}`} className="card !p-3"><p className="font-semibold">{x.client_snapshot?.name || "Client"} · {x.number}</p><p className="truncate text-xs text-slate-500">{x.problem || ""}</p></Link>))}</div>
          </section>
        )}
      </div>
    </>
  );
}
