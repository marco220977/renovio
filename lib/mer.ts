"use client";
// Mise en relation : types, règles d'affichage, score des offres et appels à l'IA.
import { sb } from "./supabase";
import type { Line } from "./types";

export type Role = "client" | "artisan" | "admin";
export type Profil = { id: string; role: Role; nom?: string; telephone?: string; email?: string };

export type Artisan = {
  id: string; created_at?: string; raison_sociale?: string; forme?: string; siret?: string; adresse?: string; cp?: string; ville?: string;
  telephone?: string; email?: string; metiers: string[]; departements: string[]; decennale?: string; decennale_fin?: string | null;
  rge?: boolean; tva_franchise?: boolean; presentation?: string; verifie?: boolean; statut?: string;
  abonnement?: Abonnement; abonnement_fin?: string | null; bonus_offres?: number; stripe_subscription_id?: string | null;
};

export type { Abonnement } from "./formules";
export { FORMULES } from "./formules";
import type { Abonnement } from "./formules";

export type Message = {
  id: string; demande_id: string; artisan_id: string; created_at: string; auteur: "client" | "artisan"; texte?: string;
  kind: "texte" | "visite"; creneau?: string; visite_statut?: "proposee" | "acceptee" | "refusee"; lu?: boolean;
};

export type Avenant = {
  id: string; offre_id: string; created_at: string; numero?: string; motif: string; lignes: Line[];
  total_ht: number; total_tva: number; total_ttc: number; statut: "propose" | "accepte" | "refuse" | "retire";
  signe_le?: string; signataire?: string; signature?: string;
};

export type Tarif = { id: string; metier?: string; categorie?: string; libelle: string; description?: string; unite: string; prix_ht: number; tva: number };

export type Question = { id: string; question: string; type: "choix" | "texte" | "nombre"; options?: string[]; unite?: string };
export type Cahier = {
  titre: string; metiers: string[]; resume: string;
  lots: { titre: string; metier?: string; postes: { designation: string; quantite?: number; unite?: string; precisions?: string }[] }[];
  budget_min: number; budget_max: number; points_attention?: string[]; hypotheses?: string[];
};

export type Demande = {
  id: string; client_id: string; created_at: string; titre?: string; description: string;
  reponses: { question: string; reponse: string }[]; cahier?: Cahier | null; metiers: string[];
  cp: string; ville?: string; departement: string; delai?: string; budget_min?: number; budget_max?: number;
  photos: string[]; statut: "brouillon" | "ouverte" | "fermee" | "en_cours" | "attribuee" | "annulee"; publiee_le?: string; ferme_le?: string;
};

export type Offre = {
  id: string; demande_id: string; artisan_id: string; created_at: string; updated_at: string; numero?: string;
  lignes: Line[]; total_ht: number; total_tva: number; total_ttc: number; delai_jours?: number; duree_jours?: number;
  message?: string; validite_jours?: number; modifiee?: boolean;
  statut: "envoyee" | "choisie" | "confirmee" | "acceptee" | "refusee" | "retiree" | "retractee";
  signe_le?: string; signataire?: string; signature?: string;
  lignes_initiales?: Line[] | null; total_ttc_initial?: number | null; choisie_le?: string; confirmee_le?: string; retractee_le?: string;
};

export const DELAIS = ["urgent", "dans le mois", "dans 1 à 3 mois", "pas pressé"];

/** Département à partir du code postal (Corse = 20, outre-mer = 3 chiffres) */
export function departementDe(cp: string) {
  const c = (cp || "").replace(/\s/g, "");
  if (!/^\d{5}$/.test(c)) return "";
  return c.startsWith("97") || c.startsWith("98") ? c.slice(0, 3) : c.slice(0, 2);
}

/** Statut affiché (une demande ouverte dont le délai est passé est « fermée ») */
export function statutDemande(d: Pick<Demande, "statut" | "ferme_le">) {
  if (d.statut === "ouverte" && d.ferme_le && new Date(d.ferme_le) < new Date()) return "fermee";
  return d.statut;
}

export const STATUT_DEMANDE: Record<string, [string, string]> = {
  brouillon: ["Brouillon", "bg-slate-100 text-slate-700"],
  ouverte: ["En attente d'offres", "bg-blue-100 text-blue-800"],
  fermee: ["Offres à comparer", "bg-amber-100 text-amber-800"],
  en_cours: ["Visite / devis définitif", "bg-violet-100 text-violet-800"],
  attribuee: ["Artisan choisi", "bg-green-100 text-green-800"],
  annulee: ["Annulée", "bg-red-100 text-red-700"],
};

