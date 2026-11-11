"use client";
// Tableau de bord administrateur : chiffres clés, artisans (vérifier / suspendre), clients, demandes.
import { useEffect, useMemo, useState } from "react";
import AnalyseDecennale from "@/components/AnalyseDecennale";
import { joursDecennale, finDecennale } from "@/lib/decennale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { dateFr, eur } from "@/lib/calc";
import { TRADE } from "@/lib/trades";
import Modal from "@/components/Modal";
import OffrirEssai from "@/components/OffrirEssai";
import { Etoiles, Metiers } from "@/components/Vues";
import { FORMULES, STATUT_DEMANDE, STATUT_OFFRE, errMsg, statutDemande, type Artisan, type Demande, type Offre, type Profil } from "@/lib/mer";

type P = Profil & { created_at: string };
type Note = { artisan_id: string; note: number; nb_avis: number };
type Onglet = "artisans" | "clients" | "demandes";

export default function Admin() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const [profils, setProfils] = useState<P[]>([]);
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [onglet, setOnglet] = useState<Onglet>("artisans");
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [fiche, setFiche] = useState<{ type: Onglet; id: string } | null>(null);
  const [err, setErr] = useState("");
  const [essai, setEssai] = useState(false);

  async function charger() {
    const s = sb();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return router.replace("/connexion");
    const { data: moi } = await s.from("profils").select("role").eq("id", user.id).maybeSingle();
    if (moi?.role !== "admin") { setOk(false); return; }
    setOk(true);
    const [p, a, d, o, n] = await Promise.all([
      s.from("profils").select("*").order("created_at", { ascending: false }),
      s.from("artisans").select("*").order("created_at", { ascending: false }),
      s.from("demandes").select("*").order("created_at", { ascending: false }),
      s.from("offres").select("*").order("created_at", { ascending: false }),
      s.from("artisans_notes").select("*"),
    ]);
    setProfils((p.data as P[]) || []); setArtisans((a.data as Artisan[]) || []); setDemandes((d.data as Demande[]) || []);
    setOffres((o.data as Offre[]) || []); setNotes(Object.fromEntries(((n.data as Note[]) || []).map((x) => [x.artisan_id, x])));
  }
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const profil = useMemo(() => Object.fromEntries(profils.map((x) => [x.id, x])), [profils]);
  const clients = profils.filter((x) => x.role === "client");
  const signees = offres.filter((o) => o.statut === "acceptee");
  const ilYa7j = Date.now() - 7 * 864e5;

  const stats: [string, string | number, string?][] = [
    ["Clients", clients.length, `+${clients.filter((c) => new Date(c.created_at).getTime() > ilYa7j).length} en 7 j`],
    ["Artisans", artisans.length, `${artisans.filter((a) => a.verifie).length} vérifiés`],
    ["Demandes", demandes.filter((d) => d.statut !== "brouillon").length, `${demandes.filter((d) => statutDemande(d) === "ouverte").length} ouvertes`],
    ["Offres", offres.length, `${(offres.length / Math.max(1, demandes.filter((d) => d.statut !== "brouillon").length)).toFixed(1)} par demande`],
    ["Devis signés", signees.length, `${Math.round((signees.length / Math.max(1, demandes.filter((d) => d.statut !== "brouillon").length)) * 100)} % des demandes`],
    ["Montant signé", eur(signees.reduce((s, o) => s + Number(o.total_ttc), 0)).replace(/,\d\d/, ""), "TTC"],
  ];

  async function majArtisan(id: string, p: Partial<Artisan>) {
    setErr("");
    const { error } = await sb().from("artisans").update(p).eq("id", id);
    if (error) return setErr(errMsg(error));
    setArtisans(artisans.map((a) => (a.id === id ? { ...a, ...p } : a)));
  }

  const txt = (s?: string | null) => (s || "").toLowerCase();
  const cherche = (...v: (string | undefined | null)[]) => !q || v.some((x) => txt(x).includes(q.toLowerCase()));

  const listeArtisans = artisans.filter((a) =>
    (filtre === "tous" || (filtre === "a_verifier" && !a.verifie && a.statut === "actif") || (filtre === "verifies" && a.verifie) || (filtre === "suspendus" && a.statut === "suspendu"))
    && cherche(a.raison_sociale, a.siret, a.ville, a.email, profil[a.id]?.nom, a.departements?.join(" ")));
  const listeClients = clients.filter((c) => cherche(c.nom, c.email, c.telephone));
  const listeDemandes = demandes.filter((d) => (filtre === "tous" || statutDemande(d) === filtre) && cherche(d.titre, d.ville, d.cp, profil[d.client_id]?.nom));

  if (ok === null) return <div className="flex min-h-screen items-center justify-center text-slate-400">Chargement…</div>;
  if (!ok) return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="card max-w-sm space-y-3 text-center">
        <p className="font-bold">Accès réservé à l'administrateur</p>
        <Link href="/" className="btn-ghost w-full">Retour</Link>
      </div>
    </div>
  );

  const filtres: Record<Onglet, [string, string][]> = {
    artisans: [["tous", "Tous"], ["a_verifier", "À vérifier"], ["verifies", "Vérifiés"], ["suspendus", "Suspendus"]],
    clients: [],
    demandes: [["tous", "Toutes"], ["ouverte", "Ouvertes"], ["fermee", "À comparer"], ["attribuee", "Attribuées"], ["brouillon", "Brouillons"], ["annulee", "Annulées"]],
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-xl font-extrabold">Réno<span className="text-flame">lien</span> <span className="text-sm font-semibold text-slate-400">admin</span></span>
          <div className="flex gap-2 text-xs">
            <Link href="/client" className="chip bg-slate-100 text-slate-600">Client</Link>
            <Link href="/artisan" className="chip bg-slate-100 text-slate-600">Artisan</Link>
            <button onClick={charger} className="chip bg-slate-100 text-slate-600">↻</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {stats.map(([l, v, sub]) => (
            <div key={l} className="card !p-3">
              <p className="text-xs font-semibold uppercase text-slate-400">{l}</p>
              <p className="text-2xl font-extrabold">{v}</p>
              {sub && <p className="text-xs text-slate-500">{sub}</p>}
            </div>
          ))}
        </div>

        <button className="btn-brand w-full py-3" onClick={() => setEssai(true)}>🎁 Offrir un essai aux artisans</button>

        <div className="flex rounded-xl bg-slate-100 p-1">
          {(["artisans", "clients", "demandes"] as Onglet[]).map((o) => (
            <button key={o} onClick={() => { setOnglet(o); setFiltre("tous"); setQ(""); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${onglet === o ? "bg-white shadow" : "text-slate-500"}`}>
              {o} ({o === "artisans" ? artisans.length : o === "clients" ? clients.length : demandes.length})
            </button>
          ))}
        </div>
        <input className="input" placeholder="Rechercher (nom, ville, SIRET, e-mail…)" value={q} onChange={(e) => setQ(e.target.value)} />
        {filtres[onglet].length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filtres[onglet].map(([k, l]) => (
              <button key={k} onClick={() => setFiltre(k)} className={`chip border py-1.5 ${filtre === k ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700"}`}>{l}</button>
            ))}
          </div>
        )}
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

        {onglet === "artisans" && listeArtisans.map((a) => {
          const mes = offres.filter((o) => o.artisan_id === a.id);
          const jd = joursDecennale(a);
          const manque = [(a.siret || "").length !== 14 && "SIRET", !a.decennale && "décennale", !a.departements?.length && "départements",
            jd !== null && jd < 0 && "décennale expirée", jd !== null && jd >= 0 && jd <= 30 && `décennale expire dans ${jd} j`,
            a.decennale_analyse?.alertes?.length && `${a.decennale_analyse.alertes.length} alerte(s) attestation`].filter(Boolean);
          return (
            <button key={a.id} onClick={() => setFiche({ type: "artisans", id: a.id })} className="card block w-full space-y-1 text-left">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{a.raison_sociale || "(sans nom)"} <span className="font-normal text-slate-500">· {profil[a.id]?.nom}</span></p>
                {a.statut === "suspendu" ? <span className="chip shrink-0 bg-red-100 text-red-700">Suspendu</span>
                  : a.verifie ? <span className="chip shrink-0 bg-green-100 text-green-800">✔ Vérifié</span>
                  : <span className="chip shrink-0 bg-amber-100 text-amber-800">À vérifier</span>}
              </div>
              <p className="text-xs text-slate-500">{a.ville} · dép. {a.departements?.join(", ") || "—"} · {a.metiers?.map((m) => TRADE[m]?.emoji).join(" ")}</p>
              <p className="text-xs text-slate-500">{FORMULES.find((f) => f.id === a.abonnement)?.nom || "Découverte"} · {mes.length} offre(s) · {mes.filter((o) => o.statut === "acceptee").length} gagnée(s) · <Etoiles note={notes[a.id]?.note} nb={notes[a.id]?.nb_avis} /></p>
              {manque.length > 0 && <p className="text-xs text-red-600">À voir : {manque.join(", ")}</p>}
            </button>
          );
        })}

        {onglet === "clients" && listeClients.map((c) => {
          const dem = demandes.filter((d) => d.client_id === c.id);
          return (
            <button key={c.id} onClick={() => setFiche({ type: "clients", id: c.id })} className="card block w-full space-y-1 text-left">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{c.nom || "(sans nom)"}</p>
                <span className="text-xs text-slate-400">inscrit le {dateFr(c.created_at)}</span>
              </div>
              <p className="text-xs text-slate-500">{c.email} {c.telephone && `· ${c.telephone}`}</p>
              <p className="text-xs text-slate-500">{dem.length} demande(s) · {dem.filter((d) => d.statut === "attribuee").length} attribuée(s)</p>
            </button>
          );
        })}

        {onglet === "demandes" && listeDemandes.map((d) => {
          const st = statutDemande(d); const nb = offres.filter((o) => o.demande_id === d.id && o.statut !== "retiree").length;
          return (
            <button key={d.id} onClick={() => setFiche({ type: "demandes", id: d.id })} className="card block w-full space-y-1 text-left">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{d.titre || d.description.slice(0, 60)}</p>
                <span className={`chip shrink-0 ${STATUT_DEMANDE[st][1]}`}>{STATUT_DEMANDE[st][0]}</span>
              </div>
              <p className="text-xs text-slate-500">{d.ville} {d.cp} · {profil[d.client_id]?.nom} · {dateFr(d.created_at)} · {nb} offre(s)</p>
              {d.budget_max ? <p className="text-xs text-slate-500">Estimation : {eur(d.budget_min)} – {eur(d.budget_max)}</p> : null}
            </button>
          );
        })}

        {((onglet === "artisans" && !listeArtisans.length) || (onglet === "clients" && !listeClients.length) || (onglet === "demandes" && !listeDemandes.length)) &&
          <p className="card text-center text-sm text-slate-500">Aucun résultat.</p>}
      </main>

      {essai && <OffrirEssai artisans={artisans} onClose={() => setEssai(false)} onFait={charger} />}

      {fiche?.type === "artisans" && (() => {
        const a = artisans.find((x) => x.id === fiche.id)!; const p = profil[a.id];
        const mes = offres.filter((o) => o.artisan_id === a.id);
        return (
          <Modal title={a.raison_sociale || "Artisan"} onClose={() => setFiche(null)} tall>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="text-slate-500">Contact</span><span>{p?.nom}</span>
                <span className="text-slate-500">E-mail</span><a className="text-brand" href={`mailto:${a.email || p?.email}`}>{a.email || p?.email}</a>
                <span className="text-slate-500">Téléphone</span><a className="text-brand" href={`tel:${a.telephone || p?.telephone}`}>{a.telephone || p?.telephone || "—"}</a>
                <span className="text-slate-500">SIRET</span>
                <span>{a.siret || "—"} {a.siret?.length === 14 && <a className="text-brand underline" target="_blank" rel="noreferrer" href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${a.siret}`}>vérifier ↗</a>}</span>
                <span className="text-slate-500">Forme</span><span>{a.forme || "—"}</span>
                <span className="text-slate-500">Adresse</span><span>{[a.adresse, a.cp, a.ville].filter(Boolean).join(" ") || "—"}</span>
                <span className="text-slate-500">Décennale</span>
                <span className={(joursDecennale(a) ?? 1) < 0 ? "text-red-600" : ""}>{a.decennale || "—"}{finDecennale(a) && ` (fin ${dateFr(finDecennale(a))})`}
                  {a.decennale_doc ? <button className="ml-1 text-brand underline" onClick={async () => { const { data } = await sb().storage.from("attestations").createSignedUrl(a.decennale_doc!, 600); if (data?.signedUrl) window.open(data.signedUrl, "_blank"); }}>attestation ↗</button> : <span className="ml-1 text-xs text-red-600">(pas d'attestation)</span>}</span>
                {a.decennale_analyse && <div className="col-span-2"><AnalyseDecennale an={a.decennale_analyse} admin /></div>}
                <span className="text-slate-500">RGE / TVA</span><span>{a.rge ? "RGE" : "non RGE"} · {a.tva_franchise ? "franchise" : "assujetti"}</span>
                <span className="text-slate-500">Abonnement</span><span>{FORMULES.find((f) => f.id === a.abonnement)?.nom || "Découverte"}{a.abonnement_fin && ` (jusqu'au ${dateFr(a.abonnement_fin)})`}</span>
                <span className="text-slate-500">Départements</span><span>{a.departements?.join(", ") || "—"}</span>
                <span className="text-slate-500">Inscrit le</span><span>{dateFr(a.created_at)}</span>
              </div>
              <Metiers ids={a.metiers} />
              {a.presentation && <p className="rounded-xl bg-slate-50 p-3">{a.presentation}</p>}
              <p className="font-bold">Offres ({mes.length})</p>
              {mes.map((o) => {
                const d = demandes.find((x) => x.id === o.demande_id);
                return <p key={o.id} className="flex justify-between gap-2 border-b border-slate-100 py-1"><span>{d?.titre || "Demande"} <span className={`chip ${STATUT_OFFRE[o.statut][1]}`}>{STATUT_OFFRE[o.statut][0]}</span></span><b>{eur(o.total_ttc)}</b></p>;
              })}
            </div>
            <Offrir a={a} maj={(p) => majArtisan(a.id, p)} />
            <div className="flex shrink-0 gap-2 pt-2">
              {a.statut === "suspendu"
                ? <button className="btn-ghost flex-1" onClick={() => majArtisan(a.id, { statut: "actif" })}>Réactiver</button>
                : <button className="btn-danger flex-1" onClick={() => confirm("Suspendre cet artisan ? Il ne verra plus les demandes.") && majArtisan(a.id, { statut: "suspendu" })}>Suspendre</button>}
              {a.verifie
                ? <button className="btn-ghost flex-1" onClick={() => majArtisan(a.id, { verifie: false })}>Retirer « Vérifié »</button>
                : <button className="btn-brand flex-1" onClick={() => majArtisan(a.id, { verifie: true })}>✔ Marquer vérifié</button>}
            </div>
          </Modal>
        );
      })()}

      {fiche?.type === "clients" && (() => {
        const c = profil[fiche.id]; const dem = demandes.filter((d) => d.client_id === c.id);
        return (
          <Modal title={c.nom || "Client"} onClose={() => setFiche(null)}>
            <div className="space-y-2 text-sm">
              <p><a className="text-brand" href={`mailto:${c.email}`}>{c.email}</a>{c.telephone && <> · <a className="text-brand" href={`tel:${c.telephone}`}>{c.telephone}</a></>}</p>
              <p className="text-slate-500">Inscrit le {dateFr(c.created_at)}</p>
              <p className="font-bold">Demandes ({dem.length})</p>
              {dem.map((d) => (
                <button key={d.id} className="flex w-full justify-between gap-2 border-b border-slate-100 py-1.5 text-left" onClick={() => setFiche({ type: "demandes", id: d.id })}>
                  <span>{d.titre || d.description.slice(0, 50)}</span>
                  <span className={`chip shrink-0 ${STATUT_DEMANDE[statutDemande(d)][1]}`}>{STATUT_DEMANDE[statutDemande(d)][0]}</span>
                </button>
              ))}
            </div>
          </Modal>
        );
      })()}

      {fiche?.type === "demandes" && (() => {
        const d = demandes.find((x) => x.id === fiche.id)!; const c = profil[d.client_id];
        const os = offres.filter((o) => o.demande_id === d.id);
        return (
          <Modal title={d.titre || "Demande"} onClose={() => setFiche(null)} tall>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm">
              <p className="text-slate-500">{d.ville} {d.cp} · {d.delai} · créée le {dateFr(d.created_at)}{d.ferme_le && ` · ferme le ${dateFr(d.ferme_le)}`}</p>
              <p>Client : <b>{c?.nom}</b> · <a className="text-brand" href={`mailto:${c?.email}`}>{c?.email}</a></p>
              <Metiers ids={d.metiers} />
              <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3">{d.description}</p>
              {d.budget_max ? <p>Estimation IA : <b>{eur(d.budget_min)} – {eur(d.budget_max)}</b> TTC</p> : null}
              <p className="font-bold">Offres ({os.length})</p>
              {os.map((o) => (
                <p key={o.id} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                  <span>{artisans.find((a) => a.id === o.artisan_id)?.raison_sociale} <span className={`chip ${STATUT_OFFRE[o.statut][1]}`}>{STATUT_OFFRE[o.statut][0]}</span></span>
                  <b>{eur(o.total_ttc)}</b>
                </p>
              ))}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

/** Offrir une formule pour une durée, ou des offres en bonus */
function Offrir({ a, maj }: { a: Artisan; maj: (p: Partial<Artisan>) => Promise<void> }) {
  const [formule, setFormule] = useState<string>(a.abonnement && a.abonnement !== "gratuit" ? a.abonnement : "pro");
  const [mois, setMois] = useState("1");
  const actif = a.abonnement && a.abonnement !== "gratuit" && (!a.abonnement_fin || new Date(a.abonnement_fin) > new Date());
  const nom = (id?: string) => FORMULES.find((f) => f.id === id)?.nom || "Découverte";

  async function offrir() {
    let fin: string | null = null;
    if (mois !== "0") { const d = new Date(); d.setMonth(d.getMonth() + Number(mois)); fin = d.toISOString(); }
    if (!confirm(`Offrir la formule ${nom(formule)} ${mois === "0" ? "sans limite de durée" : `pendant ${mois} mois`} ?`)) return;
    await maj({ abonnement: formule as Artisan["abonnement"], abonnement_fin: fin });
  }

  return (
    <div className="shrink-0 space-y-2 border-t border-slate-200 pt-3 text-sm">
      <p className="font-semibold">🎁 Offrir</p>
      <p className="text-xs text-slate-500">
        Actuellement : <b>{actif ? nom(a.abonnement) : "Découverte"}</b>
        {actif && (a.abonnement_fin ? ` jusqu'au ${dateFr(a.abonnement_fin)}` : " sans limite")}
        {a.stripe_subscription_id && actif && " (payé via Stripe)"}
        {` · ${a.bonus_offres || 0} offre(s) bonus`}
      </p>
      <div className="flex gap-2">
        <select className="input !py-1.5" value={formule} onChange={(e) => setFormule(e.target.value)}>
          {FORMULES.filter((f) => f.prix > 0).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </select>
        <select className="input !py-1.5" value={mois} onChange={(e) => setMois(e.target.value)}>
          {[["1", "1 mois"], ["3", "3 mois"], ["6", "6 mois"], ["12", "12 mois"], ["0", "Sans limite"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn-brand !px-3" onClick={offrir}>Offrir</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[3, 5, 10].map((n) => (
          <button key={n} className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => maj({ bonus_offres: (a.bonus_offres || 0) + n })}>+{n} offres bonus</button>
        ))}
        {actif && !a.stripe_subscription_id && (
          <button className="btn-ghost !px-3 !py-1.5 text-xs text-red-600" onClick={() => confirm("Retirer la formule offerte ?") && maj({ abonnement: "gratuit", abonnement_fin: null })}>Retirer la formule</button>
        )}
      </div>
      <p className="text-[11px] text-slate-400">Les offres bonus servent une fois la limite du mois atteinte, et ne s'effacent pas d'un mois à l'autre.</p>
    </div>
  );
}
