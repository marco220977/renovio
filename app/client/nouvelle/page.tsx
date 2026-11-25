"use client";
// Nouvelle demande en 4 étapes : description → questions de l'IA → cahier des charges → coordonnées et publication.
import { useEffect, useRef, useState } from "react";
import { AdresseAuto, CpVille } from "@/components/Adresse";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import TradePicker from "@/components/TradePicker";
import { CahierVue } from "@/components/Vues";
import { Erreur, useProfil } from "@/components/Espace";
import { aDuContenu, ecrireBrouillon, ecrirePhotos, effacerBrouillon, lireBrouillon } from "@/lib/brouillon";
import { lireInvite, ecrireInvite, type Invite } from "@/lib/realisations";
import { DELAIS, compresser, dataUrlToBlob, departementDe, errMsg, ia, type Cahier, type Question } from "@/lib/mer";

type Photo = { grande: string; petite: string };
type Video = { fichier: File; url: string; duree: number; images: string[] };
const VIDEO_MAX_S = 60, VIDEO_MAX_MO = 100;

// Extrait quelques images d'une vidéo (pour que l'IA « voie » le lieu filmé)
async function imagesDeVideo(f: File, n = 5): Promise<{ duree: number; images: string[] }> {
  const url = URL.createObjectURL(f);
  const v = document.createElement("video");
  v.preload = "auto"; v.muted = true; v.playsInline = true; v.src = url;
  await new Promise<void>((ok, ko) => { v.onloadedmetadata = () => ok(); v.onerror = () => ko(new Error("Vidéo illisible")); });
  const duree = isFinite(v.duration) ? v.duration : 0;
  const images: string[] = [];
  const c = document.createElement("canvas");
  for (let i = 0; i < n && duree > 0; i++) {
    v.currentTime = Math.min(duree - 0.1, (duree * (i + 0.5)) / n);
    await new Promise<void>((ok) => { v.onseeked = () => ok(); setTimeout(ok, 3000); });
    const k = Math.min(1, 800 / Math.max(v.videoWidth, v.videoHeight || 1));
    c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
    if (!c.width || !c.height) continue;
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    images.push(c.toDataURL("image/jpeg", 0.7));
  }
  URL.revokeObjectURL(url);
  return { duree, images };
}

// Questions à choix : plusieurs réponses possibles, enregistrées sous la forme « A, B, C ».
// « Je ne sais pas » est exclusif : il remplace les autres choix (et inversement).
const SEP = " · ";
const choixDe = (v?: string) => (v ? v.split(SEP).filter(Boolean) : []);
function basculerChoix(v: string | undefined, o: string) {
  const l = choixDe(v);
  if (o === "Je ne sais pas") return l.includes(o) ? "" : o;
  const sans = l.filter((x) => x !== "Je ne sais pas");
  return (sans.includes(o) ? sans.filter((x) => x !== o) : [...sans, o]).join(SEP);
}

