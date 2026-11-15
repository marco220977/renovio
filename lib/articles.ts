// Articles conseils (blog) : contenu pour Google et pour rassurer les particuliers.
// Chaque bloc : { t: "h2" | "p" | "ul" | "astuce", ... }. Les prix sont des fourchettes indicatives relevées en 2026.

export type Bloc =
  | { t: "h2"; x: string }
  | { t: "p"; x: string }
  | { t: "ul"; x: string[] }
  | { t: "tableau"; entetes: string[]; lignes: string[][] }
  | { t: "astuce"; x: string };

export type Article = {
  slug: string;
  titre: string;        // titre Google (court)
  h1: string;
  description: string;  // meta description
  date: string;         // AAAA-MM-JJ
  lecture: number;      // minutes
  emoji: string;
  metier: string;       // slug METIERS_SEO pour le bouton « trouver un artisan »
  chapo: string;
  blocs: Bloc[];
  faq: [string, string][];
  sources: [string, string][];
};

export const ARTICLES: Article[] = [
  {
    slug: "prix-renovation-salle-de-bain-ile-de-france",
    titre: "Prix rénovation salle de bain 2026 en Île-de-France",
    h1: "Combien coûte la rénovation d'une salle de bain en Île-de-France en 2026 ?",
    description: "Prix au m², budget pour 4, 6 ou 10 m², ce qui fait grimper la facture et comment payer le juste prix : le guide 2026 pour rénover sa salle de bain en Île-de-France.",
    date: "2026-11-15",
    lecture: 5,
    emoji: "🛁",
    metier: "renovation-salle-de-bain-cuisine",
    chapo: "Rafraîchir une salle d'eau ou tout casser pour créer une douche à l'italienne, ce n'est pas le même budget. Voici les fourchettes de prix observées en 2026, ce qui les fait varier en région parisienne, et comment comparer les devis sans se tromper.",
    blocs: [
      { t: "h2", x: "Les prix au m² selon le type de rénovation" },
      { t: "p", x: "Le prix d'une salle de bain se raisonne d'abord par niveau de travaux. Les relevés de prix publiés en 2026 donnent les ordres de grandeur suivants, fournitures et pose comprises :" },
      { t: "tableau", entetes: ["Type de travaux", "Ce que ça comprend", "Prix indicatif"], lignes: [
        ["Rafraîchissement", "Peinture, nouveaux meubles et robinetterie, sans toucher à la plomberie", "400 à 900 €/m²"],
        ["Rénovation intermédiaire", "Remplacement baignoire/douche, faïence, petites modifications de plomberie", "800 à 1 500 €/m²"],
        ["Rénovation complète", "Tout est refait : réseaux, sol, murs, équipements, douche italienne", "1 000 à 3 000 €/m²"],
      ] },
      { t: "p", x: "Attention au piège du prix au m² : une petite pièce coûte proportionnellement plus cher, car une douche, un WC ou un meuble vasque coûtent le même prix dans 4 m² que dans 10 m². Pour une grande salle de bain de 10 m² entièrement rénovée, on observe souvent un budget de l'ordre de 9 000 à 13 000 €." },
      { t: "h2", x: "Pourquoi c'est plus cher en Île-de-France" },
      { t: "p", x: "En région parisienne, la main-d'œuvre coûte en moyenne 15 à 30 % de plus qu'en province. S'y ajoutent des contraintes propres à la ville : appartement en étage sans ascenseur, stationnement payant pour la camionnette, évacuation des gravats, horaires imposés par la copropriété. Un bon artisan les intègre dans son devis ; méfiez-vous d'un prix très bas qui les oublie." },
      { t: "h2", x: "Ce qui fait grimper la facture" },
      { t: "ul", x: [
        "Déplacer une arrivée d'eau ou une évacuation (créer une pente pour une douche à l'italienne, déplacer le WC).",
        "Remplacer une baignoire par une douche à l'italienne : il faut souvent reprendre la chape et l'étanchéité.",
        "Les canalisations anciennes (plomb, acier galvanisé) à remplacer une fois les murs ouverts.",
        "La gamme des équipements : un mitigeur thermostatique ou un carrelage grand format changent vite le total.",
        "La mise aux normes électriques de la pièce (volumes de sécurité, différentiel 30 mA).",
      ] },
      { t: "astuce", x: "Conseil de plombier : profitez des travaux pour remplacer les vannes d'arrêt et vérifier l'état des évacuations. Ça coûte peu quand tout est ouvert, et très cher une fois le carrelage posé." },
      { t: "h2", x: "Comment être sûr de payer le juste prix" },
      { t: "p", x: "La seule méthode fiable, c'est de comparer plusieurs devis détaillés pour le même projet. Pour qu'ils soient comparables, décrivez les travaux de la même façon à chaque artisan : dimensions, photos, ce que vous gardez, ce que vous voulez changer." },
      { t: "ul", x: [
        "Exigez un devis poste par poste (dépose, plomberie, carrelage, équipements), pas un forfait global.",
        "Vérifiez que les fournitures sont précisées (marque, référence ou gamme).",
        "Demandez l'attestation d'assurance décennale : la rénovation d'une salle de bain touche à l'étanchéité.",
        "Comparez aussi les délais et la durée du chantier, pas seulement le prix.",
      ] },
      { t: "p", x: "C'est exactement le principe de Rénolien : vous décrivez votre salle de bain une seule fois, avec vos photos, notre assistant prépare un cahier des charges clair, et jusqu'à 5 artisans vérifiés de votre secteur vous envoient un devis comparable. Gratuit et sans engagement." },
    ],
    faq: [
      ["Quel budget pour refaire une petite salle de bain de 4 m² ?", "Pour une rénovation complète d'une petite salle de bain, comptez généralement à partir de 4 000 à 6 000 € en Île-de-France, selon la gamme des équipements et les travaux de plomberie. Un simple rafraîchissement peut coûter moins de 3 000 €."],
      ["Combien de temps durent les travaux ?", "Comptez souvent 1 semaine pour un rafraîchissement et 2 à 3 semaines pour une rénovation complète, temps de séchage compris."],
      ["Faut-il l'accord de la copropriété ?", "Non pour des travaux intérieurs classiques. En revanche, si vous touchez aux colonnes communes (évacuation, eau) ou si vous déplacez une pièce d'eau, prévenez le syndic et vérifiez le règlement de copropriété."],
    ],
    sources: [
      ["Habitatpresto – prix rénovation salle de bain 2026", "https://www.habitatpresto.com/mag/salle-de-bain-wc/prix-renovation-salle-bain"],
      ["Espace Aubade – budgets types pour 3, 5 et 10 m²", "https://www.espace-aubade.fr/blog/salle-de-bains/prix-renovation-salle-de-bain-cout-m2-budget.html"],
      ["La Maison Saint-Gobain – prix de rénovation 2026", "https://www.lamaisonsaintgobain.fr/guides-travaux/renovation-maison/renover-une-maison-les-etapes-et-bonnes-pratiques"],
    ],
  },
  {
    slug: "remplacer-chaudiere-gaz-ou-pompe-a-chaleur-prix",
    titre: "Remplacer sa chaudière en 2026 : gaz ou pompe à chaleur ?",
    h1: "Remplacer sa chaudière gaz en 2026 : chaudière neuve ou pompe à chaleur, quel prix ?",
    description: "Chaudière gaz à condensation ou pompe à chaleur air-eau : prix pose comprise en 2026, aides, coût à l'usage et conseils d'un chauffagiste pour bien choisir.",
    date: "2026-11-15",
    lecture: 5,
    emoji: "🔥",
    metier: "chauffagiste",
    chapo: "Votre chaudière a 15 ou 20 ans, elle tombe en panne ou consomme trop ? En 2026, deux options dominent : une chaudière gaz à condensation neuve ou une pompe à chaleur air-eau. Voici les prix, les aides et les questions à se poser, expliqués par un chauffagiste.",
    blocs: [
      { t: "h2", x: "Les prix pose comprise en 2026" },
      { t: "tableau", entetes: ["Solution", "Prix indicatif pose comprise", "Aides publiques"], lignes: [
        ["Chaudière gaz à condensation murale", "2 500 à 5 500 €", "Aucune en 2026"],
        ["Chaudière gaz à condensation au sol", "4 500 à 8 500 €", "Aucune en 2026"],
        ["Pompe à chaleur air-eau", "10 000 à 16 000 €", "MaPrimeRénov' et prime CEE, selon vos revenus"],
      ] },
      { t: "p", x: "Pour une chaudière gaz, la TVA sur l'installation est passée à 20 % depuis le 1er mars 2025, et les aides publiques ne financent plus le gaz. À l'inverse, la pompe à chaleur reste aidée quand elle remplace une chaudière gaz, fioul ou charbon : le montant dépend de vos revenus et évolue régulièrement, vérifiez-le sur france-renov.gouv.fr avant de signer." },
      { t: "h2", x: "Le coût à l'usage change tout" },
      { t: "p", x: "La pompe à chaleur coûte plus cher à l'achat, mais elle produit environ 3 kWh de chaleur pour 1 kWh d'électricité consommé. Avec les prix de l'énergie de 2026, le kWh de chaleur revient à peu près deux fois moins cher qu'avec le gaz. Sur une maison bien chauffée, l'écart d'investissement peut se rattraper en quelques années, surtout après les aides." },
      { t: "h2", x: "Les questions à se poser avant de choisir" },
      { t: "ul", x: [
        "Vos radiateurs : une PAC fonctionne mieux avec des radiateurs bien dimensionnés ou un plancher chauffant. Des petits radiateurs en fonte demandent une PAC haute température ou un complément.",
        "La place dehors : il faut installer l'unité extérieure (bruit, distance avec les voisins, règles de copropriété).",
        "L'isolation : si la maison est une passoire, isoler d'abord permet d'installer une PAC plus petite, donc moins chère.",
        "En appartement avec chaudière murale, le remplacement par une chaudière à condensation reste souvent la solution la plus simple.",
        "L'eau chaude : prévoyez un ballon si la PAC doit aussi produire l'eau chaude sanitaire.",
      ] },
      { t: "astuce", x: "Conseil de chauffagiste : demandez toujours une étude de dimensionnement (calcul des déperditions pièce par pièce). Une PAC trop puissante s'use vite, une PAC trop faible vous laissera avoir froid en janvier." },
      { t: "h2", x: "Choisir le bon installateur" },
      { t: "ul", x: [
        "Pour toucher MaPrimeRénov' et la prime CEE, l'installateur doit être certifié RGE pour ce type de travaux.",
        "Pour le gaz, il doit avoir les qualifications pour intervenir sur une installation gaz et vous remettre le certificat de conformité.",
        "Demandez plusieurs devis détaillés : marque et puissance de l'appareil, dépose de l'ancienne chaudière, raccordements, mise en service.",
      ] },
      { t: "p", x: "Sur Rénolien, vous décrivez votre installation actuelle avec quelques photos, et jusqu'à 5 chauffagistes vérifiés de votre secteur vous répondent. Le badge RGE est contrôlé automatiquement sur le registre officiel de l'ADEME." },
    ],
    faq: [
      ["Peut-on encore installer une chaudière gaz en 2026 ?", "Oui, le remplacement d'une chaudière gaz existante reste autorisé. En revanche, elle n'est plus aidée et la TVA sur la pose est à 20 %."],
      ["Une pompe à chaleur fonctionne-t-elle avec mes radiateurs actuels ?", "Souvent oui, si les radiateurs sont assez grands. Un chauffagiste doit vérifier la température d'eau nécessaire pour chauffer votre logement par grand froid."],
      ["Combien de temps dure l'installation ?", "Comptez en général une journée pour remplacer une chaudière murale, et 2 à 3 jours pour installer une pompe à chaleur air-eau."],
    ],
    sources: [
      ["Selectra – prix d'une chaudière gaz en 2026", "https://climate.selectra.com/fr/renovation-energetique/chaudiere/gaz/prix"],
      ["Hellowatt – remplacer une chaudière gaz par une pompe à chaleur", "https://www.hellowatt.fr/chaudiere/gaz/remplacement-pompe-a-chaleur"],
      ["France Rénov' – aides officielles", "https://france-renov.gouv.fr"],
    ],
  },
  {
    slug: "comment-choisir-un-artisan-fiable",
    titre: "Comment choisir un artisan fiable : 7 vérifications",
    h1: "Comment choisir un artisan fiable pour vos travaux : les 7 vérifications à faire",
    description: "SIRET, assurance décennale, RGE, devis détaillé, acompte… Les 7 points à vérifier avant de confier vos travaux à un artisan, expliqués simplement.",
    date: "2026-11-15",
    lecture: 4,
    emoji: "🔍",
    metier: "petits-travaux",
    chapo: "Un chantier raté, c'est de l'argent perdu et des mois de tracas. La bonne nouvelle : quelques vérifications simples, qui prennent dix minutes, éliminent la grande majorité des mauvaises surprises.",
    blocs: [
      { t: "h2", x: "1. L'entreprise existe vraiment (numéro SIRET)" },
      { t: "p", x: "Tout artisan doit indiquer son numéro SIRET sur ses devis et factures. Vérifiez-le gratuitement sur annuaire-entreprises.data.gouv.fr : l'entreprise doit être « active », et son activité doit correspondre aux travaux demandés. Une entreprise créée il y a trois semaines n'est pas forcément mauvaise, mais posez des questions sur l'expérience." },
      { t: "h2", x: "2. L'assurance décennale" },
      { t: "p", x: "Pour tous les travaux qui touchent à la solidité ou à l'étanchéité du logement (toiture, maçonnerie, salle de bain, chauffage…), l'artisan doit être assuré en responsabilité décennale. Demandez l'attestation avant de signer et vérifiez trois choses : le nom de l'entreprise, les activités couvertes, et les dates de validité." },
      { t: "h2", x: "3. La certification RGE si vous voulez des aides" },
      { t: "p", x: "Pour obtenir MaPrimeRénov' ou une prime énergie (isolation, pompe à chaleur, fenêtres…), l'entreprise doit être certifiée RGE pour le type de travaux concerné. La liste officielle est consultable sur france-renov.gouv.fr." },
      { t: "h2", x: "4. Un devis détaillé et daté" },
      { t: "ul", x: [
        "Le détail poste par poste, avec les quantités et les prix unitaires.",
        "Les fournitures précisées (marque, gamme ou référence).",
        "Les dates de début et la durée du chantier, la durée de validité du devis.",
        "Le taux de TVA appliqué et le total TTC.",
      ] },
      { t: "h2", x: "5. Un acompte raisonnable" },
      { t: "p", x: "Un acompte à la commande est normal pour acheter le matériel, souvent autour de 30 %. Méfiez-vous d'une demande de paiement total avant le début des travaux, ou d'un paiement en espèces sans facture." },
      { t: "h2", x: "6. Les avis et les réalisations" },
      { t: "p", x: "Demandez des photos de chantiers similaires, lisez les avis laissés par d'autres clients, et n'hésitez pas à demander le contact d'un ancien client." },
      { t: "h2", x: "7. Comparer plusieurs devis" },
      { t: "p", x: "Comparer 3 à 5 devis pour le même projet permet de repérer un prix anormalement bas (travaux oubliés) ou anormalement haut. Pour que la comparaison ait du sens, chaque artisan doit chiffrer exactement les mêmes travaux." },
      { t: "astuce", x: "Sur Rénolien, une partie du travail est faite pour vous : le SIRET de chaque artisan est vérifié à l'inscription, son attestation décennale est contrôlée, le badge RGE est vérifié sur le registre officiel, et les 5 devis que vous recevez partent du même cahier des charges." },
    ],
    faq: [
      ["L'assurance décennale est-elle obligatoire pour tous les travaux ?", "Elle est obligatoire pour les travaux qui relèvent de la construction ou qui touchent à la solidité et à l'étanchéité du bâtiment. Pour de la simple peinture décorative, elle n'est généralement pas exigée, mais un artisan sérieux est quand même assuré en responsabilité civile professionnelle."],
      ["Combien de devis faut-il demander ?", "Trois devis sont un minimum pour comparer, cinq permettent d'avoir une vraie idée du prix du marché."],
      ["Que faire si l'artisan refuse de montrer son attestation d'assurance ?", "Ne signez pas. Fournir l'attestation d'assurance est une obligation, et un artisan sérieux la donne sans difficulté."],
    ],
    sources: [
      ["Annuaire des entreprises (État)", "https://annuaire-entreprises.data.gouv.fr"],
      ["France Rénov' – trouver un artisan RGE", "https://france-renov.gouv.fr"],
    ],
  },
];

export const article = (slug: string) => ARTICLES.find((a) => a.slug === slug);
