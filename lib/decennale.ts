// Validité de l'assurance décennale (même règle que la base : date lue par l'IA, sinon date saisie)
export const dateFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

export function finDecennale(a: { decennale_analyse?: any; decennale_fin?: string | null } | null | undefined): string | null {
  return a?.decennale_analyse?.date_fin || a?.decennale_fin || null;
}

/** Jours restants avant la fin de l'assurance (négatif si expirée, null si inconnue) */
export function joursDecennale(a: Parameters<typeof finDecennale>[0]): number | null {
  const f = finDecennale(a);
  if (!f) return null;
  const fin = new Date(f + (f.length === 10 ? "T23:59:59" : ""));
  return Math.ceil((fin.getTime() - Date.now()) / 86400000);
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Décennale lue par l'IA et encore valable : affichée « Décennale contrôlée » aux clients */
export function decennaleControlee(a: { decennale_analyse?: any; decennale_fin?: string | null } | null | undefined): string | null {
  const f = finDecennale(a);
  return a?.decennale_analyse && f && f >= aujourdhui() ? f : null;
}

/** RC Pro lue par l'IA, sans alerte bloquante et encore valable */
export function rcproValide(a: { rcpro_analyse?: any; rcpro_fin?: string | null } | null | undefined): string | null {
  const f = a?.rcpro_analyse?.date_fin || a?.rcpro_fin;
  return a?.rcpro_analyse?.valide && f && f >= aujourdhui() ? f : null;
}
