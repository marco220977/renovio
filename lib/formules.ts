// Formules d'abonnement des artisans (offres par mois, prix par mois)
export type Abonnement = "gratuit" | "essentiel" | "pro" | "illimite";
/** Formules artisans : offres par mois (null = illimité), prix par mois */
export const FORMULES: { id: Abonnement; nom: string; prix: number; quota: number | null; plus: string }[] = [
  { id: "gratuit", nom: "Découverte", prix: 0, quota: 3, plus: "Pour essayer" },
  { id: "essentiel", nom: "Essentiel", prix: 29, quota: 10, plus: "Artisan seul" },
  { id: "pro", nom: "Pro", prix: 49, quota: 30, plus: "Le plus choisi" },
  { id: "illimite", nom: "Illimité", prix: 79, quota: null, plus: "Sans limite" },
];
