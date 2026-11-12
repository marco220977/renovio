// Formules d'abonnement des artisans : l'artisan paie au client qui le choisit (pas à l'offre envoyée)
export type Abonnement = "gratuit" | "essentiel" | "pro" | "illimite";
/** quota : clients par mois (null = illimité) · attente : offres en attente de réponse en même temps (null = illimité) */
export const FORMULES: { id: Abonnement; nom: string; prix: number; quota: number | null; attente: number | null; plus: string }[] = [
  { id: "gratuit", nom: "Découverte", prix: 0, quota: 1, attente: 5, plus: "Pour essayer" },
  { id: "essentiel", nom: "Essentiel", prix: 29, quota: 4, attente: 15, plus: "Artisan seul" },
  { id: "pro", nom: "Pro", prix: 49, quota: 12, attente: 40, plus: "Le plus choisi" },
  { id: "illimite", nom: "Illimité", prix: 79, quota: null, attente: null, plus: "Sans limite" },
];
export const texteClients = (q: number | null) => (q === null ? "Clients illimités" : `${q} client${q > 1 ? "s" : ""} par mois`);
export const texteAttente = (n: number | null) => (n === null ? "offres illimitées" : `${n} offres en attente max.`);
