import { dateFr, decennaleControlee, rcproValide } from "@/lib/decennale";
import type { Artisan } from "@/lib/mer";

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
  if (a.fondateur) badges.push(["🚀 Fondateur", "bg-orange-100 text-orange-800"]);
  if (!badges.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {badges.map(([t, c, title]) => <span key={t} title={title} className={`chip !px-2 !py-0.5 text-[11px] ${c}`}>{t}</span>)}
    </span>
  );
}
