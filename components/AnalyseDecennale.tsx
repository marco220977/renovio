import { dateFr } from "@/lib/decennale";

/** Résultat de la lecture de l'attestation décennale par l'IA */
export default function AnalyseDecennale({ an, admin = false }: { an: any; admin?: boolean }) {
  if (!an) return null;
  const alertes: string[] = an.alertes || [], ok: string[] = an.ok || [];
  return (
    <div className={`rounded-xl p-3 text-sm ${alertes.length ? "bg-amber-50 text-amber-950" : "bg-green-50 text-green-900"}`}>
      <p className="font-bold">{alertes.length ? "⚠️ Attestation à vérifier" : "✔ Attestation contrôlée automatiquement"}</p>
      {(an.assureur || an.numero_contrat) && <p className="mt-1">{an.assureur}{an.numero_contrat && ` · n° ${an.numero_contrat}`}</p>}
      {(an.date_debut || an.date_fin) && <p>Du {dateFr(an.date_debut) || "?"} au {dateFr(an.date_fin) || "?"}</p>}
      {ok.length > 0 && <ul className="mt-1 text-green-800">{ok.map((x) => <li key={x}>✓ {x}</li>)}</ul>}
      {alertes.length > 0 && <ul className="mt-1 text-red-700">{alertes.map((x) => <li key={x}>✗ {x}</li>)}</ul>}
      {admin && an.activites?.length > 0 && <p className="mt-1 text-xs text-slate-600">Activités : {an.activites.join(" · ")}</p>}
      {admin && an.zone && <p className="text-xs text-slate-600">Zone : {an.zone}</p>}
      {admin && an.badge_retire_le && <p className="mt-1 text-xs font-semibold text-red-700">Badge retiré le {dateFr(an.badge_retire_le)} : {an.badge_retire_motif}</p>}
      <p className="mt-1 text-xs opacity-70">Lu par l'IA le {dateFr(an.analyse_le)}. Contrôle indicatif : seul l'assureur peut confirmer que le contrat est en cours.</p>
    </div>
  );
}
