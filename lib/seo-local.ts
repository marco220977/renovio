// Contenu local des pages « métier × ville » : position, type de bâti, conseils adaptés, villes réellement proches.
// Objectif : que chaque page ville apporte une information propre (et ne soit pas un doublon aux yeux de Google).
import { VILLES_SEO, aVille, type MetierSeo, type VilleSeo } from "@/lib/seo";
import { CATALOGUE } from "@/data/catalogue";

export type Habitat = "collectif" | "mixte" | "pavillonnaire" | "recent" | "ancien";

const LOCAL: Record<string, { lat: number; lng: number; h: Habitat }> = {
  paris: { lat: 48.8566, lng: 2.3522, h: "collectif" },
  creteil: { lat: 48.7904, lng: 2.4556, h: "mixte" },
  "vitry-sur-seine": { lat: 48.7875, lng: 2.3928, h: "mixte" },
  "champigny-sur-marne": { lat: 48.8172, lng: 2.5156, h: "mixte" },
  "saint-maur-des-fosses": { lat: 48.7939, lng: 2.4936, h: "pavillonnaire" },
  "ivry-sur-seine": { lat: 48.8156, lng: 2.3849, h: "collectif" },
  "maisons-alfort": { lat: 48.8058, lng: 2.4378, h: "mixte" },
  villejuif: { lat: 48.7922, lng: 2.3634, h: "mixte" },
  "fontenay-sous-bois": { lat: 48.8511, lng: 2.4772, h: "mixte" },
  vincennes: { lat: 48.8475, lng: 2.4392, h: "collectif" },
  "villeneuve-saint-georges": { lat: 48.7325, lng: 2.4497, h: "mixte" },
  "choisy-le-roi": { lat: 48.7633, lng: 2.4094, h: "mixte" },
  alfortville: { lat: 48.805, lng: 2.4192, h: "collectif" },
  thiais: { lat: 48.765, lng: 2.3923, h: "pavillonnaire" },
  orly: { lat: 48.7439, lng: 2.3928, h: "mixte" },
  "nogent-sur-marne": { lat: 48.837, lng: 2.4827, h: "mixte" },
  "le-kremlin-bicetre": { lat: 48.81, lng: 2.358, h: "collectif" },
  cachan: { lat: 48.7919, lng: 2.3317, h: "mixte" },
  "l-hay-les-roses": { lat: 48.78, lng: 2.3374, h: "pavillonnaire" },
  "charenton-le-pont": { lat: 48.8219, lng: 2.4122, h: "collectif" },
  "villiers-sur-marne": { lat: 48.8275, lng: 2.5447, h: "pavillonnaire" },
  "boissy-saint-leger": { lat: 48.7511, lng: 2.5106, h: "mixte" },
  "sucy-en-brie": { lat: 48.7697, lng: 2.5228, h: "pavillonnaire" },
  "limeil-brevannes": { lat: 48.7464, lng: 2.4886, h: "pavillonnaire" },
  valenton: { lat: 48.7453, lng: 2.4672, h: "mixte" },
  meaux: { lat: 48.9601, lng: 2.8788, h: "mixte" },
  chelles: { lat: 48.8811, lng: 2.5939, h: "mixte" },
  melun: { lat: 48.5394, lng: 2.6608, h: "mixte" },
  "pontault-combault": { lat: 48.8011, lng: 2.6072, h: "pavillonnaire" },
  "savigny-le-temple": { lat: 48.5739, lng: 2.5828, h: "recent" },
  "bussy-saint-georges": { lat: 48.8406, lng: 2.7017, h: "recent" },
  "champs-sur-marne": { lat: 48.8528, lng: 2.6031, h: "mixte" },
  torcy: { lat: 48.8502, lng: 2.6508, h: "recent" },
  "lagny-sur-marne": { lat: 48.8728, lng: 2.7089, h: "mixte" },
  "roissy-en-brie": { lat: 48.7911, lng: 2.6519, h: "pavillonnaire" },
  "combs-la-ville": { lat: 48.6647, lng: 2.5636, h: "pavillonnaire" },
  villeparisis: { lat: 48.942, lng: 2.615, h: "pavillonnaire" },
  "le-mee-sur-seine": { lat: 48.5333, lng: 2.6289, h: "mixte" },
  "dammarie-les-lys": { lat: 48.5156, lng: 2.6397, h: "mixte" },
  noisiel: { lat: 48.8547, lng: 2.6233, h: "recent" },
  "ozoir-la-ferriere": { lat: 48.7633, lng: 2.6717, h: "pavillonnaire" },
  "crecy-la-chapelle": { lat: 48.8586, lng: 2.9058, h: "ancien" },
  coulommiers: { lat: 48.8125, lng: 3.0836, h: "mixte" },
  fontainebleau: { lat: 48.4047, lng: 2.7016, h: "ancien" },
  provins: { lat: 48.5597, lng: 3.2994, h: "ancien" },
};

export const habitatDe = (v: VilleSeo): Habitat => LOCAL[v.slug]?.h || "mixte";

