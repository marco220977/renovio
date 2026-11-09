"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { eur, dateFr } from "@/lib/calc";
import Modal from "@/components/Modal";
import SignaturePad from "@/components/SignaturePad";
import { CahierVue, Etoiles, LignesVue, Metiers, Photos } from "@/components/Vues";
import { Erreur, Info } from "@/components/Espace";
import { telechargerDevis } from "@/lib/devis-pdf";
import {
  STATUT_DEMANDE, errMsg, prixTresBas, scoreOffre, statutDemande, tempsRestant,
  type Artisan, type Demande, type Offre,
} from "@/lib/mer";

type Note = { artisan_id: string; note: number; nb_avis: number };
type Contact = { nom?: string; telephone?: string; email?: string; adresse?: string };

export default function DemandeClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [d, setD] = useState<Demande | null>(null);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [artisans, setArtisans] = useState<Record<string, Artisan>>({});
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [contact, setContact] = useState<Contact | null>(null);
  const [avisFait, setAvisFait] = useState(false);
  const [voir, setVoir] = useState<Offre | null>(null);
  const [signer, setSigner] = useState(false);
  const [cahierOuvert, setCahierOuvert] = useState(false);
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
      const { data: a } = await s.from("artisans").select("*").in("id", ids);
      setArtisans(Object.fromEntries(((a as Artisan[]) || []).map((x) => [x.id, x])));
      const { data: n } = await s.from("artisans_notes").select("*").in("artisan_id", ids);
      setNotes(Object.fromEntries(((n as Note[]) || []).map((x) => [x.artisan_id, x])));
    }
    const { data: c } = await s.from("demande_contacts").select("*").eq("demande_id", id).maybeSingle();
    setContact(c as Contact);
    const { count } = await s.from("avis").select("id", { count: "exact", head: true }).eq("demande_id", id);
    setAvisFait(!!count);
  }
  useEffect(() => { charger(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const classees = useMemo(() => {
    if (!d) return [];
    return offres.map((o) => ({ o, score: scoreOffre(o, artisans[o.artisan_id], notes[o.artisan_id], d, offres) }))
      .sort((a, b) => b.score - a.score);
  }, [offres, artisans, notes, d]);

  if (!d) return <p className="text-slate-400">Chargement…</p>;
  const st = statutDemande(d);
  const [label, color] = STATUT_DEMANDE[st];
  const retenue = offres.find((o) => o.statut === "acceptee");
  const peutChoisir = st === "ouverte" || st === "fermee";

  async function accepter(nom: string, signature: string) {
    if (!voir) return;
    setBusy(true); setErr("");
    const { error } = await sb().rpc("accepter_offre", { p_offre: voir.id, p_nom: nom, p_signature: signature });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    setSigner(false); setVoir(null); charger();
  }

  async function annuler() {
    if (!confirm("Annuler cette demande ? Les artisans ne pourront plus répondre.")) return;
    const { error } = await sb().rpc("annuler_demande", { p_id: d!.id });
    if (error) return setErr(errMsg(error));
    charger();
  }

  async function publier() {
    setErr("");
    const { error } = await sb().rpc("publier_demande", { p_id: d!.id });
    if (error) return setErr(errMsg(error));
    charger();
  }

  async function envoyerAvis() {
    if (!retenue) return;
    const { error } = await sb().from("avis").insert({ demande_id: d!.id, artisan_id: retenue.artisan_id, note, commentaire });
    if (error) return setErr(errMsg(error));
    setAvisFait(true);
  }

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
          <button className="btn-brand w-full" onClick={publier}>Publier ma demande</button>
        </div>
      )}

      {/* Artisan retenu */}
      {retenue && (
        <div className="card space-y-3 border-green-300 bg-green-50">
          <p className="font-bold text-green-900">✅ Vous avez choisi {artisans[retenue.artisan_id]?.raison_sociale}</p>
          <p className="text-sm text-green-900">Devis {retenue.numero} signé le {dateFr(retenue.signe_le)} · {eur(retenue.total_ttc)} TTC. L'artisan a reçu vos coordonnées et va vous contacter.</p>
          <div className="text-sm">
            {artisans[retenue.artisan_id]?.telephone && <a className="btn-ghost mr-2" href={`tel:${artisans[retenue.artisan_id]?.telephone}`}>📞 Appeler</a>}
            {artisans[retenue.artisan_id]?.email && <a className="btn-ghost" href={`mailto:${artisans[retenue.artisan_id]?.email}`}>✉️ E-mail</a>}
          </div>
          <button className="btn-ghost w-full" onClick={() => telechargerDevis(retenue, artisans[retenue.artisan_id], d, contact)}>📄 Devis signé (PDF)</button>
          {!avisFait ? (
            <div className="space-y-2 rounded-xl bg-white p-3">
              <p className="font-semibold">Chantier terminé ? Laissez un avis</p>
              <div className="flex gap-1 text-3xl">
                {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setNote(n)} className={n <= note ? "text-amber-500" : "text-slate-300"}>★</button>)}
              </div>
              <textarea className="input" placeholder="Votre commentaire (facultatif)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
              <button className="btn-primary w-full" onClick={envoyerAvis}>Publier mon avis</button>
            </div>
          ) : <p className="text-sm text-green-900">Merci pour votre avis !</p>}
        </div>
      )}

      {/* Offres */}
      {st !== "brouillon" && !retenue && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">Offres reçues ({offres.length}/5)</h2>
            {st === "ouverte" && <span className="text-xs text-slate-500">Fermeture dans {tempsRestant(d.ferme_le)}</span>}
          </div>
          {!offres.length && (
            <div className="card text-center text-sm text-slate-600">
              {st === "ouverte" ? "⏳ Les artisans étudient votre demande. Vous serez prévenu dès la première offre." : "Aucun artisan n'a répondu cette fois."}
            </div>
          )}
          {offres.length > 0 && <p className="text-xs text-slate-500">Classement sur 100 : prix (40), avis (30), délai (15), profil vérifié (15).</p>}
          {classees.map(({ o, score }, i) => {
            const a = artisans[o.artisan_id];
            return (
              <button key={o.id} onClick={() => setVoir(o)} className={`card block w-full space-y-2 text-left ${i === 0 ? "border-2 border-flame" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {i === 0 && <span className="chip mb-1 bg-flame text-white">Meilleur score</span>}
                    <p className="font-bold">{a?.raison_sociale || "Artisan"}</p>
                    <p className="text-xs text-slate-500">{a?.ville} {a?.verifie && "· ✔ Vérifié"} {a?.rge && "· RGE"}</p>
                    <Etoiles note={notes[o.artisan_id]?.note} nb={notes[o.artisan_id]?.nb_avis} />
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold">{eur(o.total_ttc)}</p>
                    <p className="text-xs text-slate-500">TTC</p>
                    <p className="mt-1 text-sm font-bold text-brand">{score}/100</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">Démarrage sous {o.delai_jours ?? "?"} j{o.duree_jours ? ` · ${o.duree_jours} j de travaux` : ""}</p>
                {prixTresBas(o.total_ttc, d) && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">⚠️ Prix très bas par rapport à l'estimation : demandez le détail avant de choisir.</p>}
              </button>
            );
          })}
        </div>
      )}

      <Erreur msg={err} />
      {(st === "ouverte" || st === "fermee" || st === "brouillon") && (
        <button className="w-full text-sm text-red-600" onClick={annuler}>Annuler la demande</button>
      )}

      {voir && (
        <Modal title={`Devis ${artisans[voir.artisan_id]?.raison_sociale || ""}`} onClose={() => { setVoir(null); setSigner(false); }} tall>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {!signer ? (
              <>
                {artisans[voir.artisan_id]?.presentation && <p className="text-sm text-slate-600">{artisans[voir.artisan_id]?.presentation}</p>}
                {voir.message && <p className="rounded-xl bg-slate-50 p-3 text-sm">💬 {voir.message}</p>}
                <LignesVue lignes={voir.lignes} franchise={artisans[voir.artisan_id]?.tva_franchise} />
                <p className="text-xs text-slate-500">
                  SIRET {artisans[voir.artisan_id]?.siret} · Décennale : {artisans[voir.artisan_id]?.decennale}
                  {" "}· Offre valable {voir.validite_jours} jours
                </p>
              </>
            ) : (
              <>
                <p className="text-sm">Vous acceptez le devis {voir.numero} de <b>{artisans[voir.artisan_id]?.raison_sociale}</b> pour <b>{eur(voir.total_ttc)} TTC</b>. Les autres offres seront refusées.</p>
                <SignaturePad allowPhoto={false} defaultName={contact?.nom || ""} onCancel={() => setSigner(false)} onDone={(nom, sig) => accepter(nom, sig)} />
                {busy && <p className="text-sm text-slate-500">Enregistrement…</p>}
              </>
            )}
          </div>
          {!signer && (
            <div className="flex shrink-0 gap-2 pt-3">
              <button className="btn-ghost" onClick={() => telechargerDevis(voir, artisans[voir.artisan_id], d, contact)}>📄 PDF</button>
              {peutChoisir && voir.statut === "envoyee" && <button className="btn-brand flex-1" onClick={() => setSigner(true)}>Choisir cet artisan</button>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
