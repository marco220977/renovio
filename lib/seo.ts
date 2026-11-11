// Pages de référencement « métier + ville » : contenus propres à chaque métier, liste des villes couvertes.

export type MetierSeo = {
  slug: string;        // dans l'adresse : /travaux/plombier/creteil
  trade: string;       // identifiant métier de l'appli (pour les demandes)
  pro: string;         // « plombier »
  pros: string;        // « plombiers »
  sujet: string;       // « vos travaux de plomberie »
  emoji: string;
  intro: string;
  travaux: string[];
  conseils: string[];
  faq: [string, string][];
};

export const METIERS_SEO: MetierSeo[] = [
  {
    slug: "plombier", trade: "plomberie", pro: "plombier", pros: "plombiers", sujet: "vos travaux de plomberie", emoji: "🚿",
    intro: "Fuite, chauffe-eau à remplacer, nouvelle salle d'eau ou WC suspendu : décrivez votre besoin, l'IA prépare un cahier des charges précis et les plombiers de votre secteur vous envoient leur devis.",
    travaux: ["Remplacement de chauffe-eau ou ballon thermodynamique", "Pose de WC suspendu, lavabo, douche à l'italienne", "Réfection des évacuations et alimentations", "Recherche et réparation de fuite", "Remplacement de robinetterie et mitigeurs", "Raccordement d'électroménager, adoucisseur"],
    conseils: ["Indiquez la capacité et l'emplacement de votre chauffe-eau actuel, avec une photo de sa plaque.", "Pour une salle de bain, précisez si l'évacuation peut passer au sol ou au mur : c'est souvent ce qui fait varier le prix.", "Vérifiez que le plombier vous remet un devis détaillé (fournitures et main d'œuvre séparées) et son attestation décennale."],
    faq: [
      ["Combien coûte l'intervention d'un plombier ?", "Cela dépend du travail : un remplacement de mitigeur n'a rien à voir avec une salle d'eau complète. Rénolien vous donne une estimation indicative à partir de votre description, puis les plombiers envoient leur devis détaillé."],
      ["Le plombier doit-il venir voir avant de faire le devis ?", "Pour les petits travaux, un devis sur photos suffit souvent. Pour une rénovation, l'artisan choisi passe faire une visite et vous envoie un devis définitif avant toute signature."],
      ["Les plombiers sont-ils assurés ?", "Pour répondre sur Rénolien, chaque artisan doit renseigner son SIRET et son assurance décennale. Le badge « Vérifié » indique que les documents ont été contrôlés."],
    ],
  },
  {
    slug: "chauffagiste", trade: "chauffage", pro: "chauffagiste", pros: "chauffagistes", sujet: "vos travaux de chauffage", emoji: "🔥",
    intro: "Remplacement de chaudière, pompe à chaleur, radiateurs ou climatisation : obtenez des devis de chauffagistes de votre secteur à partir d'une simple description.",
    travaux: ["Remplacement de chaudière gaz ou fioul", "Installation de pompe à chaleur air/eau ou air/air", "Pose ou remplacement de radiateurs", "Installation de climatisation réversible", "Désembouage et équilibrage du circuit", "Plancher chauffant hydraulique"],
    conseils: ["Donnez la surface chauffée, l'année de la maison et le type d'isolation : c'est indispensable pour dimensionner une PAC.", "Photographiez la plaque de votre chaudière actuelle et vos radiateurs.", "Pour les aides à la rénovation énergétique, choisissez un artisan certifié RGE (badge affiché sur son offre)."],
    faq: [
      ["Une pompe à chaleur est-elle adaptée à mon logement ?", "Elle convient surtout aux logements correctement isolés. Décrivez votre maison : l'IA pose les bonnes questions et les chauffagistes vous conseillent dans leur devis."],
      ["Faut-il un artisan RGE ?", "Un artisan RGE est généralement exigé pour bénéficier des aides publiques à la rénovation énergétique. Les artisans RGE sont signalés sur Rénolien."],
      ["Combien de temps dure le remplacement d'une chaudière ?", "Souvent une à deux journées pour un remplacement simple, plus pour une pompe à chaleur. Chaque artisan indique sa durée estimée dans son offre."],
    ],
  },
  {
    slug: "electricien", trade: "electricite", pro: "électricien", pros: "électriciens", sujet: "vos travaux d'électricité", emoji: "⚡",
    intro: "Mise aux normes, tableau électrique, prises, éclairage ou rénovation complète : décrivez votre projet et recevez les devis d'électriciens de votre secteur.",
    travaux: ["Remplacement de tableau électrique", "Mise en sécurité ou aux normes NF C 15-100", "Ajout de prises, interrupteurs, points lumineux", "Rénovation électrique complète", "Installation de borne de recharge", "Pose de VMC et radiateurs électriques"],
    conseils: ["Précisez l'âge de l'installation et si vous avez un diagnostic électrique.", "Envoyez une photo de votre tableau électrique actuel.", "Pour une borne de recharge, indiquez la distance entre le tableau et le stationnement."],
    faq: [
      ["Comment savoir si mon installation doit être refaite ?", "Une installation ancienne, sans différentiel ou avec des prises sans terre est à vérifier. Décrivez votre logement, les électriciens vous indiqueront les travaux nécessaires."],
      ["Un électricien peut-il intervenir dans un logement occupé ?", "Oui, la plupart des travaux se font pièce par pièce. Précisez-le dans votre demande."],
      ["Qui délivre l'attestation de conformité ?", "Après une rénovation importante, l'électricien peut vous accompagner pour l'attestation de conformité (Consuel) lorsqu'elle est requise."],
    ],
  },
  {
    slug: "macon", trade: "maconnerie", pro: "maçon", pros: "maçons", sujet: "vos travaux de maçonnerie", emoji: "🧱",
    intro: "Ouverture de mur, dalle, extension, muret ou reprise de fissures : décrivez vos travaux de maçonnerie et comparez les devis des maçons de votre secteur.",
    travaux: ["Ouverture de mur porteur avec IPN", "Coulage de dalle ou chape", "Construction de muret, clôture ou extension", "Reprise de fissures et enduits", "Démolition de cloisons", "Création de seuil, marches, escalier extérieur"],
    conseils: ["Pour un mur porteur, signalez-le : une étude de structure peut être nécessaire.", "Indiquez les dimensions et l'accès au chantier (évacuation des gravats).", "Joignez des photos des fissures avec un mètre pour l'échelle."],
    faq: [
      ["Faut-il une autorisation pour ouvrir un mur porteur ?", "En copropriété, l'accord de l'assemblée générale est généralement nécessaire. Dans tous les cas, l'ouverture doit être dimensionnée correctement : l'artisan vous le précisera."],
      ["Le maçon s'occupe-t-il de l'évacuation des gravats ?", "C'est fréquent, mais pas systématique : vérifiez la ligne « évacuation » sur chaque devis reçu."],
      ["Combien de temps pour une dalle ?", "La durée dépend de la surface et du temps de séchage. Chaque maçon indique son délai et la durée du chantier dans son offre."],
    ],
  },
  {
    slug: "plaquiste", trade: "platrerie", pro: "plaquiste", pros: "plaquistes", sujet: "vos travaux de plâtrerie", emoji: "📐",
    intro: "Cloisons, faux plafonds, doublages ou redistribution des pièces : recevez des devis de plaquistes adaptés à votre projet.",
    travaux: ["Création de cloisons en plaques de plâtre", "Faux plafond avec ou sans spots", "Doublage isolant des murs", "Redistribution de pièces", "Bandes, enduits et reprises de fissures", "Habillage de gaines et coffrages"],
    conseils: ["Donnez les surfaces ou les dimensions des pièces.", "Précisez si vous voulez une isolation phonique ou thermique.", "Indiquez si la peinture est à prévoir ensuite."],
    faq: [
      ["Combien de temps pour monter une cloison ?", "Souvent une à deux journées par pièce, hors temps de séchage des bandes. Chaque plaquiste indique sa durée."],
      ["Peut-on intégrer des spots dans un faux plafond ?", "Oui, précisez-le dans votre demande : un électricien peut être nécessaire pour les raccordements."],
      ["Le plaquiste fait-il la peinture ?", "Certains oui, d'autres non. Vérifiez sur chaque devis si la préparation et la peinture sont incluses."],
    ],
  },
  {
    slug: "isolation", trade: "isolation", pro: "artisan en isolation", pros: "artisans en isolation", sujet: "vos travaux d'isolation", emoji: "🧊",
    intro: "Combles, murs, sols ou toiture : isolez votre logement avec des artisans de votre secteur et comparez leurs devis.",
    travaux: ["Isolation des combles perdus par soufflage", "Isolation des combles aménagés", "Isolation des murs par l'intérieur", "Isolation thermique par l'extérieur", "Isolation des planchers bas et garages", "Remplacement d'isolant ancien"],
    conseils: ["Indiquez la surface et l'accès aux combles.", "Précisez l'année de construction et le mode de chauffage.", "Pour les aides, privilégiez un artisan RGE."],
    faq: [
      ["Quel isolant choisir ?", "Le choix dépend de la zone à isoler et de votre budget. Les artisans précisent l'isolant et sa performance dans leur devis."],
      ["Existe-t-il des aides ?", "Des aides publiques existent sous conditions, souvent réservées aux travaux réalisés par un artisan RGE. Renseignez-vous sur les sites officiels avant de signer."],
      ["L'isolation des combles prend-elle longtemps ?", "Le soufflage en combles perdus se fait souvent dans la journée. L'isolation des murs prend plus de temps."],
    ],
  },
  {
    slug: "peintre", trade: "peinture", pro: "peintre", pros: "peintres", sujet: "vos travaux de peinture", emoji: "🎨",
    intro: "Rafraîchissement d'une pièce, peinture complète, papier peint ou boiseries : décrivez vos pièces et recevez les devis de peintres de votre secteur.",
    travaux: ["Peinture murs et plafonds", "Préparation des supports (rebouchage, ponçage)", "Pose de papier peint et toile de verre", "Peinture de portes, fenêtres et boiseries", "Remise en état avant location ou vente", "Peinture de cage d'escalier"],
    conseils: ["Donnez les surfaces ou le nombre et la taille des pièces.", "Signalez l'état des murs (fissures, anciennes tapisseries, humidité).", "Précisez si le logement est meublé ou vide."],
    faq: [
      ["Combien coûte la peinture d'une pièce ?", "Le prix dépend de la surface, de l'état des murs et de la finition. L'estimation de Rénolien vous donne un ordre de grandeur avant les devis."],
      ["Faut-il vider la pièce ?", "C'est préférable. Sinon, l'artisan protège les meubles : précisez-le dans votre demande."],
      ["Combien de couches sont nécessaires ?", "En général une sous-couche et deux couches de finition. Vérifiez ce qui est prévu sur chaque devis."],
    ],
  },
  {
    slug: "carreleur", trade: "carrelage", pro: "carreleur", pros: "carreleurs", sujet: "vos travaux de carrelage", emoji: "🔲",
    intro: "Carrelage de sol, faïence murale, douche à l'italienne ou terrasse : comparez les devis de carreleurs à partir de votre description.",
    travaux: ["Pose de carrelage au sol", "Faïence murale de salle de bain et cuisine", "Dépose d'ancien carrelage", "Ragréage et préparation du sol", "Carrelage de douche à l'italienne", "Carrelage de terrasse extérieure"],
    conseils: ["Indiquez la surface et le format des carreaux souhaités (les grands formats demandent plus de préparation).", "Précisez si l'ancien carrelage doit être déposé.", "Dites si vous fournissez le carrelage ou si l'artisan le fournit."],
    faq: [
      ["Peut-on poser du carrelage sur l'ancien ?", "C'est parfois possible si le support est sain et plan. L'artisan vous le dira après la visite."],
      ["Combien de temps pour carreler une salle de bain ?", "Comptez souvent plusieurs jours avec la préparation et les joints. La durée figure dans chaque offre."],
      ["Qui fournit le carrelage ?", "Les deux sont possibles. Précisez-le dans votre demande pour comparer des devis équivalents."],
    ],
  },
  {
    slug: "parquet-sols", trade: "sols", pro: "poseur de sols", pros: "poseurs de sols", sujet: "vos travaux de sols", emoji: "🪵",
    intro: "Parquet massif ou contrecollé, stratifié, vinyle, moquette ou rénovation de parquet : recevez des devis de poseurs de sols de votre secteur.",
    travaux: ["Pose de parquet contrecollé ou massif", "Pose de sol stratifié ou vinyle", "Ponçage et vitrification de parquet", "Dépose de moquette et anciens revêtements", "Ragréage avant pose", "Pose de plinthes et barres de seuil"],
    conseils: ["Indiquez la surface par pièce et le type de sol actuel.", "Précisez si vous avez un chauffage au sol (tous les sols ne conviennent pas).", "Dites si le mobilier doit être déplacé."],
    faq: [
      ["Parquet ou stratifié ?", "Le parquet se rénove et dure plus longtemps, le stratifié coûte généralement moins cher. Les artisans peuvent vous conseiller dans leur offre."],
      ["Peut-on poser un parquet sur un chauffage au sol ?", "Oui avec certains parquets compatibles. Signalez-le dans votre demande."],
      ["Combien de temps pour poncer un parquet ?", "Souvent une à trois journées selon la surface, avec le séchage du vernis ou de l'huile."],
    ],
  },
  {
    slug: "menuisier", trade: "menuiserie", pro: "menuisier", pros: "menuisiers", sujet: "vos travaux de menuiserie", emoji: "🚪",
    intro: "Fenêtres, portes, volets, porte d'entrée ou placards : décrivez vos menuiseries et comparez les devis de menuisiers de votre secteur.",
    travaux: ["Remplacement de fenêtres double vitrage", "Pose de porte d'entrée", "Volets roulants ou battants", "Portes intérieures", "Placards et dressings sur mesure", "Baies vitrées et portes-fenêtres"],
    conseils: ["Indiquez le nombre de fenêtres, leurs dimensions approximatives et le matériau souhaité (PVC, alu, bois).", "Précisez si vous êtes en copropriété (règles d'aspect extérieur).", "Joignez des photos de l'existant."],
    faq: [
      ["PVC, aluminium ou bois ?", "Chaque matériau a ses avantages en prix, entretien et esthétique. Les menuisiers détaillent les références dans leur devis."],
      ["Faut-il une déclaration en mairie ?", "Un changement d'aspect extérieur (couleur, matériau, forme) peut nécessiter une déclaration. Renseignez-vous auprès de votre mairie."],
      ["Combien de temps pour poser des fenêtres ?", "Souvent une demi-journée à une journée par fenêtre en rénovation, plus selon les finitions."],
    ],
  },
  {
    slug: "couvreur", trade: "couverture", pro: "couvreur", pros: "couvreurs", sujet: "vos travaux de toiture", emoji: "🏠",
    intro: "Réfection de toiture, fuite, gouttières, démoussage ou charpente : obtenez les devis de couvreurs de votre secteur.",
    travaux: ["Réfection de couverture (tuiles, ardoises)", "Recherche et réparation de fuite", "Remplacement de gouttières et descentes", "Démoussage et traitement", "Pose de fenêtres de toit", "Travaux de charpente et zinguerie"],
    conseils: ["Indiquez le type de couverture et la surface approximative du toit.", "Joignez des photos (depuis le sol ou les combles) en cas de fuite.", "Précisez la hauteur de la maison et l'accès."],
    faq: [
      ["Comment savoir si ma toiture doit être refaite ?", "Tuiles cassées, infiltrations ou mousse importante sont des signes à faire vérifier. Le couvreur choisi viendra constater lors de la visite."],
      ["Faut-il une autorisation pour refaire une toiture ?", "Un changement de matériau ou d'aspect peut nécessiter une déclaration en mairie. Une réfection à l'identique en est souvent dispensée."],
      ["Le démoussage est-il utile ?", "Il prolonge la durée de vie de la couverture. Les couvreurs proposent souvent un traitement en même temps."],
    ],
  },
  {
    slug: "ravalement-facade", trade: "facade", pro: "façadier", pros: "façadiers", sujet: "votre ravalement de façade", emoji: "🏢",
    intro: "Nettoyage, ravalement, enduit ou isolation par l'extérieur : comparez les devis de façadiers de votre secteur.",
    travaux: ["Nettoyage et traitement de façade", "Ravalement avec enduit", "Peinture de façade", "Reprise de fissures", "Isolation thermique par l'extérieur", "Échafaudage et protection"],
    conseils: ["Indiquez la surface ou les dimensions des façades et le nombre d'étages.", "Précisez le type de support (enduit, pierre, brique).", "Vérifiez si votre commune impose un ravalement périodique ou des couleurs."],
    faq: [
      ["Faut-il une autorisation pour un ravalement ?", "Une déclaration préalable est souvent nécessaire, en particulier si l'aspect change. Renseignez-vous auprès de votre mairie."],
      ["Combien de temps dure un ravalement ?", "Plusieurs jours à quelques semaines selon la surface et la météo."],
      ["Peut-on isoler en même temps ?", "Oui, l'isolation par l'extérieur se fait souvent lors du ravalement. Les artisans RGE sont signalés."],
    ],
  },
  {
    slug: "renovation-salle-de-bain-cuisine", trade: "agencement", pro: "artisan en rénovation de salle de bain et cuisine", pros: "artisans en salle de bain et cuisine", sujet: "votre salle de bain ou votre cuisine", emoji: "🛁",
    intro: "Salle de bain clé en main, douche à l'italienne, cuisine équipée : décrivez votre projet, l'IA prépare le cahier des charges et les artisans de votre secteur vous envoient leur devis.",
    travaux: ["Rénovation complète de salle de bain", "Remplacement de baignoire par une douche", "Pose de meuble vasque et WC suspendu", "Pose de cuisine équipée", "Plan de travail et crédence", "Coordination plomberie, électricité, carrelage"],
    conseils: ["Donnez la surface de la pièce et la hauteur sous plafond.", "Dites ce que vous gardez et ce que vous remplacez.", "Indiquez la gamme souhaitée (économique, milieu, haut de gamme)."],
    faq: [
      ["Combien coûte une salle de bain clé en main ?", "Le budget dépend de la surface, des équipements et de la gamme. Rénolien vous donne une fourchette indicative avant de recevoir les devis."],
      ["Un seul artisan peut-il tout faire ?", "Oui, certains artisans coordonnent tous les corps de métier. Sinon, votre demande est visible par plusieurs métiers à la fois."],
      ["Combien de temps dure le chantier ?", "Souvent une à trois semaines pour une salle de bain complète. Chaque artisan indique sa durée."],
    ],
  },
  {
    slug: "terrassement-exterieurs", trade: "exterieur", pro: "artisan en aménagement extérieur", pros: "artisans en aménagement extérieur", sujet: "vos travaux extérieurs", emoji: "🚜",
    intro: "Terrasse, allée, terrassement, assainissement ou clôture : recevez des devis d'artisans de votre secteur pour vos extérieurs.",
    travaux: ["Création de terrasse (bois, béton, carrelage)", "Allées et accès en enrobé ou pavés", "Terrassement et nivellement", "Assainissement et raccordement", "Pose de clôture et portail", "Évacuation des eaux pluviales"],
    conseils: ["Donnez les surfaces et l'accès au terrain (passage d'engins).", "Précisez la nature du sol si vous la connaissez.", "Joignez des photos de l'existant."],
    faq: [
      ["Faut-il une autorisation pour une terrasse ?", "Selon la surface et la hauteur, une déclaration peut être nécessaire. Renseignez-vous auprès de votre mairie."],
      ["Qui s'occupe de l'évacuation de la terre ?", "Vérifiez la ligne « évacuation » sur chaque devis reçu."],
      ["Combien de temps pour une terrasse ?", "Quelques jours à deux semaines selon la surface et le matériau."],
    ],
  },
  {
    slug: "petits-travaux", trade: "multiservice", pro: "artisan multiservice", pros: "artisans multiservices", sujet: "vos petits travaux", emoji: "🧰",
    intro: "Petites réparations, montage, remise en état avant location : décrivez ce qu'il y a à faire et recevez les devis d'artisans de votre secteur.",
    travaux: ["Petites réparations de plomberie et d'électricité", "Montage de meubles et cuisines en kit", "Fixations, étagères, tringles", "Remise en état avant location", "Remplacement de poignées, serrures", "Petits travaux de peinture"],
    conseils: ["Listez toutes les petites tâches : un artisan peut tout faire en une seule intervention.", "Joignez des photos.", "Précisez si vous avez déjà le matériel."],
    faq: [
      ["Un artisan peut-il faire plusieurs petits travaux d'un coup ?", "Oui, c'est l'intérêt d'un artisan multiservice : listez tout dans une seule demande."],
      ["Comment est calculé le prix ?", "Souvent au forfait ou à la demi-journée. Chaque artisan détaille son prix dans son offre."],
      ["Le matériel est-il fourni ?", "Ça dépend : précisez-le dans votre demande pour recevoir des devis comparables."],
    ],
  },
];

