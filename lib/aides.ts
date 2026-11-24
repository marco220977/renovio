// Estimation MaPrimeRénov' « par geste » — barème en vigueur depuis le 1er septembre 2026 (décret n° 2026-822).
// Le parcours par geste ne finance plus que : PAC air/eau, PAC géothermique ou solarothermique,
// raccordement à un réseau de chaleur et dépose d'une cuve à fioul. Revenus supérieurs : non éligibles.
// Plafonds de ressources (revenu fiscal de référence) au 1er janvier 2026. À mettre à jour chaque année.
import type { Line } from "./types";
import type { Cahier } from "./mer";

export type Profil = "bleu" | "jaune" | "violet" | "rose";
export const PROFILS: Record<Profil, { nom: string; couleur: string }> = {
  bleu: { nom: "très modestes (MaPrimeRénov' Bleu)", couleur: "bg-blue-100 text-blue-900" },
  jaune: { nom: "modestes (MaPrimeRénov' Jaune)", couleur: "bg-yellow-100 text-yellow-900" },
  violet: { nom: "intermédiaires (MaPrimeRénov' Violet)", couleur: "bg-purple-100 text-purple-900" },
  rose: { nom: "supérieurs (MaPrimeRénov' Rose)", couleur: "bg-pink-100 text-pink-900" },
};

// [1 pers., 2, 3, 4, 5, par personne en plus] pour bleu, jaune, violet
const IDF = { bleu: [24031, 35270, 42357, 49455, 56580, 7116], jaune: [29253, 42933, 51564, 60208, 68877, 8663], violet: [40851, 60051, 71846, 84562, 96817, 12257] };
const AUTRES = { bleu: [17363, 25393, 30540, 35676, 40835, 5151], jaune: [22259, 32553, 39148, 45735, 52348, 6598], violet: [31185, 45842, 55196, 64550, 73907, 9357] };
const DEPS_IDF = ["75", "77", "78", "91", "92", "93", "94", "95"];

const plafond = (t: number[], n: number) => (n <= 5 ? t[n - 1] : t[4] + (n - 5) * t[5]);

export function profilDe(personnes: number, rfr: number, departement: string): Profil {
  const t = DEPS_IDF.includes(departement) ? IDF : AUTRES;
  const n = Math.max(1, Math.round(personnes));
  if (rfr <= plafond(t.bleu, n)) return "bleu";
  if (rfr <= plafond(t.jaune, n)) return "jaune";
  if (rfr <= plafond(t.violet, n)) return "violet";
  return "rose";
}

export type Geste = { id: string; nom: string; montants: Record<Profil, number>; motif: RegExp; exclu?: RegExp };
export const GESTES: Geste[] = [
  { id: "pac_geo", nom: "Pompe à chaleur géothermique ou solarothermique", montants: { bleu: 11000, jaune: 9000, violet: 6000, rose: 0 },
    motif: /g[ée]otherm|solarotherm|pac eau.?eau|eau.?eau/i },
  { id: "pac_air_eau", nom: "Pompe à chaleur air/eau", montants: { bleu: 5000, jaune: 4000, violet: 3000, rose: 0 },
    motif: /(pompe [àa] chaleur|\bpac\b)[^.\n]{0,60}(air.?eau|air\/eau|hydraulique|radiateurs?|plancher chauffant|chauffage central)|(air.?eau|air\/eau)[^.\n]{0,40}(pompe [àa] chaleur|\bpac\b)|\bpac\b[^.\n]{0,20}(bi.?bloc|monobloc|split)/i,
    exclu: /air.?air|air\/air|climatis|r[ée]versible air/i },
  { id: "reseau", nom: "Raccordement à un réseau de chaleur", montants: { bleu: 1200, jaune: 800, violet: 400, rose: 0 }, motif: /r[ée]seau de chaleur/i },
  { id: "cuve", nom: "Dépose d'une cuve à fioul", montants: { bleu: 1200, jaune: 800, violet: 400, rose: 0 },
    motif: /(d[ée]pose|retrait|enl[eè]vement|neutralisation|d[ée]mont\w*)[^.\n]{0,40}cuve|cuve[^.\n]{0,30}fioul/i },
];

const texteLignes = (l: Line[] = []) => l.filter((x) => x.kind !== "section").map((x) => `${x.label} ${x.description || ""}`).join("\n");
const texteCahier = (c?: Cahier | null) => (c ? [c.titre, c.resume, ...c.lots.flatMap((l) => [l.titre, ...l.postes.map((p) => `${p.designation} ${p.precisions || ""}`)])].join("\n") : "");

/** Gestes aidés repérés dans un texte (une PAC géothermique n'est pas comptée en plus comme PAC air/eau) */
export function gestesDans(texte: string): Geste[] {
  const lignes = texte.split("\n");
  const g = GESTES.filter((x) => lignes.some((l) => x.motif.test(l) && !(x.exclu && x.exclu.test(l) && !/air.?eau|air\/eau/i.test(l))));
  return g.some((x) => x.id === "pac_geo") ? g.filter((x) => x.id !== "pac_air_eau") : g;
}
export const gestesOffre = (lignes: Line[]) => gestesDans(texteLignes(lignes));
export const gestesDemande = (cahier?: Cahier | null, description = "") => gestesDans(`${texteCahier(cahier)}\n${description}`);
export const montantAide = (gestes: Geste[], p: Profil) => gestes.reduce((t, g) => t + g.montants[p], 0);

// Profil retenu par le client sur cet appareil (simple confort, jamais envoyé au serveur)
const CLE = "renolien_profil_aides";
export function profilMemorise(): { personnes: number; rfr: number } | null {
  try { const v = JSON.parse(localStorage.getItem(CLE) || "null"); return v && v.personnes && v.rfr >= 0 ? v : null; } catch { return null; }
}
export function memoriserProfil(v: { personnes: number; rfr: number } | null) {
  try { if (v) localStorage.setItem(CLE, JSON.stringify(v)); else localStorage.removeItem(CLE); } catch { /* navigation privée */ }
}
