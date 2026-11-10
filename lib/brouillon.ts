"use client";
// Sauvegarde automatique de la demande en cours sur le téléphone (localStorage).
const cle = (uid: string) => `renovio-brouillon-${uid}`;
const clePhotos = (uid: string) => `renovio-brouillon-photos-${uid}`;

export type Brouillon = Record<string, unknown> & { maj?: number; etape?: number; description?: string; titre?: string };

export function lireBrouillon(uid: string): { data: Brouillon | null; photos: { grande: string; petite: string }[] } {
  try {
    const data = JSON.parse(localStorage.getItem(cle(uid)) || "null");
    const photos = JSON.parse(localStorage.getItem(clePhotos(uid)) || "[]");
    return { data, photos: Array.isArray(photos) ? photos : [] };
  } catch { return { data: null, photos: [] }; }
}

export function ecrireBrouillon(uid: string, data: Brouillon) {
  try { localStorage.setItem(cle(uid), JSON.stringify({ ...data, maj: Date.now() })); } catch {}
}

/** Photos à part : si la mémoire est pleine, on garde seulement les petites versions */
export function ecrirePhotos(uid: string, photos: { grande: string; petite: string }[]) {
  try { localStorage.setItem(clePhotos(uid), JSON.stringify(photos)); return; } catch {}
  try { localStorage.setItem(clePhotos(uid), JSON.stringify(photos.map((p) => ({ grande: p.petite, petite: p.petite })))); } catch {}
}

export function effacerBrouillon(uid: string) {
  try { localStorage.removeItem(cle(uid)); localStorage.removeItem(clePhotos(uid)); } catch {}
}

export const aDuContenu = (b: Brouillon | null) => !!b && !!(String(b.description || "").trim() || b.etape && Number(b.etape) > 1);
