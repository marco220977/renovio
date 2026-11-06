// Lecture des tarifs fournisseurs (Excel / CSV) : détection de l'en-tête et des colonnes.

export type Field = "ref" | "label" | "unit" | "price" | "category" | "brand";
export const FIELD_LABEL: Record<Field, string> = {
  ref: "Référence", label: "Désignation", price: "Prix", unit: "Unité", category: "Famille", brand: "Marque",
};
export type Mapping = Partial<Record<Field, number>>;
export type Raw = { ref: string; label: string; unit: string; price: number; category: string };

export const SUPPLIERS = [
  "Cedeo", "Point P", "Rexel", "Sonepar", "CGED", "Yesss Électrique", "Brossette", "Richardson", "Prolians",
  "Gedimat", "Bigmat", "Tout Faire", "Leroy Merlin Pro", "Brico Dépôt", "Castorama", "Würth", "Frans Bonhomme",
  "Plateforme du Bâtiment", "Descours & Cabaud", "Wolseley", "Comptoir Lyonnais", "Partedis", "Chausson Matériaux",
];

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const KEYS: Record<Field, RegExp> = {
  ref: /^(ref|reference|code|code article|article|n° article|no article|sku|ean|code produit|ref\.? fournisseur|ref\.? fabricant)\b|reference|code article|code produit/,
  label: /designation|libelle|description|produit|intitule|nom/,
  price: /prix|tarif|p\.?u\.?|montant|net|ht|public|ppi|ppht/,
  unit: /^(u|unite|unit|uv|uc|conditionnement|cdt|qte unite|unite de vente)\b|unite/,
  category: /famille|categorie|rubrique|gamme|sous-famille|chapitre|groupe/,
  brand: /marque|fabricant|fournisseur d.origine|brand/,
};

/** Nombre au format français ou anglais : « 1 234,56 € » → 1234.56 */
export function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").replace(/[€\s ]/g, "").replace(/HT|TTC/gi, "");
  if (!s) return NaN;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else s = s.replace(",", ".");
  return Number(s);
}

/** Trouve la ligne d'en-tête : la première des 30 premières lignes qui contient au moins 2 libellés reconnus */
export function findHeader(rows: unknown[][]): number {
  let best = 0, bestScore = 0;
  rows.slice(0, 30).forEach((r, i) => {
    const score = (Object.keys(KEYS) as Field[]).filter((f) => r.some((c) => typeof c === "string" && KEYS[f].test(norm(c)))).length;
    if (score > bestScore) { best = i; bestScore = score; }
  });
  return bestScore >= 2 ? best : -1;
}

/** Associe chaque champ à une colonne d'après l'en-tête ; à défaut, d'après le contenu */
export function guessMapping(header: unknown[], sample: unknown[][]): Mapping {
  const m: Mapping = {};
  const used = new Set<number>();
  const order: Field[] = ["label", "ref", "category", "brand", "unit", "price"];
  for (const f of order) {
    const cands = header.map((h, i) => [i, norm(h)] as const).filter(([i, h]) => h && !used.has(i) && KEYS[f].test(h));
    if (!cands.length) continue;
    // pour le prix, préférer « net » puis « HT » puis le reste, et une colonne vraiment numérique
    let pick = cands[0][0];
    if (f === "price") {
      const num = cands.filter(([i]) => sample.filter((r) => toNumber(r[i]) > 0).length >= Math.min(3, sample.length));
      const pool = num.length ? num : cands;
      pick = (pool.find(([, h]) => /net|remise/.test(h)) || pool.find(([, h]) => /ht/.test(h) && !/ttc/.test(h)) || pool[0])[0];
    }
    m[f] = pick; used.add(pick);
  }
  // sans en-tête lisible : désignation = colonne texte la plus longue, prix = dernière colonne numérique
  if (m.label === undefined && sample.length) {
    const width = Math.max(...sample.map((r) => r.length));
    let li = -1, ll = 0, pi = -1;
    for (let i = 0; i < width; i++) {
      if (used.has(i)) continue;
      const vals = sample.map((r) => r[i]);
      const avg = vals.reduce((s: number, v) => s + (typeof v === "string" ? v.length : 0), 0) / vals.length;
      if (avg > ll) { ll = avg; li = i; }
      if (vals.filter((v) => toNumber(v) > 0).length >= sample.length * 0.6) pi = i;
    }
    if (li >= 0) m.label = li;
    if (m.price === undefined && pi >= 0 && pi !== li) m.price = pi;
  }
  return m;
}

/** Transforme les lignes du tableau en articles, d'après le choix des colonnes */
export function toItems(rows: unknown[][], m: Mapping): Raw[] {
  const get = (r: unknown[], f: Field) => (m[f] === undefined ? "" : String(r[m[f]!] ?? "").trim());
  return rows.map((r) => {
    const brand = get(r, "brand");
    let label = get(r, "label");
    if (brand && label && !norm(label).includes(norm(brand))) label = `${brand} — ${label}`;
    return { ref: get(r, "ref"), label, unit: normUnit(get(r, "unit")), price: m.price === undefined ? NaN : toNumber(r[m.price]), category: get(r, "category") };
  }).filter((x) => x.label && x.price > 0);
}

export function normUnit(u: string) {
  const s = norm(u);
  if (!s) return "u";
  if (/^(u|un|unite|pce|piece|pc|ea|st)$/.test(s)) return "u";
  if (/^(m|ml|metre|metres)$/.test(s)) return "ml";
  if (/^(m2|m²)$/.test(s)) return "m²";
  if (/^(m3|m³)$/.test(s)) return "m³";
  if (/^(l|litre|lt)$/.test(s)) return "l";
  return u.slice(0, 12);
}

/** Prix d'achat après remise, prix de vente après coefficient */
export function prices(price: number, remisePct: number, coef: number) {
  const cost = Math.round(price * (1 - (remisePct || 0) / 100) * 100) / 100;
  return { cost, sale: Math.round(cost * (coef || 1) * 100) / 100 };
}
