import { SUPABASE_URL } from "@/lib/config";

export type Realisation = {
  id: string; artisan_id?: string; chemin: string; avant?: string | null; legende?: string | null; metier?: string | null;
  ville?: string | null; ordre?: number; statut?: "attente" | "publiee" | "refusee"; motif?: string | null; created_at?: string;
};

/** Adresse publique d'une photo du dossier « realisations » */
export const photoUrl = (chemin?: string | null) => (chemin ? `${SUPABASE_URL}/storage/v1/object/public/realisations/${chemin}` : "");

// Invitation « Demander un devis à cet artisan » : gardée 7 jours sur l'appareil, le temps que le client crée son compte
const CLE = "renolien_invite";
export type Invite = { id: string; nom: string; slug: string; t: number };
export function lireInvite(): Invite | null {
  try { const v = JSON.parse(localStorage.getItem(CLE) || "null"); return v && Date.now() - v.t < 7 * 86400000 ? v : null; } catch { return null; }
}
export function ecrireInvite(v: Omit<Invite, "t"> | null) {
  try { if (v) localStorage.setItem(CLE, JSON.stringify({ ...v, t: Date.now() })); else localStorage.removeItem(CLE); } catch { /* navigation privée */ }
}
