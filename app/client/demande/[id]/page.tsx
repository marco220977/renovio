"use client";
// Demande côté client (v2) : offres classées → choix sans engagement → visite → devis définitif → signature → avenants.
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { eur, dateFr } from "@/lib/calc";
import Modal from "@/components/Modal";
import SignaturePad from "@/components/SignaturePad";
import Conversation from "@/components/Conversation";
import Avenants from "@/components/Avenants";
import Ecarts from "@/components/Ecarts";
import { CahierVue, Etoiles, LignesVue, Metiers, Photos } from "@/components/Vues";
import { Erreur, Info } from "@/components/Espace";
import { telechargerDevis } from "@/lib/devis-pdf";
import {
  STATUT_DEMANDE, errMsg, prixTresBas, quand, scoreOffre, statutDemande, tempsRestant,
  type Artisan, type Demande, type Offre,
} from "@/lib/mer";

type Note = { artisan_id: string; note: number; nb_avis: number };
type Ecart = { artisan_id: string; ecart: number; nb: number };
type Contact = { nom?: string; telephone?: string; email?: string; adresse?: string };

export default function DemandeClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [d, setD] = useState<Demande | null>(null);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [artisans, setArtisans] = useState<Record<string, Artisan>>({});
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [ecarts, setEcarts] = useState<Record<string, Ecart>>({});
  const [contact, setContact] = useState<Contact | null>(null);
  const [avisFait, setAvisFait] = useState(false);
  const [voir, setVoir] = useState<Offre | null>(null);
  const [onglet, setOnglet] = useState<"devis" | "messages">("devis");
  const [signer, setSigner] = useState(false);
  const [cahierOuvert, setCahierOuvert] = useState(false);
  const [autres, setAutres] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState("");

  async function charger() {
    const s = sb();
    const { data } = await s.from("demandes").select("*").eq("id", id).maybeSingle();
    if (!data) return router.replace("/client");
    setD(data as Demande);
    const { data: o } = await s.from("offres").select("*").eq("demande_id", id).neq("statut", "retiree");
    const list = (o as Offre[]) || [];
    setOffres(list);
    const ids = list.map((x) => x.artisan_id);
    if (ids.length) {
      const [{ data: a }, { data: n }, { data: e }] = await Promise.all([
        s.from("artisans").select("*").in("id", ids),
        s.from("artisans_notes").select("*").in("artisan_id", ids),
        s.rpc("ecarts_artisans", { p_ids: ids }),
      ]);
      setArtisans(Object.fromEntries(((a as Artisan[]) || []).map((x) => [x.id, x])));
      setNotes(Object.fromEntries(((n as Note[]) || []).map((x) => [x.artisan_id, x])));
      setEcarts(Object.fromEntries(((e as Ecart[]) || []).map((x) => [x.artisan_id, x])));
    }
    const { data: c } = await s.from("demande_contacts").select("*").eq("demande_id", id).maybeSingle();
    setContact(c as Contact);
    const { count } = await s.from("avis").select("id", { count: "exact", head: true }).eq("demande_id", id);
    setAvisFait(!!count);
  }
  useEffect(() => { charger(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const envoyees = offres.filter((o) => o.statut === "envoyee");
  const classees = useMemo(() => {
    if (!d) return [];
    const base = offres.filter((o) => o.statut === "envoyee");
    return base.map((o) => ({ o, score: scoreOffre(o, artisans[o.artisan_id], notes[o.artisan_id], d, base, ecarts[o.artisan_id]?.ecart) }))
      .sort((a, b) => b.score - a.score);
  }, [offres, artisans, notes, ecarts, d]);

  if (!d) return <p className="text-slate-400">Chargement…</p>;
  const st = statutDemande(d);
  const [label, color] = STATUT_DEMANDE[st] || STATUT_DEMANDE.fermee;
  const choisie = offres.find((o) => o.statut === "choisie" || o.statut === "confirmee");
  const signee = offres.find((o) => o.statut === "acceptee" || o.statut === "retractee");
  const peutChoisir = st === "ouverte" || st === "fermee";
  const art = (o?: Offre) => (o ? artisans[o.artisan_id] : undefined);

  async function rpc(nom: string, args: Record<string, unknown>) {
    setBusy(true); setErr("");
    const { error } = await sb().rpc(nom, args);
    setBusy(false);
    if (error) { setErr(errMsg(error)); return false; }
    await charger(); return true;
  }

  async function choisir(o: Offre) {
    if (!confirm(`Choisir ${art(o)?.raison_sociale} ? C'est sans engagement : l'artisan reçoit vos coordonnées pour organiser une visite, puis vous envoie son devis définitif. Vous ne signez qu'après.`)) return;
    if (await rpc("choisir_offre", { p_offre: o.id })) setVoir(null);
  }

  async function envoyerAvis() {
    if (!signee) return;
    const { error } = await sb().from("avis").insert({ demande_id: d!.id, artisan_id: signee.artisan_id, note, commentaire });
    if (error) return setErr(errMsg(error));
    setAvisFait(true);
  }

  const joursRetractation = signee?.signe_le ? 14 - Math.floor((Date.now() - new Date(signee.signe_le).getTime()) / 864e5) : 0;

  const carteOffre = (o: Offre, score?: number, premier = false) => {
    const a = art(o); const e = ecarts[o.artisan_id];
    return (
      <button key={o.id} onClick={() => { setVoir(o); setOnglet("devis"); setSigner(false); }} className={`card block w-full space-y-2 text-left ${premier ? "border-2 border-flame" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            {premier && <span className="chip mb-1 bg-flame text-white">Meilleur score</span>}
            <p className="font-bold">{a?.raison_sociale || "Artisan"}</p>
            <p className="text-xs text-slate-500">{a?.ville} {a?.verifie && "· ✔ Vérifié"} {a?.rge && "· RGE"}</p>
            <Etoiles note={notes[o.artisan_id]?.note} nb={notes[o.artisan_id]?.nb_avis} />
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold">{eur(o.total_ttc)}</p>
            <p className="text-xs text-slate-500">TTC provisoire</p>
            {score !== undefined && <p className="mt-1 text-sm font-bold text-brand">{score}/100</p>}
          </div>
        </div>
        <p className="text-sm text-slate-600">Démarrage sous {o.delai_jours ?? "?"} j{o.duree_jours ? ` · ${o.duree_jours} j de travaux` : ""}</p>
        {e && e.nb >= 2 && e.ecart > 5 && <p className="text-xs text-amber-800">Ses devis définitifs sont en moyenne {String(e.ecart).replace(".", ",")} % plus chers après visite.</p>}
        {prixTresBas(o.total_ttc, d) && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">⚠️ Prix très bas par rapport à l'estimation : demandez le détail avant de choisir.</p>}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {params.get("publiee") && st === "ouverte" && (
        <Info>✅ Demande publiée ! Les artisans de votre secteur ont {tempsRestant(d.ferme_le)} pour vous envoyer leur devis.</Info>
      )}
      <div className="space-y-2">
        <span className={`chip ${color}`}>{label}</span>
        <h1 className="text-2xl font-extrabold">{d.titre || "Ma demande"}</h1>
        <p className="text-sm text-slate-500">{d.ville || ""} {d.cp} · {d.delai} · créée le {dateFr(d.created_at)}</p>
        <Metiers ids={d.metiers} />
      </div>

      <div className="card space-y-2">
        <button className="flex w-full items-center justify-between font-bold" onClick={() => setCahierOuvert(!cahierOuvert)}>
          📋 Cahier des charges <span className="text-slate-400">{cahierOuvert ? "▲" : "▼"}</span>
        </button>
        {cahierOuvert && (
          <>
            <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{d.description}</p>
            {d.cahier && <CahierVue cahier={d.cahier} />}
            <Photos paths={d.photos} />
          </>
        )}
      </div>

      {st === "brouillon" && (
        <div className="card space-y-2">
          <p className="text-sm">Cette demande n'est pas encore publiée.</p>
          <button className="btn-brand w-full" onClick={() => rpc("publier_demande", { p_id: d.id })}>Publier ma demande</button>
        </div>
      )}

      {/* Étapes */}
      {st !== "brouillon" && st !== "annulee" && (
        <ol className="flex justify-between gap-1 text-center text-[11px] font-semibold">
          {["Offres", "Choix", "Visite", "Devis définitif", "Signature"].map((e, i) => {
            const etape = signee ? 5 : choisie?.statut === "confirmee" ? 4 : choisie ? 2 : envoyees.length ? 1 : 0;
            const fait = i < etape; const actuel = i === etape;
            return <li key={e} className={`flex-1 rounded-lg px-1 py-1.5 ${fait ? "bg-green-100 text-green-800" : actuel ? "bg-ink text-white" : "bg-slate-100 text-slate-400"}`}>{e}</li>;
          })}
        </ol>
      )}

      {/* Artisan choisi : visite puis devis définitif */}
      {choisie && (
        <div className="card space-y-3 border-violet-300">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">Vous avez choisi {art(choisie)?.raison_sociale}</p>
              <p className="text-xs text-slate-500">Sans engagement · {art(choisie)?.telephone && <a className="text-brand" href={`tel:${art(choisie)?.telephone}`}>📞 {art(choisie)?.telephone}</a>}</p>
            </div>
          </div>
          {choisie.statut === "choisie" ? (
            <Info>⏳ L'artisan a reçu vos coordonnées. Convenez d'une visite ci-dessous ; après la visite, il vous enverra son devis définitif. Vous ne signerez qu'à ce moment-là.</Info>
          ) : (
            <>
              <p className="font-semibold">📄 Devis définitif reçu : {eur(choisie.total_ttc)} TTC</p>
              {choisie.lignes_initiales && (
                <Ecarts initiales={choisie.lignes_initiales} finales={choisie.lignes} ttcAvant={Number(choisie.total_ttc_initial)} ttcApres={Number(choisie.total_ttc)} />
              )}
              <button className="btn-ghost w-full" onClick={() => { setVoir(choisie); setOnglet("devis"); setSigner(false); }}>Voir le devis définitif en détail</button>
              <button className="btn-brand w-full py-3.5" onClick={() => { setVoir(choisie); setOnglet("devis"); setSigner(true); }}>✍️ Signer le devis définitif</button>
            </>
          )}
          <Conversation demandeId={d.id} artisanId={choisie.artisan_id} moi="client" />
          <button className="w-full text-sm text-red-600" disabled={busy}
            onClick={() => confirm(`Ne plus travailler avec ${art(choisie)?.raison_sociale} ? Vous pourrez choisir une autre offre.`) && rpc("renoncer_choix", { p_offre: choisie.id })}>
            Choisir un autre artisan
          </button>
          {envoyees.length > 0 && <p className="text-center text-xs text-slate-500">{envoyees.length} autre(s) offre(s) restent disponibles si vous changez d'avis.</p>}
        </div>
      )}

      {/* Devis signé */}
      {signee && (
        <div className={`card space-y-3 ${signee.statut === "retractee" ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
          {signee.statut === "retractee" ? (
            <p className="font-bold text-red-800">Vous vous êtes rétracté le {dateFr(signee.retractee_le)}. Le devis est annulé.</p>
          ) : (
            <>
              <p className="font-bold text-green-900">✅ Devis signé avec {art(signee)?.raison_sociale}</p>
              <p className="text-sm text-green-900">Devis {signee.numero} signé le {dateFr(signee.signe_le)} · {eur(signee.total_ttc)} TTC.</p>
              <div className="flex gap-2 text-sm">
                {art(signee)?.telephone && <a className="btn-ghost flex-1" href={`tel:${art(signee)?.telephone}`}>📞 Appeler</a>}
                <button className="btn-ghost flex-1" onClick={() => telechargerDevis(signee, art(signee)!, d, contact)}>📄 Devis signé</button>
              </div>
              <p className="text-xs text-slate-600">Le règlement des travaux se fait directement avec l'artisan, selon les conditions de son devis.</p>
              {joursRetractation > 0 && (
                <div className="rounded-xl bg-white p-3 text-xs text-slate-600">
                  Droit de rétractation : il vous reste <b>{joursRetractation} jour(s)</b> pour annuler sans motif (devis signé à distance).
                  <button className="mt-1 block font-semibold text-red-600 underline" disabled={busy}
                    onClick={() => confirm("Vous rétracter ? Le devis signé sera annulé.") && rpc("retracter_devis", { p_offre: signee.id })}>Me rétracter</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {signee?.statut === "acceptee" && (
        <>
          <Avenants offreId={signee.id} moi="client" franchise={art(signee)?.tva_franchise} nomClient={contact?.nom} />
          <div className="card space-y-2">
            <p className="font-bold">💬 Messages avec l'artisan</p>
            <Conversation demandeId={d.id} artisanId={signee.artisan_id} moi="client" visite={false} />
          </div>
          {!avisFait ? (
            <div className="card space-y-2">
              <p className="font-semibold">Chantier terminé ? Laissez un avis</p>
              <div className="flex gap-1 text-3xl">
                {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setNote(n)} className={n <= note ? "text-amber-500" : "text-slate-300"}>★</button>)}
              </div>
              <textarea className="input" placeholder="Votre commentaire (facultatif)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
              <button className="btn-primary w-full" onClick={envoyerAvis}>Publier mon avis</button>
            </div>
          ) : <p className="text-center text-sm text-green-800">Merci pour votre avis !</p>}
        </>
      )}

      {/* Offres reçues */}
      {st !== "brouillon" && !signee && (
        <div className="space-y-3">
          {choisie ? (
            envoyees.length > 0 && <button className="w-full text-sm font-semibold text-brand" onClick={() => setAutres(!autres)}>{autres ? "Masquer" : "Voir"} les autres offres ({envoyees.length})</button>
          ) : (
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-extrabold">Offres reçues ({envoyees.length}/5)</h2>
              {st === "ouverte" && <span className="text-xs text-slate-500">Fermeture dans {tempsRestant(d.ferme_le)}</span>}
            </div>
          )}
          {!choisie && !envoyees.length && (
            <div className="card text-center text-sm text-slate-600">
              {st === "ouverte" ? "⏳ Les artisans étudient votre demande. Vous serez prévenu dès la première offre." : "Aucune offre disponible."}
            </div>
          )}
          {!choisie && envoyees.length > 0 && <p className="text-xs text-slate-500">Classement sur 100 : prix (40), avis (30), délai (15), profil vérifié (15). Prix provisoires, confirmés après visite.</p>}
          {(!choisie || autres) && classees.map(({ o, score }, i) => carteOffre(o, score, !choisie && i === 0))}
        </div>
      )}

      <Erreur msg={err} />
      {(st === "ouverte" || st === "fermee" || st === "brouillon" || st === "en_cours") && (
        <button className="w-full text-sm text-red-600" onClick={() => confirm("Annuler cette demande ? Les artisans ne pourront plus répondre.") && rpc("annuler_demande", { p_id: d.id })}>Annuler la demande</button>
      )}

      {voir && (
        <Modal title={art(voir)?.raison_sociale || "Devis"} onClose={() => { setVoir(null); setSigner(false); }} tall>
          {!signer && (
            <div className="mb-2 flex shrink-0 rounded-xl bg-slate-100 p-1">
              {(["devis", "messages"] as const).map((o) => (
                <button key={o} onClick={() => setOnglet(o)} className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${onglet === o ? "bg-white shadow" : "text-slate-500"}`}>
                  {o === "devis" ? "Devis" : "Questions"}
                </button>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {signer ? (
              <>
                <p className="text-sm">Vous acceptez le devis définitif {voir.numero} de <b>{art(voir)?.raison_sociale}</b> pour <b>{eur(voir.total_ttc)} TTC</b>.</p>
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Le devis signé engage l'artisan et vous. Vous disposez de 14 jours pour vous rétracter sans motif (contrat conclu à distance). Le règlement se fait directement avec l'artisan.</p>
                <SignaturePad allowPhoto={false} defaultName={contact?.nom || ""} onCancel={() => setSigner(false)}
                  onDone={async (nom, sig) => { if (await rpc("accepter_devis", { p_offre: voir.id, p_nom: nom, p_signature: sig })) { setSigner(false); setVoir(null); } }} />
                {busy && <p className="text-sm text-slate-500">Enregistrement…</p>}
              </>
            ) : onglet === "messages" ? (
              <Conversation demandeId={d.id} artisanId={voir.artisan_id} moi="client" visite={voir.statut !== "envoyee"} />
            ) : (
              <>
                {voir.statut === "envoyee" && <p className="rounded-xl bg-blue-50 p-2 text-xs text-blue-900">Devis provisoire, établi sur photos et description. Il sera confirmé ou ajusté après la visite de l'artisan.</p>}
                {art(voir)?.presentation && <p className="text-sm text-slate-600">{art(voir)?.presentation}</p>}
                {voir.message && <p className="rounded-xl bg-slate-50 p-3 text-sm">💬 {voir.message}</p>}
                <LignesVue lignes={voir.lignes} franchise={art(voir)?.tva_franchise} />
                <p className="text-xs text-slate-500">SIRET {art(voir)?.siret} · Décennale : {art(voir)?.decennale} · Offre valable {voir.validite_jours} jours{voir.confirmee_le && ` · définitif du ${quand(voir.confirmee_le)}`}</p>
              </>
            )}
          </div>
          {!signer && onglet === "devis" && (
            <div className="flex shrink-0 gap-2 pt-3">
              <button className="btn-ghost" onClick={() => telechargerDevis(voir, art(voir)!, d, contact)}>📄 Aperçu PDF</button>
              {peutChoisir && voir.statut === "envoyee" && <button className="btn-brand flex-1" disabled={busy} onClick={() => choisir(voir)}>Choisir cet artisan (sans engagement)</button>}
              {voir.statut === "confirmee" && <button className="btn-brand flex-1" onClick={() => setSigner(true)}>✍️ Signer</button>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
