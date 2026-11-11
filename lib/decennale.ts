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