function km(a: VilleSeo, b: VilleSeo) {
  const A = LOCAL[a.slug], B = LOCAL[b.slug];
  if (!A || !B) return 999;
  const R = 6371, r = Math.PI / 180;
  const dLat = (B.lat - A.lat) * r, dLng = (B.lng - A.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Les villes de la liste réellement les plus proches (tous départements confondus), avec la distance */
export function villesVoisines(v: VilleSeo, n = 6) {
  return VILLES_SEO.filter((x) => x.slug !== v.slug)
    .map((x) => ({ ...x, km: Math.round(km(v, x)) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

const HABITAT_TEXTE: Record<Habitat, (nom: string) => string> = {
  collectif: (n) => `${n} est une ville très urbaine : la plupart des logements sont des appartements en immeuble, souvent anciens. Les travaux s'y organisent avec les contraintes de la copropriété (horaires, parties communes, accès et stationnement des artisans).`,
  mixte: (n) => `${n} mêle immeubles et quartiers de maisons individuelles. Selon que vous habitez un appartement ou une maison, les travaux, l'accès au chantier et les autorisations ne sont pas les mêmes : précisez-le dans votre demande.`,
  pavillonnaire: (n) => `${aVille(n)[0].toUpperCase() + aVille(n).slice(1)}, une grande partie des logements sont des maisons individuelles (pavillons), dont beaucoup datent des années 1950 à 1980. Ce sont des logements où les travaux de rénovation et d'amélioration énergétique sont fréquents.`,
  recent: (n) => `${n} s'est fortement développée à partir des années 1970-1980 (ville nouvelle) : on y trouve surtout des maisons et résidences relativement récentes. Les travaux y portent plus souvent sur la modernisation et le confort que sur la remise en état du gros œuvre.`,
  ancien: (n) => `${n} compte beaucoup de bâti ancien (maisons de bourg, murs en pierre, centre historique). Aux abords des monuments historiques, les travaux visibles de l'extérieur peuvent être soumis à l'avis de l'architecte des Bâtiments de France : renseignez-vous en mairie avant de signer.`,
};

/** Conseils propres à chaque métier selon le type de logement */
const TIPS: Record<string, { maison: string; appart: string; ancien: string }> = {
  plombier: {
    maison: "En maison, signalez l'emplacement du compteur et du chauffe-eau, et si les canalisations passent en vide sanitaire ou en sous-sol : c'est ce qui conditionne la facilité d'intervention.",
    appart: "En appartement, indiquez si la vanne d'arrêt est privative ou s'il faut couper l'eau de l'immeuble, et si les colonnes d'évacuation sont communes.",
    ancien: "Dans le bâti ancien, les canalisations en plomb ou en acier galvanisé sont fréquentes : demandez au plombier de vérifier leur état et de chiffrer leur remplacement à part.",
  },
  chauffagiste: {
    maison: "En maison, une pompe à chaleur air/eau peut souvent remplacer la chaudière : indiquez la surface chauffée, le type de radiateurs et la place disponible pour l'unité extérieure.",
    appart: "En appartement, précisez si le chauffage est individuel ou collectif et si la copropriété autorise une unité extérieure (PAC ou climatisation).",
    ancien: "Dans une maison ancienne aux murs épais, un bon dimensionnement est essentiel : demandez une étude de déperditions avant de remplacer votre chaudière.",
  },
  electricien: {
    maison: "En maison, pensez à faire chiffrer en même temps l'éclairage extérieur, le garage ou une borne de recharge : un seul passage revient moins cher.",
    appart: "En appartement, l'électricien intervient sur la partie privative, après le disjoncteur de branchement. Indiquez l'étage et l'accès au tableau.",
    ancien: "Les installations anciennes ont souvent des circuits sans terre ou des fils en tissu : une mise en sécurité est alors prioritaire.",
  },
  macon: {
    maison: "En maison, précisez l'accès pour les engins et l'évacuation des gravats (benne sur la voie publique = autorisation de la mairie).",
    appart: "En appartement, toute ouverture de mur porteur passe par l'accord de la copropriété et une étude de structure.",
    ancien: "Sur des murs anciens en pierre ou en meulière, les enduits doivent rester respirants (chaux) : évitez les enduits ciment qui piègent l'humidité.",
  },
  plaquiste: {
    maison: "En maison, l'aménagement des combles ou du sous-sol est un chantier fréquent : indiquez la hauteur sous plafond disponible.",
    appart: "En appartement, un doublage ou une cloison phonique améliore beaucoup le confort entre voisins : précisez les bruits à traiter.",
    ancien: "Sur des murs anciens humides, le doublage doit être adapté (pare-vapeur, lame d'air) : signalez toute trace d'humidité.",
  },
  isolation: {
    maison: "En maison individuelle, les combles sont la première source de pertes de chaleur : leur isolation est souvent le chantier le plus rentable, devant les murs et le plancher bas.",
    appart: "En appartement, on isole surtout les murs donnant sur l'extérieur par l'intérieur, ou le plancher si vous êtes au-dessus d'un local non chauffé.",
    ancien: "Dans le bâti ancien, privilégiez des isolants perspirants (fibre de bois, chanvre, ouate) pour ne pas piéger l'humidité dans les murs.",
  },
  peintre: {
    maison: "En maison, regroupez intérieur et boiseries extérieures (volets, portail) dans une même demande pour obtenir un meilleur prix.",
    appart: "En appartement, indiquez l'étage, la présence d'un ascenseur et si le logement est occupé pendant les travaux.",
    ancien: "Les murs anciens demandent souvent plus de préparation (rebouchage, toile de verre) : faites préciser ce poste sur chaque devis.",
  },
  carreleur: {
    maison: "En maison, la terrasse ou le garage peuvent être carrelés en même temps que l'intérieur : précisez les surfaces extérieures.",
    appart: "En appartement, la copropriété impose souvent une sous-couche acoustique sous le carrelage : vérifiez votre règlement.",
    ancien: "Sur un plancher bois ancien, un carrelage demande une préparation spécifique (plancher rigidifié, natte de désolidarisation).",
  },
  "parquet-sols": {
    maison: "En maison, signalez un éventuel plancher chauffant et l'état de la dalle du rez-de-chaussée (humidité).",
    appart: "En appartement, une sous-couche acoustique est généralement exigée par la copropriété pour les parquets et stratifiés.",
    ancien: "Un parquet ancien se rénove souvent par ponçage et vitrification plutôt que d'être remplacé : demandez les deux options.",
  },
  menuisier: {
    maison: "En maison, demandez un chiffrage groupé fenêtres, volets et porte d'entrée : c'est plus cohérent et souvent moins cher.",
    appart: "En appartement, la forme et la couleur des fenêtres sont fixées par la copropriété : joignez votre règlement à la demande.",
    ancien: "Dans un secteur protégé, les fenêtres bois et les petits bois peuvent être imposés : vérifiez en mairie avant de choisir du PVC.",
  },
  couvreur: {
    maison: "En maison, faites vérifier en même temps gouttières, solins et faîtage : beaucoup de fuites viennent de ces points.",
    appart: "En immeuble, la toiture est une partie commune : les travaux sont votés en assemblée générale et commandés par le syndic.",
    ancien: "Les toitures anciennes (tuiles plates, ardoise) se réparent souvent à l'identique : demandez des matériaux compatibles.",
  },
  "ravalement-facade": {
    maison: "En maison, le ravalement est le bon moment pour isoler par l'extérieur : demandez un devis avec et sans isolation.",
    appart: "En immeuble, le ravalement est décidé en assemblée générale : Rénolien peut aider à obtenir des devis comparables pour le syndic.",
    ancien: "Sur une façade en pierre ou en meulière, un enduit à la chaux est en général recommandé, et la couleur peut être encadrée par la mairie.",
  },
  "renovation-salle-de-bain-cuisine": {
    maison: "En maison, déplacer une salle de bain ou une cuisine est plus simple qu'en appartement : signalez si vous voulez changer de pièce.",
    appart: "En appartement, l'emplacement des évacuations communes limite les déplacements de WC et de douche : joignez un plan.",
    ancien: "Dans l'ancien, les murs ne sont pas toujours d'aplomb et les planchers peuvent fléchir : prévoyez une ligne de préparation des supports.",
  },
  "terrassement-exterieurs": {
    maison: "Indiquez la largeur de l'accès pour les engins et la nature du terrain : ce sont les deux points qui font le plus varier les prix.",
    appart: "En résidence, les aménagements extérieurs (terrasse en rez-de-jardin) sont souvent soumis à l'accord de la copropriété.",
    ancien: "Près d'un bâti ancien, surveillez la gestion des eaux pluviales : un mauvais écoulement crée vite de l'humidité dans les murs.",
  },
  "petits-travaux": {
    maison: "En maison, listez aussi les petits travaux extérieurs (portail, boîte aux lettres, gouttière) : un artisan peut tout faire en une seule visite.",
    appart: "En appartement, précisez l'étage, l'ascenseur et le stationnement : sur une petite intervention, l'accès compte beaucoup.",
    ancien: "Dans un logement ancien, signalez la nature des murs (plâtre, brique, pierre) pour que l'artisan prévoie les bonnes fixations.",
  },
};

export function texteLocal(m: MetierSeo, v: VilleSeo): string[] {
  const h = habitatDe(v), t = TIPS[m.slug];
  const out = [HABITAT_TEXTE[h](v.nom)];
  if (!t) return out;
  if (h === "collectif") out.push(t.appart);
  else if (h === "mixte") out.push(t.maison, t.appart);
  else if (h === "ancien") out.push(t.ancien, t.maison);
  else out.push(t.maison);
  return out;
}

/** Quelques prix de référence du catalogue Rénolien pour le métier (prix HT, modifiables par chaque artisan) */
export function prixReference(m: MetierSeo, n = 6) {
  const rows = CATALOGUE[m.trade] || [];
  if (!rows.length) return [];
  const pas = Math.max(1, Math.floor(rows.length / n));
  const out: { nom: string; unite: string; prix: number }[] = [];
  for (let i = 0; i < rows.length && out.length < n; i += pas) {
    const [, nom, unite, prix] = rows[i];
    if (prix > 0) out.push({ nom, unite, prix });
  }
  return out;
}
