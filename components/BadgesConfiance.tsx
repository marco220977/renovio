import { dateFr, decennaleControlee, rcproValide } from "@/lib/decennale";
import type { Artisan } from "@/lib/mer";

/** Années complètes d'ancienneté sur Rénolien (badge « Partenaire fidèle ») */
export function anneesFidelite(a?: Artisan): number {
  if (!a?.created_at || !a.verifie || (a.statut && a.statut !== "actif")) return 0;
  const debut = new Date(a.created_at), now = new Date();
  let n = now.getFullYear() - debut.getFullYear();
  if (now.getMonth() < debut.getMonth() || (now.getMonth() === debut.getMonth() && now.getDate() < debut.getDate())) n--;
  return Math.max(0, n);
}

/** Badges de confiance affichés aux clients : uniquement ce que Rénolien a réellement contrôlé */
export default function BadgesConfiance({ a, dates = false }: { a?: Artisan; dates?: boolean }) {
  if (!a) return null;
  const dec = decennaleControlee(a), rc = rcproValide(a);
  const siret = (a.siret || "").replace(/\D/g, "").length === 14;
  const badges: [string, string, string?][] = [];
  if (a.verifie) badges.push(["✔ Vérifié par Rénolien", "bg-green-100 text-green-800"]);
  if (siret) badges.push(["SIRET ✓", "bg-slate-100 text-slate-700", "Entreprise active au répertoire INSEE"]);
  if (dec) badges.push([dates ? `Décennale ✓ jusqu'au ${dateFr(dec)}` : "Décennale ✓", "bg-blue-100 text-blue-800", "Attestation lue et contrôlée"]);
  if (rc) badges.push([dates ? `RC Pro ✓ jusqu'au ${dateFr(rc)}` : "RC Pro ✓", "bg-indigo-100 text-indigo-800", "Attestation lue et contrôlée"]);
  if (a.rge) badges.push(["🌿 RGE", "bg-emerald-100 text-emerald-800", "Vérifié au registre officiel ADEME"]);
  const ans = anneesFidelite(a);
  if (ans >= 1) badges.push([`${ans >= 3 ? "🥇" : ans === 2 ? "🥈" : "🥉"} Partenaire fidèle · ${ans} an${ans > 1 ? "s" : ""}`,
    ans >= 3 ? "bg-yellow-100 text-yellow-800" : ans === 2 ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-900", "Inscrit sur Rénolien et actif depuis au moins " + ans + " an" + (ans > 1 ? "s" : "")]);
  if (a.fondateur) badges.push(["🚀 Fondateur", "bg-orange-100 text-orange-800"]);
  if (!badges.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {badges.map(([t, c, title]) => <span key={t} title={title} className={`chip !px-2 !py-0.5 text-[11px] ${c}`}>{t}</span>)}
    </span>
  );
}
