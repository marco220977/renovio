import { DEPARTEMENTS, VILLES_SEO } from "@/lib/seo";
export type DepSeo = { slug: string; code: string; nom: string };
export const DEPS_SEO: DepSeo[] = Object.entries(DEPARTEMENTS).map(([code, nom]) => ({
  code, nom, slug: `${nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${code}`,
}));
export const depSeo = (slug: string) => DEPS_SEO.find((d) => d.slug === slug);
export const villesDuDep = (code: string) => VILLES_SEO.filter((v) => v.dep === code);
/** « à Paris », « en Seine-et-Marne », « dans le Val-de-Marne » */
export const dansDep = (d: DepSeo) => d.code === "75" ? "à Paris" : d.nom.startsWith("Val") ? `dans le ${d.nom}` : `en ${d.nom}`;

/** « de plomberie », « d'isolation »… pour « trouver des chantiers de plomberie » */
export const DOMAINE: Record<string, string> = {
  plombier: "de plomberie", chauffagiste: "de chauffage", electricien: "d'électricité", macon: "de maçonnerie",
  plaquiste: "de plâtrerie", isolation: "d'isolation", peintre: "de peinture", carreleur: "de carrelage",
  "parquet-sols": "de pose de sols", menuisier: "de menuiserie", couvreur: "de couverture",
  "ravalement-facade": "de ravalement de façade", "renovation-salle-de-bain-cuisine": "de salle de bain et cuisine",
  "terrassement-exterieurs": "de terrassement", "petits-travaux": "de petits travaux",
};
export const domaine = (slug: string) => DOMAINE[slug] || "";

/** Conseils propres à chaque métier pour trouver des clients */
export const CONSEILS_PRO: Record<string, string[]> = {
  plombier: ["Le dépannage (fuite, chauffe-eau en panne) est la meilleure porte d'entrée : un client bien dépanné vous rappelle pour sa salle de bain.", "Proposez le remplacement de chauffe-eau au forfait, prix affiché : c'est l'une des demandes les plus fréquentes.", "Travaillez avec un carreleur et un électricien pour pouvoir répondre aux demandes de salle de bain complète."],
  chauffagiste: ["Les contrats d'entretien de chaudière et de pompe à chaleur créent un fichier de clients qui revient chaque année.", "La qualification RGE est un vrai argument : beaucoup de particuliers cherchent un artisan qui ouvre droit aux aides.", "Les pannes de chauffage à l'automne sont le meilleur moment pour gagner de nouveaux clients : soyez réactif dès les premiers froids."],
  electricien: ["Les mises en sécurité avant vente ou location sont fréquentes : faites-vous connaître des agences immobilières et des diagnostiqueurs.", "Les bornes de recharge pour véhicule électrique sont une demande en forte hausse, notamment en maison individuelle.", "Associez-vous à un plaquiste et un plombier pour les rénovations complètes."],
  macon: ["Les ouvertures de murs et les extensions se décident souvent après un achat immobilier : les notaires et agences sont de bons prescripteurs.", "Montrez vos réalisations en photo (dalle, muret, ouverture avec IPN) : c'est ce qui rassure le plus.", "Proposez l'évacuation des gravats dans vos devis : c'est la question que posent tous les clients."],
  plaquiste: ["Les aménagements de combles et les redistributions de pièces après achat sont vos chantiers types.", "Travaillez avec des peintres et des électriciens qui vous enverront les chantiers de cloisons et de faux plafonds.", "Les entreprises générales sous-traitent beaucoup la plâtrerie : c'est une bonne source de volume."],
  isolation: ["L'isolation des combles en maison individuelle est la demande la plus courante : soyez visible sur les communes pavillonnaires de votre secteur.", "La qualification RGE est souvent indispensable pour que vos clients bénéficient des aides.", "Méfiez-vous du démarchage agressif qui a terni l'image du secteur : un devis clair et une visite sérieuse vous distinguent."],
  peintre: ["Les remises en état avant location ou après départ d'un locataire sont un volume régulier : contactez les gestionnaires locatifs.", "Les photos avant / après sont votre meilleure publicité, surtout sur Instagram et Facebook.", "Proposez un prix au m² clair, préparation des supports comprise."],
  carreleur: ["La salle de bain est votre premier marché : associez-vous à un plombier pour proposer une offre complète.", "Les grands formats et la douche à l'italienne sont très demandés : mettez-les en avant dans vos réalisations.", "Les terrasses extérieures sont un bon complément au printemps et en été."],
  "parquet-sols": ["Le ponçage et la vitrification de parquet ancien sont très demandés à Paris et dans la petite couronne.", "Les poses de sols après un achat immobilier se décident vite : les agences sont de bons prescripteurs.", "Proposez systématiquement les plinthes et les barres de seuil pour un devis complet."],
  menuisier: ["Le remplacement de fenêtres est une demande récurrente, souvent couplée aux aides à la rénovation énergétique.", "Les portes d'entrée et les volets roulants motorisés sont de bons chantiers d'appel.", "En copropriété, connaître les règles d'aspect extérieur vous fait gagner la confiance du client."],
  couvreur: ["Les recherches de fuite après un orage sont votre meilleure porte d'entrée : soyez joignable et rapide.", "Le démoussage et le nettoyage de toiture sont des chantiers simples qui amènent des réfections plus importantes.", "Les photos prises sur le toit (avec l'accord du client) sont un excellent argument pour expliquer votre devis."],
  "ravalement-facade": ["Certaines communes imposent un ravalement régulier : suivez les obligations de votre secteur.", "Les syndics de copropriété sont des prescripteurs essentiels pour les ravalements d'immeubles.", "Proposez une option isolation par l'extérieur : c'est souvent le bon moment pour le client."],
  "renovation-salle-de-bain-cuisine": ["Proposer un chantier clé en main, avec un seul interlocuteur, est l'argument numéro un pour les particuliers.", "Les cuisinistes et magasins de salles de bain cherchent des poseurs fiables : proposez-leur vos services.", "Montrez des réalisations avec budget indicatif : le client se projette plus facilement."],
  "terrassement-exterieurs": ["Le printemps concentre les demandes de terrasse, d'allée et de clôture : soyez visible dès février.", "Les constructeurs de maisons et piscinistes sous-traitent souvent le terrassement.", "Les raccordements à l'assainissement sont des chantiers réguliers à ne pas négliger."],
  "petits-travaux": ["Les gestionnaires locatifs, conciergeries et agences ont besoin d'un artisan multiservice réactif toute l'année.", "Proposez un forfait à la demi-journée : c'est rassurant pour les petites interventions.", "Un client satisfait pour un petit dépannage revient pour ses gros travaux : soignez chaque intervention."],
};