export type VilleSeo = { slug: string; nom: string; cp: string; dep: string };
export const DEPARTEMENTS: Record<string, string> = { "75": "Paris", "77": "Seine-et-Marne", "94": "Val-de-Marne" };

const V = (nom: string, cp: string): VilleSeo => ({
  nom, cp, dep: cp.slice(0, 2),
  slug: nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
});

export const VILLES_SEO: VilleSeo[] = [
  V("Paris", "75000"),
  V("Créteil", "94000"), V("Vitry-sur-Seine", "94400"), V("Champigny-sur-Marne", "94500"), V("Saint-Maur-des-Fossés", "94100"),
  V("Ivry-sur-Seine", "94200"), V("Maisons-Alfort", "94700"), V("Villejuif", "94800"), V("Fontenay-sous-Bois", "94120"),
  V("Vincennes", "94300"), V("Villeneuve-Saint-Georges", "94190"), V("Choisy-le-Roi", "94600"), V("Alfortville", "94140"),
  V("Thiais", "94320"), V("Orly", "94310"), V("Nogent-sur-Marne", "94130"), V("Le Kremlin-Bicêtre", "94270"),
  V("Cachan", "94230"), V("L'Haÿ-les-Roses", "94240"), V("Charenton-le-Pont", "94220"), V("Villiers-sur-Marne", "94350"),
  V("Boissy-Saint-Léger", "94470"), V("Sucy-en-Brie", "94370"), V("Limeil-Brévannes", "94450"), V("Valenton", "94460"),
  V("Meaux", "77100"), V("Chelles", "77500"), V("Melun", "77000"), V("Pontault-Combault", "77340"),
  V("Savigny-le-Temple", "77176"), V("Bussy-Saint-Georges", "77600"), V("Champs-sur-Marne", "77420"), V("Torcy", "77200"),
  V("Lagny-sur-Marne", "77400"), V("Roissy-en-Brie", "77680"), V("Combs-la-Ville", "77380"), V("Villeparisis", "77270"),
  V("Le Mée-sur-Seine", "77350"), V("Dammarie-les-Lys", "77190"), V("Noisiel", "77186"), V("Ozoir-la-Ferrière", "77330"),
  V("Crécy-la-Chapelle", "77580"), V("Coulommiers", "77120"), V("Fontainebleau", "77300"), V("Provins", "77160"),
];

export const metierSeo = (slug: string) => METIERS_SEO.find((m) => m.slug === slug);
export const villeSeo = (slug: string) => VILLES_SEO.find((v) => v.slug === slug);

/** « à Créteil », « au Kremlin-Bicêtre », « à L'Haÿ-les-Roses » */
export function aVille(nom: string) {
  if (nom.startsWith("Le ")) return `au ${nom.slice(3)}`;
  if (nom.startsWith("Les ")) return `aux ${nom.slice(4)}`;
  return `à ${nom}`;
}

/** Villes proches : les autres villes du même département (6 maximum, autour de la ville dans la liste) */
export function villesProches(v: VilleSeo, n = 6) {
  const memes = VILLES_SEO.filter((x) => x.dep === v.dep && x.slug !== v.slug);
  const i = Math.max(0, VILLES_SEO.filter((x) => x.dep === v.dep).findIndex((x) => x.slug === v.slug) - 3);
  return [...memes.slice(i), ...memes.slice(0, i)].slice(0, n);
}
