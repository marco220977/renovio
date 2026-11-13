"use client";
// Admin : « Voir comme cet artisan » — ce que l'entreprise voit dans son espace, en lecture seule.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { dateFr, eur } from "@/lib/calc";
import { joursDecennale } from "@/lib/decennale";
import { Metiers } from "@/components/Vues";
import { FORMULES, STATUT_OFFRE, errMsg, tempsRestant, type Artisan } from "@/lib/mer";

type Vue = {
  artisan: Artisan & { fondateur?: boolean; rge?: boolean; raison_sociale?: string };
  profil: { nom: string; email: string; telephone: string; notif_email: boolean; notif_push: boolean } | null;
  test: boolean;
  quota: { abonnement: string; quota: number | null; utilise: number; bonus: number; attente: number; plafond: number | null; en_pause: number; fondateur?: boolean; lancement?: boolean; lancement_fin?: string } | null;
  demandes: { id: string; titre: string; description: string; ville: string; cp: string; delai: string; metiers: string[]; ferme_le: string; budget_min: number; budget_max: number; resume: string }[];
  offres: { id: string; statut: string; total_ttc: number; en_pause: boolean; created_at: string; titre: string; ville: string; cp: string }[];
  tarifs: { metier: string; libelle: string; unite: string; prix_ht: number }[];
  notifications: { titre: string; created_at: string; email_ok: boolean | null; push_ok: number | null }[];
  telephones: number;
};

const Titre = ({ children }: { children: React.ReactNode }) => <h2 className="mt-2 text-lg font-extrabold">{children}</h2>;

