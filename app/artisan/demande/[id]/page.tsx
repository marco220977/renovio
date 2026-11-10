"use client";
// Demande côté artisan (v2) : offre provisoire → questions du client → choisi : visite + devis définitif → signé : avenants.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { eur, dateFr } from "@/lib/calc";
import type { Line } from "@/lib/types";
import LignesEditeur, { nettoyerLignes } from "@/components/LignesEditeur";
import Conversation from "@/components/Conversation";
import Avenants from "@/components/Avenants";
import Ecarts from "@/components/Ecarts";
import { CahierVue, LignesVue, Metiers, Photos } from "@/components/Vues";
import { Erreur, Info, useProfil } from "@/components/Espace";
import { telechargerDevis } from "@/lib/devis-pdf";
import { STATUT_OFFRE, errMsg, ia, statutDemande, tempsRestant, type Artisan, type Demande, type Offre, type Tarif } from "@/lib/mer";

type Contact = { nom?: string; telephone?: string; email?: string; adresse?: string };
type Mode = null | "offre" | "definitif";

export default function DemandeArtisan() {
  const { id } = useParams<{ id: string }>();
  const { profil } = useProfil();
  const [d, setD] = useState<Demande | null | undefined>(undefined);
  const [a, setA] = useState<Artisan | null>(null);
  const [offre, setOffre] = useState<Offre | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [lignes, setLignes] = useState<Line[]>([]);
  const [hypotheses, setHypotheses] = useState<string[]>([]);
  const [delai, setDelai] = useState("14");
  const [duree, setDuree] = useState("");
  const [message, setMessage] = useState("");
  const [validite, setValidite] = useState("30");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function charger() {
    const s = sb();
    const [{ data: dem }, { data: art }, { data: o }, { data: t }] = await Promise.all([
      s.from("demandes").select("*").eq("id", id).maybeSingle(),
      s.from("artisans").select("*").eq("id", profil.id).maybeSingle(),
      s.from("offres").select("*").eq("demande_id", id).eq("artisan_id", profil.id).maybeSingle(),
      s.from("tarifs").select("*").order("libelle"),
    ]);
    setD(dem as Demande | null); setA(art as Artisan); setOffre(o as Offre | null); setTarifs((t as Tarif[]) || []);
    if (["choisie", "confirmee", "acceptee"].includes((o as Offre | null)?.statut || "")) {
      const { data: c } = await s.from("demande_contacts").select("*").eq("demande_id", id).maybeSingle();
      setContact(c as Contact);
    } else setContact(null);
  }
  useEffect(() => { charger(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (d === undefined) return <p className="text-slate-400">Chargement…</p>;
  if (d === null) return (
    <div className="card space-y-2 text-center">
      <p>Cette demande n'est plus disponible (fermée, attribuée ou hors de votre zone).</p>
      <Link href="/artisan" className="btn-ghost w-full">← Retour aux demandes</Link>
    </div>
  );

  const st = statutDemande(d);
  const ouverte = st === "ouverte";
  const choisi = offre?.statut === "choisie" || offre?.statut === "confirmee";
  const signe = offre?.statut === "acceptee";
  const peutModifier = ouverte && (!offre || (offre.statut === "envoyee" && !offre.modifiee));

  async function genererIA() {
    setErr(""); setBusy("L'IA prépare votre devis avec vos tarifs…");
    try {
      const r = await ia<{ lignes: Line[]; hypotheses?: string[]; delai_jours?: number; duree_jours?: number }>("devis", {
        cahier: d!.cahier || { titre: d!.titre, resume: d!.description },
        tarifs: tarifs.map((x) => ({ libelle: x.libelle, unite: x.unite, prix_ht: x.prix_ht, tva: x.tva })),
        tva_franchise: !!a?.tva_franchise,
      });
      setLignes(r.lignes || []); setHypotheses(r.hypotheses || []);
      if (r.delai_jours) setDelai(String(r.delai_jours));
      if (r.duree_jours) setDuree(String(r.duree_jours));
      setMode("offre");
    } catch (e) { setErr(errMsg(e)); }
    setBusy("");
  }

  function editer(m: Mode) {
    if (!offre) return;
    setLignes(offre.lignes); setDelai(String(offre.delai_jours ?? "")); setDuree(String(offre.duree_jours ?? ""));
    setMessage(m === "definitif" ? "" : offre.message || ""); setValidite(String(offre.validite_jours || 30)); setHypotheses([]); setMode(m);
  }

  async function envoyer() {
    setErr(""); setOk("");
    const propres = nettoyerLignes(lignes);
    if (!propres.some((l) => l.kind !== "section" && l.qty * l.unit_price > 0)) return setErr("Le devis est vide.");
    if (mode === "offre" && offre && !confirm("Vous ne pourrez modifier votre offre qu'une seule fois. Envoyer cette version ?")) return;
    setBusy("Envoi…");
    const { error } = mode === "definitif"
      ? await sb().rpc("confirmer_devis", { p_offre: offre!.id, p_lignes: propres, p_delai: Number(delai) || null, p_duree: Number(duree) || null, p_message: message || null })
      : await sb().rpc("envoyer_offre_v2", { p_demande: d!.id, p_lignes: propres, p_delai: Number(delai) || null, p_duree: Number(duree) || null, p_message: message, p_validite: Number(validite) || 30 });
    setBusy("");
    if (error) return setErr(errMsg(error));
    setOk(mode === "definitif" ? "✅ Devis définitif envoyé. Le client va le signer dans l'appli." : "✅ Offre envoyée. Le client la verra avec les autres, classées par score.");
    setMode(null); charger();
  }

  async function retirer() {
    if (!offre) return;
    const txt = choisi ? "Vous ne pouvez pas faire ce chantier ? Le client pourra choisir un autre artisan." : "Retirer votre offre ?";
    if (!confirm(txt)) return;
    const { error } = await sb().rpc("retirer_offre", { p_offre: offre.id });
    if (error) return setErr(errMsg(error));
    charger();
  }

  return (
    <div className="space-y-4">
      <Link href="/artisan" className="text-sm text-brand">← Demandes</Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">{d.titre || "Demande de travaux"}</h1>
        <p className="text-sm text-slate-500">📍 {d.ville || ""} {d.cp} · {d.delai} · publiée le {dateFr(d.publiee_le)}</p>
        {ouverte && <span className="chip bg-blue-100 text-blue-800">⏱ Fermeture dans {tempsRestant(d.ferme_le)}</span>}
        <Metiers ids={d.metiers} />
      </div>

      {ok && <Info>{ok}</Info>}

      {/* Choisi par le client : visite puis devis définitif */}
      {choisi && offre && (
        <div className="card space-y-3 border-violet-300 bg-violet-50">
          <p className="font-bold">🎉 Le client vous a choisi (sans engagement)</p>
          <p className="text-sm">{offre.statut === "choisie"
            ? "Organisez la visite avec lui, puis envoyez votre devis définitif. Le client signera ce devis-là."
            : `Devis définitif envoyé (${eur(offre.total_ttc)} TTC). En attente de la signature du client.`}</p>
          {contact && (
            <div className="space-y-1 rounded-xl bg-white p-3 text-sm">
              <p className="font-semibold">{contact.nom}</p>
              {contact.adresse && <p>{contact.adresse}, {d.cp} {d.ville}</p>}
              <div className="flex gap-2 pt-1">
                {contact.telephone && <a className="btn-ghost flex-1" href={`tel:${contact.telephone}`}>📞 {contact.telephone}</a>}
                {contact.email && <a className="btn-ghost flex-1" href={`mailto:${contact.email}`}>✉️ E-mail</a>}
              </div>
            </div>
          )}
          {offre.statut === "confirmee" && offre.lignes_initiales && (
            <Ecarts initiales={offre.lignes_initiales} finales={offre.lignes} ttcAvant={Number(offre.total_ttc_initial)} ttcApres={Number(offre.total_ttc)} />
          )}
          {mode !== "definitif" && (
            <button className="btn-brand w-full py-3.5" onClick={() => editer("definitif")}>
              {offre.statut === "choisie" ? "📝 Établir mon devis définitif (après visite)" : "✏️ Corriger mon devis définitif"}
            </button>
          )}
          <p className="text-xs text-slate-600">Le client voit l'écart avec votre devis provisoire. Les hausses fréquentes après visite font baisser votre score.</p>
        </div>
      )}

      {signe && offre && (
        <div className="card space-y-2 border-green-300 bg-green-50 text-green-900">
          <p className="font-bold">✅ Devis signé par le client</p>
          <p className="text-sm">Signé le {dateFr(offre.signe_le)} par {offre.signataire} · {eur(offre.total_ttc)} TTC. Le client peut se rétracter pendant 14 jours. Le règlement se fait directement entre vous.</p>
          {contact && (
            <div className="flex gap-2 text-sm">
              {contact.telephone && <a className="btn-ghost flex-1" href={`tel:${contact.telephone}`}>📞 {contact.telephone}</a>}
              {a && <button className="btn-ghost flex-1" onClick={() => telechargerDevis(offre, a, d, contact)}>📄 Devis signé</button>}
            </div>
          )}
        </div>
      )}
      {offre?.statut === "retractee" && <p className="card border-red-300 bg-red-50 text-sm text-red-800">Le client s'est rétracté le {dateFr(offre.retractee_le)}. Le devis est annulé.</p>}
      {signe && offre && <Avenants offreId={offre.id} moi="artisan" franchise={a?.tva_franchise} tarifs={tarifs} />}

      {/* Messagerie avec le client (dès qu'une offre existe) */}
      {offre && !["refusee", "retiree"].includes(offre.statut) && (
        <div className="card space-y-2">
          <p className="font-bold">💬 Messages avec le client</p>
          {offre.statut === "envoyee" && <p className="text-xs text-slate-500">Le client peut vous poser des questions avant de choisir. Ses coordonnées vous seront transmises s'il vous choisit.</p>}
          <Conversation demandeId={d.id} artisanId={profil.id} moi="artisan" visite={choisi} ferme={offre.statut === "retractee"} />
        </div>
      )}

      <div className="card space-y-3">
        <p className="font-bold">Demande du client</p>
        <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{d.description}</p>
        {d.reponses?.filter((r) => r.reponse).length > 0 && (
          <ul className="space-y-1 text-sm">
            {d.reponses.filter((r) => r.reponse).map((r) => <li key={r.question}><span className="text-slate-500">{r.question}</span> → <b>{r.reponse}</b></li>)}
          </ul>
        )}
        <Photos paths={d.photos} />
      </div>
      {d.cahier && <div className="card"><p className="mb-2 font-bold">📋 Cahier des charges (IA)</p><CahierVue cahier={d.cahier} /></div>}

      {/* Mon offre */}
      {offre && !mode && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold">Mon devis {offre.numero}</p>
            <span className={`chip ${STATUT_OFFRE[offre.statut][1]}`}>{STATUT_OFFRE[offre.statut][0]}</span>
          </div>
          <LignesVue lignes={offre.lignes} franchise={a?.tva_franchise} />
          <div className="flex flex-wrap gap-2">
            {a && <button className="btn-ghost" onClick={() => telechargerDevis(offre, a, d, contact)}>📄 PDF</button>}
            {peutModifier && <button className="btn-ghost flex-1" onClick={() => editer("offre")}>✏️ Modifier (1 fois)</button>}
            {(offre.statut === "envoyee" && ouverte || choisi) && <button className="btn-danger" onClick={retirer}>{choisi ? "Je ne peux pas faire ce chantier" : "Retirer"}</button>}
          </div>
          {offre.modifiee && offre.statut === "envoyee" && <p className="text-xs text-slate-500">Offre déjà modifiée une fois.</p>}
        </div>
      )}

      {!offre && ouverte && !mode && (
        <div className="card space-y-3">
          <p className="font-bold">Répondre à cette demande</p>
          <p className="text-sm text-slate-600">Envoyez un devis provisoire. Si le client vous choisit, vous ferez une visite puis enverrez votre devis définitif : c'est lui qu'il signera.</p>
          {!tarifs.length && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Vous n'avez pas encore de tarifs : l'IA utilisera des prix moyens du marché. <Link href="/artisan/tarifs" className="underline">Ajouter mes tarifs</Link></p>}
          <button className="btn-brand w-full py-3.5" disabled={!!busy} onClick={genererIA}>{busy || "🤖 Générer mon devis avec l'IA"}</button>
          <button className="btn-ghost w-full" disabled={!!busy} onClick={() => { setLignes([]); setMode("offre"); }}>Faire mon devis à la main</button>
        </div>
      )}

      {mode && (
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold">{mode === "definitif" ? "Devis définitif (après visite)" : "Mon devis provisoire"}</h2>
          {mode === "definitif" && <p className="text-sm text-slate-600">Ajustez les quantités et les postes selon ce que vous avez vu sur place. Le client verra les différences avec votre devis provisoire.</p>}
          {hypotheses.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">Hypothèses de l'IA, à vérifier :</p>
              <ul className="list-disc pl-4">{hypotheses.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          )}
          <LignesEditeur lignes={lignes} onChange={setLignes} tarifs={tarifs} franchise={a?.tva_franchise} />
          <div className="card space-y-3">
            <div className={`grid gap-2 ${mode === "offre" ? "grid-cols-3" : "grid-cols-2"}`}>
              <div><label className="label">Démarrage (j)</label><input className="input" inputMode="numeric" value={delai} onChange={(e) => setDelai(e.target.value.replace(/\D/g, ""))} /></div>
              <div><label className="label">Durée (j)</label><input className="input" inputMode="numeric" value={duree} onChange={(e) => setDuree(e.target.value.replace(/\D/g, ""))} /></div>
              {mode === "offre" && <div><label className="label">Validité (j)</label><input className="input" inputMode="numeric" value={validite} onChange={(e) => setValidite(e.target.value.replace(/\D/g, ""))} /></div>}
            </div>
            <div><label className="label">{mode === "definitif" ? "Explication des changements" : "Message au client"}</label>
              <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder={mode === "definitif" ? "Ex : évacuation à reprendre sur 3 m, constatée lors de la visite." : "Ex : visite gratuite avant démarrage, robinetterie Grohe…"} /></div>
          </div>
          <Erreur msg={err} />
          {mode === "offre" && <p className="text-xs text-slate-500">🔒 Votre offre est invisible des autres artisans. {offre ? "C'est votre unique modification." : "Vous pourrez la modifier une seule fois."}</p>}
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={!!busy} onClick={() => setMode(null)}>Annuler</button>
            <button className="btn-brand flex-1 py-3.5" disabled={!!busy} onClick={envoyer}>{busy || (mode === "definitif" ? "Envoyer le devis définitif" : "Envoyer mon offre")}</button>
          </div>
        </div>
      )}
      {!mode && <Erreur msg={err} />}
    </div>
  );
}