export const STATUT_OFFRE: Record<string, [string, string]> = {
  envoyee: ["Envoyée", "bg-blue-100 text-blue-800"],
  choisie: ["Choisi par le client", "bg-violet-100 text-violet-800"],
  confirmee: ["Devis définitif envoyé", "bg-violet-100 text-violet-800"],
  retractee: ["Client rétracté", "bg-red-100 text-red-700"],
  acceptee: ["Retenue", "bg-green-100 text-green-800"],
  refusee: ["Non retenue", "bg-slate-100 text-slate-600"],
  retiree: ["Retirée", "bg-slate-100 text-slate-600"],
};

/** Temps restant avant fermeture, ex : « 2 j 5 h » */
export function tempsRestant(ferme_le?: string) {
  if (!ferme_le) return "";
  const ms = new Date(ferme_le).getTime() - Date.now();
  if (ms <= 0) return "fermée";
  const h = Math.floor(ms / 3.6e6);
  return h >= 24 ? `${Math.floor(h / 24)} j ${h % 24} h` : `${h} h ${Math.floor((ms % 3.6e6) / 6e4)} min`;
}

/** Score sur 100 : prix (40) + avis (30) + délai (15) + profil (15), moins une pénalité si l'artisan
 *  augmente souvent ses prix après la visite (écart moyen devis provisoire → définitif) */
export function scoreOffre(o: Offre, a: Artisan | undefined, note: { note: number; nb_avis: number } | undefined,
  d: Pick<Demande, "budget_min" | "budget_max">, toutes: Offre[], ecart?: number | null) {
  const prix = Number(o.total_ttc) || 0;
  const mini = Math.min(...toutes.map((x) => Number(x.total_ttc) || Infinity));
  let p = mini > 0 && prix > 0 ? 40 * (mini / prix) : 20;
  const bmin = Number(d.budget_min) || 0;
  if (bmin && prix < bmin * 0.7) p = Math.min(p, 28); // prix anormalement bas : on ne le récompense pas
  const n = note?.nb_avis ? 30 * ((note.note - 1) / 4) * Math.min(1, 0.6 + note.nb_avis * 0.1) : 15; // pas d'avis = neutre
  const dj = Number(o.delai_jours);
  const del = isNaN(dj) ? 7 : dj <= 7 ? 15 : dj <= 14 ? 12 : dj <= 30 ? 9 : dj <= 60 ? 5 : 2;
  let prof = 0;
  if (a?.verifie) prof += 6;
  if (a?.rge) prof += 4;
  if (a?.decennale) prof += 3;
  if (a?.presentation) prof += 2;
  const penalite = ecart && ecart > 5 ? Math.min(15, Math.round((ecart - 5) * 0.6)) : 0;
  return Math.max(0, Math.round(p + n + del + Math.min(15, prof) - penalite));
}

/** Écart en % entre deux montants */
export const ecartPct = (avant?: number | null, apres?: number | null) =>
  avant && apres ? Math.round(((Number(apres) / Number(avant)) - 1) * 1000) / 10 : 0;

/** Date et heure lisibles : « mar. 12 nov. à 14:30 » */
export const quand = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};

/** Alerte si le prix est plus de 30 % sous la fourchette estimée */
export const prixTresBas = (ttc: number, d: Pick<Demande, "budget_min">) =>
  !!d.budget_min && ttc < Number(d.budget_min) * 0.7;

/** Appel à la fonction IA « travaux-ia » */
export async function ia<T = any>(action: "questions" | "cahier" | "devis", body: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().functions.invoke("travaux-ia", { body: { action, ...body } });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Message d'erreur Supabase lisible */
export const errMsg = (e: any) => (e?.message || String(e || "Erreur")).replace(/^.*?ERROR:\s*/, "");

/** Photo réduite (pour l'IA et le stockage) */
export async function compresser(file: File, max = 1280, q = 0.75): Promise<string> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", q);
}

export const dataUrlToBlob = (u: string) => {
  const [h, b] = u.split(",");
  const bin = atob(b); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: /data:(.*?);/.exec(h)?.[1] || "image/jpeg" });
};

/** URLs temporaires des photos d'une demande */
export async function urlsPhotos(paths: string[]): Promise<string[]> {
  if (!paths?.length) return [];
  const { data } = await sb().storage.from("demandes").createSignedUrls(paths, 3600);
  return (data || []).map((x: any) => x.signedUrl).filter(Boolean);
}
