// Guides pour les artisans (côté « Pro ») : contenu SEO sur « trouver des chantiers / des clients ».
// Même format de blocs que les articles conseils. Chaque guide vise un groupe de mots-clés (champ `mots`, non affiché).
import type { Bloc } from "@/lib/articles";

export type GuidePro = {
  slug: string;
  titre: string;        // balise title (≤ 62 caractères)
  h1: string;
  description: string;  // meta description (≤ 158 caractères)
  date: string;
  lecture: number;
  emoji: string;
  mots: string[];       // mots-clés visés (mémo SEO)
  chapo: string;
  chiffres: [string, string][];
  blocs: Bloc[];
  faq: [string, string][];
  sources: [string, string][];
};

export const GUIDES_PRO: GuidePro[] = [
  {
    slug: "trouver-des-chantiers-ile-de-france",
    titre: "Trouver des chantiers en Île-de-France : 9 méthodes (2026)",
    h1: "Comment trouver des chantiers en Île-de-France en 2026 : 9 méthodes qui marchent",
    description: "Artisan à Paris, dans le 94 ou le 77 ? Les 9 méthodes pour trouver des chantiers et des clients particuliers en Île-de-France, gratuites ou payantes.",
    date: "2026-11-23",
    lecture: 7,
    emoji: "🧭",
    mots: ["trouver des chantiers", "comment trouver des chantiers", "trouver des clients artisan", "trouver des chantiers île-de-france", "trouver des chantiers paris", "trouver des chantiers 94", "trouver des chantiers 77", "plateforme pour trouver des chantiers"],
    chapo: "Remplir son planning quand on est artisan en région parisienne, c'est jongler entre le bouche-à-oreille, Google, les réseaux sociaux et les plateformes. Voici, méthode par méthode, ce qui fonctionne vraiment à Paris, dans le Val-de-Marne et en Seine-et-Marne, et ce que chaque solution coûte.",
    chiffres: [["9", "méthodes comparées"], ["0 €", "pour 5 d'entre elles"], ["75 · 94 · 77", "conseils par département"]],
    blocs: [
      { t: "h2", x: "1. Le bouche-à-oreille, à organiser plutôt qu'à attendre" },
      { t: "p", x: "C'est toujours la première source de chantiers dans le bâtiment, et elle est gratuite. Mais elle se provoque : demandez à chaque client satisfait s'il connaît quelqu'un qui a des travaux, laissez deux cartes de visite au lieu d'une, et envoyez un message quelques semaines après le chantier pour vérifier que tout va bien. Un client qu'on rappelle est un client qui vous recommande." },
      { t: "h2", x: "2. La fiche Google (Google Business Profile)" },
      { t: "p", x: "Quand un particulier tape « plombier Créteil » ou « électricien 77 », Google affiche d'abord une carte avec trois entreprises. Pour y apparaître, il faut une fiche d'établissement complète : métier exact, zone d'intervention (les communes, pas seulement le département), photos de chantiers, horaires, et surtout des avis. Demandez systématiquement un avis à la fin du chantier, avec le lien direct par SMS." },
      { t: "astuce", x: "Répondez à chaque avis, même en deux lignes, en citant le type de travaux et la ville : « Merci pour votre confiance pour la pose de votre chaudière à Thiais. » Ça rassure les futurs clients et ça aide votre référencement local." },
      { t: "h2", x: "3. Les plateformes de mise en relation" },
      { t: "p", x: "Elles reçoivent les demandes de devis des particuliers et les transmettent aux artisans du secteur. Le modèle économique change tout : paiement au contact (le « lead »), abonnement mensuel par métier et par département, ou paiement seulement quand le client vous choisit. Avant de vous inscrire, posez toujours trois questions : combien je paie si le client ne me répond pas, combien d'artisans reçoivent la même demande, et quelle est la durée d'engagement." },
      { t: "p", x: "Sur Rénolien, envoyer une offre est gratuit, chaque demande est limitée à 5 artisans qui ne voient pas les prix des autres, et vous ne payez que lorsqu'un client choisit votre offre. Pendant la phase de lancement, tout est gratuit pour les membres fondateurs." },
      { t: "h2", x: "4. Les réseaux sociaux : avant/après et vidéos courtes" },
      { t: "p", x: "Facebook (groupes de ville et d'entraide), Instagram et TikTok fonctionnent bien pour les métiers visuels : salle de bain, carrelage, peinture, façade, terrasse. Une vidéo de 20 secondes « avant / après » d'une salle de bain à Saint-Maur fait plus pour votre réputation locale qu'un long texte. Publiez régulièrement, mentionnez toujours la ville du chantier." },
      { t: "h2", x: "5. Les partenariats avec les autres corps de métier" },
      { t: "p", x: "Le plombier a besoin d'un carreleur, le carreleur d'un électricien, l'électricien d'un plaquiste. Constituez une petite équipe de confiance avec qui vous vous envoyez les chantiers. C'est aussi la porte d'entrée de la sous-traitance, qui permet de lisser l'activité pendant les périodes creuses." },
      { t: "h2", x: "6. Les prescripteurs : agences, syndics, gestionnaires" },
      { t: "p", x: "Agences immobilières, syndics de copropriété, gestionnaires locatifs et conciergeries ont besoin d'artisans fiables et réactifs, toute l'année. En Île-de-France, où le parc locatif est très important, c'est une source régulière de petits chantiers (remise en état, dépannage) qui en amènent souvent de plus gros." },
      { t: "h2", x: "7. Un site internet simple, mais bien référencé" },
      { t: "p", x: "Pas besoin d'un site coûteux : une page par métier et par ville importante, vos photos, vos assurances et un formulaire de contact suffisent. Ce qui compte, ce sont les mots que les gens tapent : votre métier suivi de la ville (« couvreur Meaux », « maçon Melun »)." },
      { t: "h2", x: "8. Les marchés publics, pour les entreprises structurées" },
      { t: "p", x: "Communes, bailleurs sociaux et collectivités publient leurs appels d'offres en ligne. C'est exigeant (dossier administratif, références), mais c'est un volume stable pour une entreprise qui a déjà quelques salariés." },
      { t: "h2", x: "9. Faire de chaque chantier une vitrine" },
      { t: "p", x: "Un panneau de chantier ou un magnétique sur le véhicule, un chantier propre, des voisins prévenus : dans une rue pavillonnaire de Seine-et-Marne, les voisins sont vos prochains clients. Proposez-leur un passage pour un devis pendant que vous êtes sur place." },
      { t: "h2", x: "Trouver des chantiers selon votre département" },
      { t: "ul", x: [
        "Paris (75) : surtout des appartements en copropriété, des chantiers plus courts mais nombreux, avec les contraintes de stationnement, d'étage et d'horaires. La réactivité fait la différence.",
        "Val-de-Marne (94) : un mélange d'immeubles et de quartiers pavillonnaires (Saint-Maur, Thiais, Sucy-en-Brie…). Rénovation énergétique, salles de bain et remises aux normes y sont très demandées.",
        "Seine-et-Marne (77) : un grand département, majoritairement en maisons individuelles. Isolation, toiture, extérieurs et chauffage reviennent souvent ; définissez une zone réaliste pour ne pas passer vos journées sur la route.",
      ] },
      { t: "h2", x: "Quelle méthode choisir ?" },
      { t: "tableau", entetes: ["Méthode", "Délai pour voir des résultats", "Coût"], lignes: [
        ["Bouche-à-oreille organisé", "Quelques mois", "Gratuit"],
        ["Fiche Google", "1 à 3 mois", "Gratuit"],
        ["Plateforme de mise en relation", "Immédiat à quelques semaines", "Gratuit à payant selon le modèle"],
        ["Réseaux sociaux", "Quelques mois", "Gratuit (temps passé)"],
        ["Partenariats et prescripteurs", "Quelques semaines", "Gratuit"],
        ["Site internet", "3 à 6 mois", "Payant"],
      ] },
    ],
    faq: [
      ["Quel est le meilleur moyen de trouver des chantiers rapidement ?", "Les plateformes de mise en relation donnent des demandes immédiatement, à condition de répondre vite et avec un devis clair. Sur le long terme, le bouche-à-oreille et la fiche Google restent les sources les plus rentables."],
      ["Comment trouver des chantiers gratuitement ?", "Bouche-à-oreille, fiche Google, réseaux sociaux, partenariats avec d'autres artisans et plateformes gratuites ou sans commission. Nous détaillons ces solutions dans notre guide dédié aux chantiers gratuits."],
      ["Faut-il payer pour recevoir des demandes de devis ?", "Pas forcément. Certaines plateformes facturent chaque contact, d'autres un abonnement. Sur Rénolien, envoyer une offre est gratuit et vous ne payez que lorsqu'un client vous choisit."],
      ["Comment trouver des chantiers dans le 94 ou le 77 ?", "Fiche Google avec les communes couvertes, présence dans les groupes Facebook locaux, partenariats avec les agences et syndics du secteur, et inscription sur une plateforme qui filtre les demandes par département."],
    ],
    sources: [
      ["Habitatpresto – 11 méthodes pour trouver des chantiers", "https://www.habitatpresto.com/pro/conseils/pratiques/trouver-chantiers"],
      ["Abby – Trouver des clients en tant qu'artisan", "https://abby.fr/guide/micro-entreprise/trouver-clients-artisan"],
      ["Plan Immobilier – Plateformes de mise en relation", "https://www.plan-immobilier.fr/guide-immobilier/habiter/guide-achat/plateforme-mise-en-relation-artisans-devis"],
    ],
  },
  {
    slug: "trouver-des-chantiers-gratuitement",
    titre: "Trouver des chantiers gratuitement : sites et méthodes (2026)",
    h1: "Trouver des chantiers gratuitement : les sites gratuits et les plateformes sans commission",
    description: "Sites gratuits pour trouver des chantiers, plateformes sans commission, méthodes à 0 € : comment remplir votre planning d'artisan sans payer chaque contact.",
    date: "2026-11-23",
    lecture: 6,
    emoji: "🆓",
    mots: ["trouver des chantiers gratuitement", "site gratuit pour trouver des chantiers", "plateforme artisan sans commission", "demande de devis particuliers gratuite artisan", "recevoir des demandes de travaux"],
    chapo: "Payer 20 ou 30 € pour un contact qui ne répond jamais, ou un abonnement mensuel qui tourne même quand les chantiers ne viennent pas : beaucoup d'artisans en ont fait l'expérience. Voici les solutions réellement gratuites pour trouver des chantiers, et comment repérer les plateformes qui ne prennent pas de commission.",
    chiffres: [["15 à 40 €", "le prix courant d'un contact payant"], ["0 %", "de commission sur Rénolien"], ["5 max.", "artisans par demande"]],
    blocs: [
      { t: "h2", x: "Les trois façons dont les plateformes se font payer" },
      { t: "p", x: "Avant de parler de gratuit, il faut comprendre ce qu'on paie ailleurs. Les plateformes de mise en relation utilisent trois modèles, parfois combinés :" },
      { t: "ul", x: [
        "Le paiement au contact (lead) : vous achetez chaque demande, généralement entre 15 et 40 €, que le client vous réponde ou non.",
        "L'abonnement mensuel : un prix fixe par métier et par département, souvent avec un engagement de plusieurs mois.",
        "La commission : un pourcentage prélevé sur le montant du chantier signé.",
      ] },
      { t: "p", x: "Un modèle n'est pas mauvais en soi, mais le risque n'est pas porté par la même personne. Avec le paiement au contact ou l'abonnement, c'est vous qui payez même quand le client ne signe pas." },
      { t: "h2", x: "Les méthodes 100 % gratuites" },
      { t: "ul", x: [
        "La fiche Google Business Profile : gratuite, c'est souvent la première source de clients locaux quand elle est bien remplie et qu'elle a des avis.",
        "Les groupes Facebook de votre ville : beaucoup de particuliers y demandent « un bon plombier à Champigny ? ». Répondez vite, avec un lien vers vos avis.",
        "Les annuaires gratuits d'artisans : ils apportent peu de contacts directs, mais renforcent votre présence sur Google.",
        "Les partenariats entre artisans et avec les agences immobilières ou syndics du secteur.",
        "Les vidéos courtes de vos chantiers (avant / après) sur Instagram, TikTok ou Facebook.",
      ] },
      { t: "h2", x: "Les plateformes gratuites ou sans commission" },
      { t: "p", x: "Certaines plateformes ne facturent ni le contact ni le chantier. Rénolien a été construit sur ce principe par un plombier-chauffagiste d'Île-de-France : envoyer une offre est gratuit, il n'y a aucune commission sur vos chantiers, et vous ne payez que lorsqu'un client choisit votre offre. Si le client renonce avant la visite, le crédit vous est rendu." },
      { t: "p", x: "Pendant la phase de lancement, l'accès est entièrement gratuit et illimité pour les artisans inscrits, qui gardent ensuite le statut de membre fondateur avec une remise à vie. Une formule Découverte reste gratuite après le lancement." },
      { t: "astuce", x: "Méfiez-vous des offres « gratuites » qui demandent votre carte bancaire à l'inscription ou qui se transforment en abonnement après un mois d'essai. Lisez la durée d'engagement et les conditions de résiliation avant de valider." },
      { t: "h2", x: "Comment transformer une demande gratuite en chantier signé" },
      { t: "ul", x: [
        "Répondez dans l'heure si possible : le premier artisan qui répond clairement a un avantage net.",
        "Envoyez un prix détaillé plutôt qu'un « je passe voir » : le particulier veut comparer.",
        "Joignez votre décennale et votre SIRET : c'est la première chose que le client vérifie.",
        "Proposez un créneau de visite précis, et confirmez la veille.",
        "Après la visite, envoyez le devis définitif dans les 48 heures.",
      ] },
    ],
    faq: [
      ["Existe-t-il un site vraiment gratuit pour trouver des chantiers ?", "Oui. Certaines plateformes ne facturent ni l'inscription ni l'envoi d'offres. Sur Rénolien, l'accès est gratuit pendant la phase de lancement, puis une formule Découverte reste gratuite."],
      ["Quelle différence entre une plateforme sans commission et une plateforme gratuite ?", "Sans commission signifie qu'aucun pourcentage n'est prélevé sur vos chantiers. La plateforme peut quand même facturer un abonnement ou des contacts. Vérifiez les deux points."],
      ["Les demandes gratuites sont-elles de moins bonne qualité ?", "Pas nécessairement. Ce qui compte, c'est que la demande soit précise (description, photos, budget, code postal) et que peu d'artisans la reçoivent. Sur Rénolien, chaque demande est décrite avec l'aide de l'IA et limitée à 5 artisans."],
      ["Faut-il un SIRET pour recevoir des demandes ?", "Oui, sur la plupart des plateformes sérieuses. Sur Rénolien, un SIRET et une assurance décennale en cours de validité sont demandés."],
    ],
    sources: [
      ["Plan Immobilier – Modèles des plateformes (lead, abonnement)", "https://www.plan-immobilier.fr/guide-immobilier/habiter/guide-achat/plateforme-mise-en-relation-artisans-devis"],
      ["Legalnest – Comparatif des plateformes pour trouver des chantiers", "https://www.legalnest.fr/trouver-chantiers"],
    ],
  },
  {
    slug: "alternative-habitatpresto-travaux-com-quotatis",
    titre: "Habitatpresto, Travaux.com, Quotatis : quelle alternative ?",
    h1: "Habitatpresto, Travaux.com, Quotatis : comparatif et alternative pour trouver des chantiers",
    description: "Abonnement, paiement au contact ou au client choisi : comparez le fonctionnement d'Habitatpresto, Travaux.com, Quotatis et Rénolien avant de vous inscrire.",
    date: "2026-11-23",
    lecture: 6,
    emoji: "⚖️",
    mots: ["alternative habitatpresto", "alternative travaux.com", "habitatpresto avis pro", "quotatis artisan", "meilleur site pour trouver des chantiers", "plateforme artisan sans commission"],
    chapo: "Les grandes plateformes de mise en relation fonctionnent toutes sur le même principe côté particulier : il décrit son projet et reçoit plusieurs devis. Côté artisan, en revanche, les modèles de paiement sont très différents. Voici un comparatif factuel pour choisir en connaissance de cause.",
    chiffres: [["3", "modèles de paiement différents"], ["6 à 12 mois", "d'engagement initial chez certains"], ["0 €", "par offre envoyée sur Rénolien"]],
    blocs: [
      { t: "h2", x: "Comparatif des modèles (novembre 2026)" },
      { t: "p", x: "Informations publiques relevées en novembre 2026 sur les sites des plateformes et dans des comparatifs spécialisés. Les tarifs évoluent : vérifiez toujours les conditions en vigueur avant de vous inscrire." },
      { t: "tableau", entetes: ["Plateforme", "Comment vous payez", "Ordre de prix relevé"], lignes: [
        ["Habitatpresto", "Abonnement mensuel fixe selon métiers et départements, engagement initial de 6 ou 12 mois", "Environ 80 à 150 € HT / mois selon les comparatifs"],
        ["Travaux.com", "Accès payant aux demandes pour l'artisan, gratuit pour le particulier", "Sur devis"],
        ["Quotatis", "Paiement par demande de devis", "À partir de 15 € par devis"],
        ["Rénolien", "Envoi d'offres gratuit, crédit décompté seulement quand un client vous choisit, sans commission", "Gratuit pendant le lancement, puis 0 à 79 € / mois"],
      ] },
      { t: "h2", x: "Habitatpresto" },
      { t: "p", x: "L'un des acteurs historiques. Le service « Chantier » fonctionne par abonnement mensuel dont le prix dépend des métiers et des départements choisis. L'avantage : pas de coût par contact. Le point d'attention : l'abonnement se paie même pendant les mois où les demandes ne se transforment pas, et l'engagement initial est de 6 ou 12 mois avec reconduction tacite selon les informations publiées." },
      { t: "h2", x: "Travaux.com" },
      { t: "p", x: "Le plus gros volume revendiqué en France, avec plus de 800 000 mises en relation par an annoncées, sur tous les corps d'état. Le volume est un atout, mais une même demande peut être transmise à plusieurs professionnels : la réactivité et le prix deviennent déterminants." },
      { t: "h2", x: "Quotatis" },
      { t: "p", x: "Un modèle au contact : vous payez chaque demande de devis que vous recevez, à partir d'environ 15 €. Simple à comprendre, mais le coût s'accumule si le taux de transformation est faible." },
      { t: "h2", x: "Rénolien, l'alternative pensée par un artisan" },
      { t: "p", x: "Rénolien a été créé par un plombier-chauffagiste d'Île-de-France qui voulait corriger ce qui fâche les artisans sur les autres plateformes :" },
      { t: "ul", x: [
        "Vous ne payez pas pour envoyer une offre, seulement quand un client vous choisit. Si le client renonce avant la visite, le crédit vous est rendu.",
        "5 artisans maximum par demande, et chacun fait une seule offre sans voir celles des autres : pas d'enchère au moins cher.",
        "Aucune commission sur vos chantiers : le client vous paie directement.",
        "Abonnement sans engagement, avec une formule gratuite.",
        "Le devis est pré-rempli par l'IA à partir de vos propres tarifs, et signé en ligne.",
      ] },
      { t: "p", x: "Limite à connaître : Rénolien est jeune et concentré sur Paris, le Val-de-Marne et la Seine-et-Marne. Le volume de demandes est donc plus faible que sur les plateformes nationales. C'est pour cette raison que l'accès est gratuit pour les artisans pendant la phase de lancement." },
      { t: "astuce", x: "Rien n'interdit de combiner plusieurs plateformes. Commencez par celles qui ne vous coûtent rien tant que vous n'avez pas de client, et suivez votre taux de transformation (demandes reçues / chantiers signés) pour chaque source." },
    ],
    faq: [
      ["Quelle est la meilleure plateforme pour trouver des chantiers ?", "Il n'y en a pas une seule : tout dépend de votre métier, de votre zone et de votre budget. Comparez surtout ce que vous payez quand un client ne signe pas, le nombre d'artisans par demande et la durée d'engagement."],
      ["Peut-on résilier un abonnement de plateforme à tout moment ?", "Pas toujours. Certaines plateformes prévoient un engagement initial et une reconduction tacite. Lisez les conditions générales avant de vous inscrire. Sur Rénolien, l'abonnement est sans engagement."],
      ["Rénolien prend-il une commission ?", "Non. Rénolien se rémunère uniquement par l'abonnement des artisans, et le client vous paie directement."],
      ["Rénolien est-il disponible partout en France ?", "Pour l'instant, Rénolien est concentré sur Paris (75), le Val-de-Marne (94) et la Seine-et-Marne (77)."],
    ],
    sources: [
      ["Legalnest – Habitatpresto pour les pros", "https://www.legalnest.fr/trouver-chantiers/habitatpresto"],
      ["Legalnest – Comparatif des plateformes (Quotatis)", "https://www.legalnest.fr/trouver-chantiers"],
      ["Plan Immobilier – Comparatif des plateformes (Travaux.com)", "https://www.plan-immobilier.fr/guide-immobilier/habiter/guide-achat/plateforme-mise-en-relation-artisans-devis"],
      ["Habitatpresto Pro – Tarifs", "https://www.habitatpresto.com/pro/tarifs"],
    ],
  },
  {
    slug: "trouver-des-chantiers-auto-entrepreneur",
    titre: "Trouver ses premiers chantiers en auto-entrepreneur (BTP)",
    h1: "Auto-entrepreneur dans le bâtiment : comment trouver vos premiers chantiers",
    description: "Vous lancez votre micro-entreprise dans le bâtiment ? Assurance, premiers clients, sous-traitance, plateformes : le plan pour trouver vos premiers chantiers.",
    date: "2026-11-23",
    lecture: 6,
    emoji: "🚀",
    mots: ["trouver des chantiers auto-entrepreneur", "comment trouver ses premiers chantiers", "trouver des chantiers en sous-traitance", "trouver des clients micro-entreprise bâtiment"],
    chapo: "Vous avez le métier, le SIRET et la camionnette, mais pas encore de clients. Les premiers mois d'une micro-entreprise dans le bâtiment se jouent sur trois choses : être en règle pour rassurer, être visible là où les particuliers cherchent, et accepter des chantiers qui construisent votre réputation.",
    chiffres: [["SIRET + décennale", "les deux documents demandés partout"], ["30 jours", "pour poser les bases"], ["5 sources", "de premiers clients"]],
    blocs: [
      { t: "h2", x: "Avant le premier chantier : être en règle" },
      { t: "p", x: "L'assurance décennale est obligatoire pour la plupart des travaux du bâtiment, et c'est le premier document qu'un particulier ou une plateforme vous demandera. Ajoutez une responsabilité civile professionnelle, un modèle de devis conforme (mentions obligatoires, TVA ou mention de franchise) et un moyen d'encaisser simplement." },
      { t: "astuce", x: "Mettez votre attestation de décennale en PDF dans votre téléphone. Pouvoir l'envoyer en deux secondes pendant un premier appel rassure énormément." },
      { t: "h2", x: "Le plan des 30 premiers jours" },
      { t: "ul", x: [
        "Semaine 1 : créez votre fiche Google avec vos communes d'intervention, et demandez un avis à chaque personne pour qui vous avez déjà travaillé.",
        "Semaine 2 : prévenez tout votre entourage, avec un message précis (votre métier, votre zone, une photo de chantier).",
        "Semaine 3 : inscrivez-vous sur une ou deux plateformes gratuites ou sans commission, et répondez à toutes les demandes de votre secteur.",
        "Semaine 4 : contactez trois artisans d'autres métiers et deux agences immobilières de votre ville pour proposer vos services.",
      ] },
      { t: "h2", x: "Trouver des chantiers en sous-traitance" },
      { t: "p", x: "Travailler pour une entreprise plus grande est un bon moyen de démarrer : pas de prospection, un volume régulier, et une expérience qui s'ajoute à vos références. Contactez les entreprises générales et les artisans de votre secteur qui ont plus de demandes qu'ils ne peuvent en traiter. Demandez toujours un contrat de sous-traitance écrit et vérifiez qui est responsable de quoi sur le chantier." },
      { t: "p", x: "La sous-traitance a une limite : vos marges sont plus faibles et vous ne construisez pas votre propre clientèle. Gardez-la comme complément, pas comme seule source." },
      { t: "h2", x: "Les plateformes : bien choisir quand on démarre" },
      { t: "p", x: "Quand on lance son activité, chaque euro compte. Évitez les engagements longs et le paiement au contact tant que vous ne connaissez pas votre taux de transformation. Privilégiez les plateformes où vous ne payez rien tant qu'un client ne vous a pas choisi." },
      { t: "p", x: "Sur Rénolien, l'inscription demande un SIRET et une décennale, envoyer une offre est gratuit, et pendant la phase de lancement tout est gratuit pour les membres fondateurs. Le devis est pré-rempli par l'IA avec vos tarifs : pratique quand on n'a pas encore de logiciel de devis." },
      { t: "h2", x: "Les premiers chantiers qui construisent une réputation" },
      { t: "ul", x: [
        "Acceptez les petits chantiers bien faits : ce sont eux qui génèrent les premiers avis.",
        "Photographiez tout, avant et après, sous le même angle.",
        "Soyez irréprochable sur la propreté et la ponctualité : c'est ce dont les clients parlent.",
        "Ne bradez pas vos prix : un prix trop bas inquiète autant qu'un prix trop haut.",
      ] },
    ],
    faq: [
      ["Peut-on trouver des chantiers sans assurance décennale ?", "Pour les travaux qui en relèvent, la décennale est obligatoire et les plateformes sérieuses la demandent. Il vaut mieux l'obtenir avant de chercher des clients."],
      ["Combien de temps pour trouver ses premiers clients ?", "Souvent quelques semaines avec le réseau et les plateformes, et quelques mois pour que la fiche Google et le bouche-à-oreille prennent le relais."],
      ["La sous-traitance est-elle une bonne idée pour démarrer ?", "Oui comme complément : elle apporte du volume et des références. Mais elle ne construit pas votre propre clientèle, donc continuez à démarcher en parallèle."],
      ["Un auto-entrepreneur peut-il s'inscrire sur Rénolien ?", "Oui, avec un SIRET et une assurance décennale en cours de validité."],
    ],
    sources: [
      ["Legalstart – Trouver des chantiers en auto-entrepreneur", "https://www.legalstart.fr/fiches-pratiques/autoentrepreneur/trouver-chantier/"],
      ["Habitatpresto – Trouver des chantiers en sous-traitance", "https://www.habitatpresto.com/pro/conseils/pratiques/trouver-chantier-soustraitance"],
    ],
  },
];

export const guidePro = (slug: string) => GUIDES_PRO.find((g) => g.slug === slug);