/** Texte propre à chaque département pour les pages artisans */
export const DEP_PRO: Record<string, string> = {
  "75": "À Paris, la demande se concentre sur les appartements en copropriété : rénovations de salles de bain et de cuisines, remises aux normes électriques, peinture, parquet ancien. Les chantiers sont souvent plus courts, avec des contraintes d'étage, d'horaires et de stationnement. La réactivité et la clarté du devis font la différence.",
  "94": "Le Val-de-Marne combine des villes très urbaines (Ivry, Vincennes, Charenton) et de grands quartiers pavillonnaires (Saint-Maur, Thiais, Sucy-en-Brie, Villiers-sur-Marne). On y trouve à la fois des chantiers en appartement et des rénovations de maisons : salles de bain, rénovation énergétique, chauffage, toiture.",
  "77": "La Seine-et-Marne est le plus grand département d'Île-de-France, majoritairement en maisons individuelles. Isolation, toiture, chauffage, extérieurs et extensions y reviennent souvent. Définissez une zone d'intervention réaliste (autour de Meaux, Marne-la-Vallée, Melun ou Sénart) pour éviter les longs trajets.",
};

const court = (essais: string[], max = 62) => essais.find((x) => x.length <= max) || essais[essais.length - 1];

/** Titre + description des pages artisans, sur les mots « trouver des chantiers » */
export function metaPro(m: { slug: string; pro: string }, d?: DepSeo) {
  const dom = domaine(m.slug), P = m.pro[0].toUpperCase() + m.pro.slice(1);
  const ou = d ? `${dansDep(d)} (${d.code})` : "en Île-de-France";
  const title = d
    ? court([`Trouver des chantiers ${dom} ${ou}`, `${P} : trouver des chantiers ${ou}`, `${P} : chantiers ${ou}`])
    : court([`Trouver des chantiers ${dom} en Île-de-France`, `Trouver des chantiers ${dom} en IDF`, `${P} : trouver des chantiers en IDF`]);
  const description = court([
    `${P} : recevez des demandes de travaux de particuliers ${ou}, gratuitement et sans commission. Vous ne payez que si un client vous choisit.`,
    `${P} : recevez des demandes de particuliers ${ou}, sans commission. Vous ne payez que si un client vous choisit.`,
    `${P} : des chantiers de particuliers ${ou}, sans commission. Gratuit pendant le lancement.`,
  ], 158);
  return { title, description, h1: d ? `Trouver des chantiers ${dom} ${ou}` : `Trouver des chantiers ${dom} en Île-de-France` };
}