export default function Nouvelle() {
  const router = useRouter();
  const { profil } = useProfil();
  const [etape, setEtape] = useState(1);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // Étape 1
  const [description, setDescription] = useState("");
  const [cp, setCp] = useState("");
  const [ville, setVille] = useState("");
  const [delai, setDelai] = useState(DELAIS[2]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Artisan choisi depuis sa vitrine (« Demander un devis à cet artisan ») : prévenu en priorité
  const [invite, setInvite] = useState<Invite | null>(null);
  useEffect(() => { setInvite(lireInvite()); }, []);
  const [video, setVideo] = useState<Video | null>(null);
  const [videoMsg, setVideoMsg] = useState("");
  // Étape 2
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [titre, setTitre] = useState("");
  // Étape 3
  const [cahier, setCahier] = useState<Cahier | null>(null);
  const [metiers, setMetiers] = useState<string[]>([]);
  // Étape 4
  const [nom, setNom] = useState(profil.nom || "");
  const [tel, setTel] = useState(profil.telephone || "");
  const [email, setEmail] = useState(profil.email || "");
  const [adresse, setAdresse] = useState("");
  const [demandeId, setDemandeId] = useState<string | null>(null);

  const petites = () => photos.map((p) => p.petite);
  // Images envoyées à l'IA : 3 photos + 5 images de la vidéo
  const imagesIA = () => [...petites().slice(0, 3), ...(video?.images || [])];

  async function ajouterVideo(f?: File) {
    setVideoMsg("");
    if (!f) return;
    if (f.size > VIDEO_MAX_MO * 1024 * 1024) return setVideoMsg(`Vidéo trop lourde (${VIDEO_MAX_MO} Mo max). Filmez moins longtemps.`);
    setVideoMsg("Préparation de la vidéo…");
    try {
      const { duree, images } = await imagesDeVideo(f);
      if (duree > VIDEO_MAX_S + 1) return setVideoMsg(`Vidéo trop longue (${Math.round(duree)} s) : ${VIDEO_MAX_S} secondes maximum.`);
      if (video) URL.revokeObjectURL(video.url);
      setVideo({ fichier: f, url: URL.createObjectURL(f), duree, images }); setVideoMsg("");
    } catch { setVideoMsg("Cette vidéo n'a pas pu être lue. Essayez de la filmer à nouveau."); }
  }

  // ---- Sauvegarde automatique ----
  const pret = useRef(false);
  const termine = useRef(false);
  const [repris, setRepris] = useState(false);
  useEffect(() => {
    const { data: b, photos: ph } = lireBrouillon(profil.id);
    // Brouillon d'une demande déjà publiée (ou supprimée) : on repart d'une page vierge
    if (b?.demandeId) {
      sb().from("demandes").select("statut").eq("id", b.demandeId as string).maybeSingle().then(({ data }) => {
        if (!data || data.statut !== "brouillon") { effacerBrouillon(profil.id); vider(); }
      });
    }
    if (b && aDuContenu(b)) {
      setEtape(Number(b.etape) || 1); setDescription(String(b.description || "")); setCp(String(b.cp || ""));
      setVille(String(b.ville || "")); setDelai(String(b.delai || DELAIS[2])); setQuestions((b.questions as Question[]) || []);
      setReponses((b.reponses as Record<string, string>) || {}); setTitre(String(b.titre || "")); setCahier((b.cahier as Cahier) || null);
      setMetiers((b.metiers as string[]) || []); setAdresse(String(b.adresse || ""));
      if (b.nom) setNom(String(b.nom)); if (b.tel) setTel(String(b.tel)); if (b.email) setEmail(String(b.email));
      setDemandeId((b.demandeId as string) || null); setPhotos(ph); setRepris(true);
    }
    pret.current = true;
  }, [profil.id]);
  useEffect(() => {
    if (!pret.current || termine.current) return;
    const t = setTimeout(() => !termine.current && ecrireBrouillon(profil.id, {
      etape, description, cp, ville, delai, questions, reponses, titre, cahier, metiers, nom, tel, email, adresse, demandeId,
    }), 400);
    return () => clearTimeout(t);
  }, [profil.id, etape, description, cp, ville, delai, questions, reponses, titre, cahier, metiers, nom, tel, email, adresse, demandeId]);
  useEffect(() => { if (pret.current && !termine.current) ecrirePhotos(profil.id, photos); }, [profil.id, photos]);

  function recommencer() {
    if (!confirm("Effacer la demande en cours et recommencer ?")) return;
    effacerBrouillon(profil.id);
    vider();
  }
  function nouvelleVierge() { effacerBrouillon(profil.id); vider(); }
  function vider() {
    setVideo(null); setVideoMsg("");
    setEtape(1); setDescription(""); setCp(""); setVille(""); setDelai(DELAIS[2]); setPhotos([]); setQuestions([]);
    setReponses({}); setTitre(""); setCahier(null); setMetiers([]); setAdresse(""); setDemandeId(null); setRepris(false); setErr("");
  }

  async function ajouterPhotos(files: FileList | null) {
    if (!files) return;
    const out: Photo[] = [];
    for (const f of Array.from(files).slice(0, 6 - photos.length)) {
      out.push({ grande: await compresser(f, 1600, 0.8), petite: await compresser(f, 800, 0.7) });
    }
    setPhotos([...photos, ...out]);
  }

  const [horsSujet, setHorsSujet] = useState("");

  async function versQuestions() {
    setErr(""); setHorsSujet("");
    if (description.trim().length < 15) return setErr("Décrivez un peu plus vos travaux (quelques phrases).");
    if (!departementDe(cp)) return setErr("Code postal invalide (5 chiffres).");
    setBusy("L'IA lit votre demande…");
    try {
      const r = await ia<{ est_travaux?: boolean; message?: string; titre: string; metiers: string[]; questions: Question[] }>("questions", { description, cp, photos: imagesIA(), video: !!video?.images.length });
      if (r.est_travaux === false) { setHorsSujet(r.message || ""); setBusy(""); return; }
      setTitre(r.titre || ""); setMetiers(r.metiers || []); setQuestions(r.questions || []); setEtape(2);
    } catch (e) { setErr(errMsg(e)); }
    setBusy("");
  }

  async function versCahier() {
    setErr(""); setHorsSujet(""); setBusy("L'IA rédige votre cahier des charges…");
    try {
      const rep = questions.map((q) => ({ question: q.question, reponse: reponses[q.id] || "" }));
      const c = await ia<Cahier & { hors_sujet?: boolean }>("cahier", { description, cp, delai, reponses: rep, photos: imagesIA(), video: !!video?.images.length });
      if (c.hors_sujet || !c.lots?.length) { setHorsSujet(c.resume || ""); setEtape(1); setBusy(""); return; }
      setCahier(c); setTitre(c.titre || titre);
      if (c.metiers?.length) setMetiers(c.metiers);
      setEtape(3);
    } catch (e) { setErr(errMsg(e)); }
    setBusy("");
  }

  async function publier() {
    setErr("");
    if (!metiers.length) return setErr("Choisissez au moins un métier.");
    if (!tel.trim() && !email.trim()) return setErr("Indiquez un téléphone ou un e-mail.");
    setBusy("Publication…");
    const s = sb();
    try {
      let id = demandeId;
      if (!id) {
        // Photos d'abord (dossier = identifiant du client)
        const chemins: string[] = [];
        for (const p of photos) {
          const path = `${profil.id}/${crypto.randomUUID()}.jpg`;
          const { error } = await s.storage.from("demandes").upload(path, dataUrlToBlob(p.grande), { contentType: "image/jpeg" });
          if (!error) chemins.push(path);
        }
        let cheminVideo: string | null = null;
        if (video) {
          setBusy("Envoi de la vidéo…");
          const ext = (video.fichier.name.split(".").pop() || "mp4").toLowerCase().slice(0, 4);
          const path = `${profil.id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await s.storage.from("demandes").upload(path, video.fichier, { contentType: video.fichier.type || "video/mp4" });
          if (!error) cheminVideo = path;
          setBusy("Publication…");
        }
        const { data, error } = await s.from("demandes").insert({
          titre, description, cp, ville, departement: departementDe(cp), delai, metiers, photos: chemins, video: cheminVideo,
          reponses: questions.map((q) => ({ question: q.question, reponse: reponses[q.id] || "" })),
          cahier: { ...cahier, signature: undefined }, ia_signature: cahier?.signature || null,
          budget_min: cahier?.budget_min || null, budget_max: cahier?.budget_max || null,
          artisan_invite: invite?.id || null,
        }).select("id").single();
        if (error) throw error;
        id = data.id as string; setDemandeId(id);
      } else {
        await s.from("demandes").update({ metiers, titre, description, ia_signature: cahier?.signature || null, artisan_invite: invite?.id || null }).eq("id", id);
      }
      const { error: e2 } = await s.from("demande_contacts").upsert({ demande_id: id, nom, telephone: tel, email, adresse });
      if (e2) throw e2;
      const { error: e3 } = await s.rpc("publier_demande", { p_id: id });
      if (e3) throw e3;
      termine.current = true;
      ecrireInvite(null);
      effacerBrouillon(profil.id);
      router.replace(`/client/demande/${id}?publiee=1`);
    } catch (e) { setErr(errMsg(e)); setBusy(""); }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-slate-400">Étape {etape} sur 4 · <span className="normal-case">💾 sauvegarde auto</span></p>
          {(etape > 1 || description) && <button type="button" className="text-xs text-slate-500 underline" onClick={recommencer}>Recommencer</button>}
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-flame transition-all" style={{ width: `${etape * 25}%` }} /></div>
      </div>

      {invite && (
        <div className="flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-sm text-orange-900">
          <p className="flex-1">⭐ Demande pour <b>{invite.nom}</b> : il sera prévenu en priorité (si vos travaux correspondent à ses métiers et à sa zone). D'autres artisans contrôlés pourront aussi vous répondre.</p>
          <button type="button" className="text-lg leading-none text-orange-400" aria-label="Retirer" onClick={() => { ecrireInvite(null); setInvite(null); }}>×</button>
        </div>
      )}

      {repris && (
        <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
          <p>↩️ Vous aviez commencé une demande : on l'a reprise là où vous l'aviez laissée.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-ghost flex-1 !py-2 text-sm" onClick={() => setRepris(false)}>Continuer celle-ci</button>
            <button type="button" className="btn-primary flex-1 !py-2 text-sm" onClick={nouvelleVierge}>＋ Nouvelle demande</button>
          </div>
        </div>
      )}

      {etape === 1 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold">Décrivez vos travaux</h1>
          <div>
            <label className="label">Ce que vous voulez faire</label>
            <textarea className="input min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : je veux refaire ma salle de bain de 6 m² : remplacer la baignoire par une douche à l'italienne, changer le meuble vasque et refaire la faïence." />
            <p className="mt-1 text-xs text-slate-500">🎤 Astuce : utilisez le micro du clavier de votre téléphone pour dicter.</p>
          </div>
          <CpVille cp={cp} ville={ville} onChange={(c, v) => { setCp(c); setVille(v); }} />
          <div>
            <label className="label">Quand ?</label>
            <div className="flex flex-wrap gap-1.5">
              {DELAIS.map((d) => (
                <button key={d} type="button" onClick={() => setDelai(d)}
                  className={`chip border py-1.5 ${delai === d ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Photos et vidéo (facultatif)</label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.petite} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-ink text-xs text-white">×</button>
                </div>
              ))}
              {photos.length < 6 && (
                <>
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-flame bg-flame-light text-2xl">
                    📷<span className="text-[10px] font-semibold text-flame">Prendre</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { ajouterPhotos(e.target.files); e.target.value = ""; }} />
                  </label>
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-2xl text-slate-400">
                    🖼️<span className="text-[10px] font-semibold">Galerie</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { ajouterPhotos(e.target.files); e.target.value = ""; }} />
                  </label>
                </>
              )}
              {video ? (
                <div className="relative">
                  <video src={video.url} className="h-20 w-20 rounded-xl bg-black object-cover" muted playsInline />
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">🎥 {Math.round(video.duree)} s</span>
                  <button type="button" onClick={() => { URL.revokeObjectURL(video.url); setVideo(null); }}
                    className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-ink text-xs text-white">×</button>
                </div>
              ) : (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-flame bg-flame-light text-2xl">
                  🎥<span className="text-[10px] font-semibold text-flame">Vidéo</span>
                  <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => { ajouterVideo(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">🎥 Une vidéo de {VIDEO_MAX_S} s maximum : faites le tour de la pièce en commentant, l'IA et les artisans comprendront mieux.</p>
            {videoMsg && <p className="mt-1 text-xs font-semibold text-amber-700">{videoMsg}</p>}
          </div>
          {horsSujet && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">🛠️ Rénolien sert à trouver un artisan pour vos travaux</p>
              <p className="mt-1">{horsSujet}</p>
              <p className="mt-2">Décrivez ce que vous voulez faire chez vous (plomberie, électricité, peinture, salle de bain…). Par exemple : <i>« Remplacer mon chauffe-eau de 200 L dans le garage »</i>.</p>
            </div>
          )}
          <Erreur msg={err} />
          <button className="btn-primary w-full py-3.5" disabled={!!busy} onClick={versQuestions}>{busy || "Continuer →"}</button>
        </div>
      )}

      {etape === 2 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold">Quelques précisions</h1>
          <p className="text-sm text-slate-600">Ces réponses aident les artisans à chiffrer juste. Laissez vide si vous ne savez pas.</p>
          {questions.map((q) => (
            <div key={q.id} className="card space-y-2">
              <p className="font-semibold">{q.question}</p>
              {q.type === "choix" && q.options?.length ? (
                <>
                  <p className="text-xs text-slate-500">Plusieurs réponses possibles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([...q.options, "Je ne sais pas"])).map((o) => {
                      const choisis = choixDe(reponses[q.id]);
                      const actif = choisis.includes(o);
                      return (
                        <button key={o} type="button" onClick={() => setReponses({ ...reponses, [q.id]: basculerChoix(reponses[q.id], o) })}
                          className={`chip border py-1.5 ${actif ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700"}`}>{actif && "✓ "}{o}</button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <input className="input" inputMode={q.type === "nombre" ? "decimal" : "text"} value={reponses[q.id] || ""}
                    onChange={(e) => setReponses({ ...reponses, [q.id]: e.target.value })} />
                  {q.type === "nombre" && q.unite && <span className="shrink-0 text-sm text-slate-500">{q.unite}</span>}
                </div>
              )}
            </div>
          ))}
          <Erreur msg={err} />
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={!!busy} onClick={() => setEtape(1)}>←</button>
            <button className="btn-primary flex-1 py-3.5" disabled={!!busy} onClick={versCahier}>{busy || "Générer mon cahier des charges →"}</button>
          </div>
        </div>
      )}

      {etape === 3 && cahier && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold">{titre}</h1>
          <div className="card"><CahierVue cahier={cahier} /></div>
          <div className="card space-y-2">
            <label className="label">Artisans recherchés</label>
            <TradePicker value={metiers} onChange={setMetiers} />
          </div>
          <p className="text-xs text-slate-500">Le budget est une estimation de l'IA, pour vous donner un ordre d'idée. Les artisans font leur propre devis.</p>
          <Erreur msg={err} />
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setEtape(2)}>←</button>
            <button className="btn-ghost flex-1" disabled={!!busy} onClick={versCahier}>{busy ? "…" : "↻ Refaire"}</button>
            <button className="btn-primary flex-1" onClick={() => { setErr(""); setEtape(4); }}>C'est bon →</button>
          </div>
        </div>
      )}

      {etape === 4 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold">Vos coordonnées</h1>
          <p className="rounded-xl bg-green-50 p-3 text-sm text-green-900">🔒 Elles restent cachées. Seul l'artisan que vous choisirez les recevra.</p>
          <div><label className="label">Nom</label><input className="input" value={nom} onChange={(e) => setNom(e.target.value)} /></div>
          <div><label className="label">Téléphone</label><input className="input" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></div>
          <div><label className="label">E-mail</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <AdresseAuto label="Adresse du chantier" value={adresse} onChange={setAdresse} cp={cp} placeholder={`Numéro et rue, ${cp} ${ville}`} />
          <p className="text-xs text-slate-500">Votre demande reste ouverte {delai === "urgent" ? "48" : "72"} h ou jusqu'à 5 offres.</p>
          <Erreur msg={err} />
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={!!busy} onClick={() => setEtape(3)}>←</button>
            <button className="btn-brand flex-1 py-3.5" disabled={!!busy} onClick={publier}>{busy || "Publier ma demande"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
