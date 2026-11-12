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
import { DELAIS, compresser, dataUrlToBlob, departementDe, errMsg, ia, type Cahier, type Question } from "@/lib/mer";

type Photo = { grande: string; petite: string };

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

  // ---- Sauvegarde automatique ----
  const pret = useRef(false);
  const [repris, setRepris] = useState(false);
  useEffect(() => {
    const { data: b, photos: ph } = lireBrouillon(profil.id);
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
    if (!pret.current) return;
    const t = setTimeout(() => ecrireBrouillon(profil.id, {
      etape, description, cp, ville, delai, questions, reponses, titre, cahier, metiers, nom, tel, email, adresse, demandeId,
    }), 400);
    return () => clearTimeout(t);
  }, [profil.id, etape, description, cp, ville, delai, questions, reponses, titre, cahier, metiers, nom, tel, email, adresse, demandeId]);
  useEffect(() => { if (pret.current) ecrirePhotos(profil.id, photos); }, [profil.id, photos]);

  function recommencer() {
    if (!confirm("Effacer la demande en cours et recommencer ?")) return;
    effacerBrouillon(profil.id);
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

  async function versQuestions() {
    setErr("");
    if (description.trim().length < 15) return setErr("Décrivez un peu plus vos travaux (quelques phrases).");
    if (!departementDe(cp)) return setErr("Code postal invalide (5 chiffres).");
    setBusy("L'IA lit votre demande…");
    try {
      const r = await ia<{ titre: string; metiers: string[]; questions: Question[] }>("questions", { description, cp, photos: petites() });
      setTitre(r.titre || ""); setMetiers(r.metiers || []); setQuestions(r.questions || []); setEtape(2);
    } catch (e) { setErr(errMsg(e)); }
    setBusy("");
  }

  async function versCahier() {
    setErr(""); setBusy("L'IA rédige votre cahier des charges…");
    try {
      const rep = questions.map((q) => ({ question: q.question, reponse: reponses[q.id] || "" }));
      const c = await ia<Cahier>("cahier", { description, cp, delai, reponses: rep, photos: petites() });
      if (!c.lots?.length) throw new Error("Le cahier des charges est vide, réessayez.");
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
        const { data, error } = await s.from("demandes").insert({
          titre, description, cp, ville, departement: departementDe(cp), delai, metiers, photos: chemins,
          reponses: questions.map((q) => ({ question: q.question, reponse: reponses[q.id] || "" })),
          cahier, budget_min: cahier?.budget_min || null, budget_max: cahier?.budget_max || null,
        }).select("id").single();
        if (error) throw error;
        id = data.id as string; setDemandeId(id);
      } else {
        await s.from("demandes").update({ metiers, titre }).eq("id", id);
      }
      const { error: e2 } = await s.from("demande_contacts").upsert({ demande_id: id, nom, telephone: tel, email, adresse });
      if (e2) throw e2;
      const { error: e3 } = await s.rpc("publier_demande", { p_id: id });
      if (e3) throw e3;
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

      {repris && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">↩️ Votre demande en cours a été reprise là où vous l'aviez laissée.</p>}

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
            <label className="label">Photos (facultatif, 6 max)</label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.petite} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-ink text-xs text-white">×</button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-2xl text-slate-400">
                  📷<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => ajouterPhotos(e.target.files)} />
                </label>
              )}
            </div>
          </div>
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
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set([...q.options, "Je ne sais pas"])).map((o) => (
                    <button key={o} type="button" onClick={() => setReponses({ ...reponses, [q.id]: o })}
                      className={`chip border py-1.5 ${reponses[q.id] === o ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700"}`}>{o}</button>
                  ))}
                </div>
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