export default function VoirCommeArtisan() {
  const { id } = useParams<{ id: string }>();
  const [v, setV] = useState<Vue | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    sb().rpc("voir_comme_artisan", { p_artisan: id }).then(({ data, error }) => {
      if (error) setErr(errMsg(error)); else setV(data as Vue);
    });
  }, [id]);

  if (err) return <main className="mx-auto max-w-2xl p-4"><p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p><Link href="/admin" className="btn-ghost mt-3 w-full">← Retour à l'admin</Link></main>;
  if (!v) return <div className="flex min-h-screen items-center justify-center text-slate-400">Chargement…</div>;

  const a = v.artisan, q = v.quota;
  const jd = joursDecennale(a);
  const manque = [
    !a.departements?.length && "départements", !a.metiers?.length && "métiers",
    (a.siret || "").replace(/\D/g, "").length !== 14 && "SIRET", !a.decennale && "assurance décennale",
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto max-w-2xl space-y-3 p-4 pb-16">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 bg-slate-900 px-4 py-2 text-sm text-white">
        <span>👁️ Vue de <b>{a.raison_sociale || "l'artisan"}</b> · lecture seule</span>
        <Link href="/admin" className="shrink-0 rounded-lg bg-white/15 px-3 py-1 font-semibold">← Admin</Link>
      </div>

      <div className="card space-y-1 text-sm">
        <p className="text-lg font-extrabold">{a.raison_sociale || "(sans nom)"} {v.test && <span className="chip bg-slate-200 text-slate-700">🧪 Test</span>}</p>
        <p className="text-slate-600">{v.profil?.nom} · {v.profil?.email} · {v.profil?.telephone || a.telephone || "pas de téléphone"}</p>
        <p className="text-slate-600">📍 {a.ville} · dép. {a.departements?.join(", ") || "—"}</p>
        <Metiers ids={a.metiers || []} />
        <p className="flex flex-wrap gap-1 pt-1">
          {a.verifie ? <span className="chip bg-green-100 text-green-800">✔ Vérifié</span> : <span className="chip bg-amber-100 text-amber-800">À vérifier</span>}
          {a.rge && <span className="chip bg-emerald-100 text-emerald-800">RGE</span>}
          {a.fondateur && <span className="chip bg-orange-100 text-orange-800">🚀 Fondateur</span>}
          <span className="chip bg-slate-100 text-slate-700">{v.telephones ? `🔔 notifications téléphone (${v.telephones})` : "🔕 notifications téléphone non activées"}</span>
          {v.profil?.notif_email === false && <span className="chip bg-slate-100 text-slate-700">e-mails coupés</span>}
        </p>
      </div>

      {/* Bandeaux tels que l'artisan les voit */}
      {jd !== null && jd <= 30 && (
        <p className={`card text-sm ${jd < 0 ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
          {jd < 0 ? "⛔ Assurance décennale expirée : le badge « Vérifié » est retiré." : `⏰ Assurance décennale : expire dans ${jd} jour${jd > 1 ? "s" : ""}.`}
        </p>
      )}
      {manque.length > 0 && <p className="card border-amber-300 bg-amber-50 text-sm text-amber-900">⚠️ Il voit : « Pour voir les demandes et y répondre, complétez {manque.join(", ")}. »</p>}
      {q && (
        <p className="card !p-3 text-sm">
          {q.fondateur && q.lancement
            ? <>🚀 Membre fondateur : <b>gratuit et illimité</b> jusqu'au {q.lancement_fin ? dateFr(q.lancement_fin) : "la fin du lancement"}.</>
            : <>Formule <b>{FORMULES.find((f) => f.id === q.abonnement)?.nom || "Découverte"}</b> · {q.quota === null ? "clients illimités" : `${Math.max(0, q.quota - q.utilise)} client(s) restant(s) ce mois-ci`}{q.bonus ? ` + ${q.bonus} offert(s)` : ""}</>}
          {!!q.en_pause && <span className="mt-1 block text-red-700">🔒 {q.en_pause} offre(s) en pause (clients du mois atteints)</span>}
        </p>
      )}

      <Titre>📥 Demandes près de chez lui ({v.demandes.length})</Titre>
      {v.demandes.length === 0 && <p className="card text-center text-sm text-slate-600">📭 Aucune nouvelle demande pour ses métiers dans ses départements.</p>}
      {v.demandes.map((d) => (
        <div key={d.id} className="card space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold">{d.titre || d.description?.slice(0, 60)}</p>
            <span className="chip shrink-0 bg-blue-100 text-blue-800">⏱ {tempsRestant(d.ferme_le)}</span>
          </div>
          <p className="text-sm text-slate-500">📍 {d.ville || ""} {d.cp} · {d.delai}</p>
          <p className="line-clamp-2 text-sm text-slate-600">{d.resume || d.description}</p>
          <Metiers ids={d.metiers} />
          {d.budget_max ? <p className="text-xs text-slate-500">Estimation IA : {eur(d.budget_min)} – {eur(d.budget_max)} TTC</p> : null}
        </div>
      ))}

      <Titre>📄 Ses offres ({v.offres.length})</Titre>
      {v.offres.length === 0 && <p className="text-sm text-slate-500">Aucune offre envoyée pour l'instant.</p>}
      {v.offres.map((o) => (
        <div key={o.id} className="card flex items-center justify-between gap-2 !p-3 text-sm">
          <span><b>{o.titre || "Demande"}</b> <span className="text-slate-500">· {o.ville} {o.cp}</span><br />
            <span className={`chip mt-1 ${STATUT_OFFRE[o.statut]?.[1] || ""}`}>{STATUT_OFFRE[o.statut]?.[0] || o.statut}</span>
            {o.en_pause && <span className="chip ml-1 bg-red-100 text-red-700">En pause</span>}</span>
          <b className="shrink-0">{eur(o.total_ttc)}</b>
        </div>
      ))}

      <Titre>💶 Ses tarifs ({v.tarifs.length})</Titre>
      {v.tarifs.length === 0 ? <p className="text-sm text-slate-500">Aucun tarif enregistré : ses devis ne seront pas préremplis.</p> : (
        <div className="card divide-y divide-slate-100 !p-3 text-sm">
          {v.tarifs.map((t, i) => <p key={i} className="flex justify-between gap-2 py-1"><span>{t.libelle}</span><b className="shrink-0">{eur(t.prix_ht)} HT / {t.unite}</b></p>)}
        </div>
      )}

      <Titre>🔔 Dernières notifications reçues</Titre>
      {v.notifications.length === 0 ? <p className="text-sm text-slate-500">Aucune notification.</p> : (
        <div className="card divide-y divide-slate-100 !p-3 text-sm">
          {v.notifications.map((n, i) => (
            <p key={i} className="py-1">{n.titre}<br />
              <span className="text-xs text-slate-500">{new Date(n.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} · {n.email_ok ? "✉️ e-mail reçu" : "✉️ —"} · {n.push_ok ? "📱 téléphone" : "📱 —"}</span></p>
          ))}
        </div>
      )}
    </main>
  );
}
