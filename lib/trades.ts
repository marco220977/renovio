// Corps de métier de la rénovation : libellés, exemples de saisie et modules activés.
// Le catalogue de départ de chaque métier est dans data/catalogue.ts.

export type Trade = {
  id: string;
  label: string;
  emoji: string;
  /** exemples affichés dans les champs (devis, chantier, SAV, réserves) */
  ex: { quote: string; chantier: string; sav: string; reserve: string; planning: string };
  /** module contrats et attestations d'entretien (chaudières, PAC, VMC…) */
  maintenance?: boolean;
  /** lecture de plaque signalétique par photo */
  scan?: boolean;
};

export const TRADES: Trade[] = [
  { id: "plomberie", label: "Plomberie et sanitaire", emoji: "🚿", maintenance: true, scan: true,
    ex: { quote: "Remplacement chauffe-eau 200 L", chantier: "Rénovation salle de bain Mme Fontaine", sav: "Fuite sous l'évier, chasse d'eau qui coule", reserve: "Joint silicone du receveur à reprendre", planning: "Remplacement mitigeur" } },
  { id: "chauffage", label: "Chauffage, climatisation, PAC", emoji: "🔥", maintenance: true, scan: true,
    ex: { quote: "Remplacement chaudière par PAC air/eau", chantier: "Installation PAC M. Martin", sav: "Plus d'eau chaude, chaudière en défaut F28", reserve: "Calorifuge du départ chauffage à reprendre", planning: "Entretien chaudière" } },
  { id: "electricite", label: "Électricité", emoji: "⚡", maintenance: true, scan: true,
    ex: { quote: "Mise en sécurité électrique de l'appartement", chantier: "Rénovation électrique maison Dupont", sav: "Le différentiel saute, prises sans courant", reserve: "Cache de prise manquant dans la chambre 2", planning: "Remplacement tableau électrique" } },
  { id: "maconnerie", label: "Maçonnerie et gros œuvre", emoji: "🧱",
    ex: { quote: "Ouverture d'un mur porteur avec pose d'IPN", chantier: "Création ouverture cuisine/séjour", sav: "Fissure apparue sur l'enduit", reserve: "Reprise d'enduit autour du linteau", planning: "Coulage dalle garage" } },
  { id: "platrerie", label: "Plâtrerie, plaquiste, cloisons", emoji: "📐",
    ex: { quote: "Création de cloisons et faux plafond", chantier: "Redistribution des pièces étage", sav: "Fissure sur bande de plaque", reserve: "Bande à reprendre angle couloir", planning: "Pose doublage BA13" } },
  { id: "isolation", label: "Isolation", emoji: "🧊",
    ex: { quote: "Isolation des combles perdus par soufflage", chantier: "Isolation des murs par l'intérieur", sav: "Pare-vapeur déchiré en combles", reserve: "Trappe de visite à isoler", planning: "Soufflage combles" } },
  { id: "peinture", label: "Peinture et revêtements muraux", emoji: "🎨",
    ex: { quote: "Peinture complète séjour et couloir", chantier: "Rafraîchissement appartement avant location", sav: "Cloquage de la peinture salle d'eau", reserve: "Retouche plafond chambre 1", planning: "Mise en peinture séjour" } },
  { id: "carrelage", label: "Carrelage et faïence", emoji: "🔲",
    ex: { quote: "Pose carrelage 60x60 séjour et cuisine", chantier: "Carrelage et faïence salle de bain", sav: "Carreau fissuré, joint qui se décolle", reserve: "Joint à reprendre au pied de la douche", planning: "Pose faïence salle de bain" } },
  { id: "sols", label: "Parquet et sols souples", emoji: "🪵",
    ex: { quote: "Pose parquet contrecollé chambres", chantier: "Rénovation des sols étage", sav: "Lame de parquet qui se soulève", reserve: "Plinthe à refixer dans le couloir", planning: "Ponçage et vitrification parquet" } },
  { id: "menuiserie", label: "Menuiserie (fenêtres, portes, volets)", emoji: "🚪",
    ex: { quote: "Remplacement de 6 fenêtres PVC double vitrage", chantier: "Remplacement menuiseries maison Leroy", sav: "Fenêtre qui ferme mal, volet roulant bloqué", reserve: "Réglage ouvrant fenêtre cuisine", planning: "Pose porte d'entrée" } },
  { id: "couverture", label: "Couverture, charpente, zinguerie", emoji: "🏠",
    ex: { quote: "Réfection de couverture en tuiles", chantier: "Rénovation toiture et gouttières", sav: "Infiltration au niveau de la cheminée", reserve: "Tuile de rive à refixer", planning: "Remplacement gouttières" } },
  { id: "facade", label: "Façade et ravalement", emoji: "🏢",
    ex: { quote: "Ravalement de façade avec enduit", chantier: "Ravalement et isolation extérieure", sav: "Enduit qui se décolle sous la fenêtre", reserve: "Retouche enduit autour de la descente", planning: "Nettoyage façade" } },
  { id: "agencement", label: "Cuisine, salle de bain, agencement", emoji: "🛁",
    ex: { quote: "Rénovation complète salle de bain clé en main", chantier: "Cuisine équipée M. et Mme Bernard", sav: "Porte de meuble à régler", reserve: "Fileur à poser en bout de plan", planning: "Pose cuisine" } },
  { id: "exterieur", label: "Terrassement, VRD, extérieurs", emoji: "🚜",
    ex: { quote: "Création d'une terrasse et d'une allée", chantier: "Mise aux normes assainissement", sav: "Affaissement de l'allée", reserve: "Regard à mettre à niveau", planning: "Terrassement terrasse" } },
  { id: "multiservice", label: "Petits travaux et multiservice", emoji: "🧰",
    ex: { quote: "Petits travaux de remise en état", chantier: "Remise en état appartement après locataire", sav: "Poignée de porte cassée", reserve: "Butée de porte à poser", planning: "Montage de meubles" } },
];

export const TRADE = Object.fromEntries(TRADES.map((t) => [t.id, t])) as Record<string, Trade>;

export const tradesOf = (ids?: string[] | null) => (ids || []).map((i) => TRADE[i]).filter(Boolean) as Trade[];

/** exemple à afficher : celui du premier métier de l'entreprise, sinon générique */
export function example(ids: string[] | null | undefined, key: keyof Trade["ex"]) {
  const t = tradesOf(ids)[0];
  return t ? `Ex : ${t.ex[key]}` : "";
}

/** modules activés selon les métiers (aucun métier choisi = tout afficher) */
export function modules(ids?: string[] | null) {
  const ts = tradesOf(ids);
  if (!ts.length) return { maintenance: true, scan: true };
  return { maintenance: ts.some((t) => t.maintenance), scan: ts.some((t) => t.scan) };
}

export const tradeLabel = (ids?: string[] | null) => tradesOf(ids).map((t) => t.label).join(", ");
