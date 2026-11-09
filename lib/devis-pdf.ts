"use client";
// PDF du devis d'une offre, avec le générateur de devis existant (lib/pdf.ts).
import { buildPdf } from "./pdf";
import type { Company, Doc } from "./types";
import type { Artisan, Demande, Offre } from "./mer";

export function versDevis(o: Offre, a: Artisan, d: Pick<Demande, "titre" | "cp" | "ville" | "cahier">,
  contact?: { nom?: string; telephone?: string; email?: string; adresse?: string } | null): { doc: Doc; company: Company } {
  const company: Company = {
    id: a.id, name: a.raison_sociale || "Entreprise", legal_form: a.forme, siret: a.siret, address: a.adresse,
    zip: a.cp, city: a.ville, phone: a.telephone, email: a.email, vat_exempt: !!a.tva_franchise,
    insurance: a.decennale ? `${a.decennale}${a.decennale_fin ? ` (valable jusqu'au ${new Date(a.decennale_fin).toLocaleDateString("fr-FR")})` : ""}` : undefined,
    quote_validity_days: o.validite_jours,
  };
  const emis = (o.updated_at || o.created_at).slice(0, 10);
  const fin = new Date(o.updated_at || o.created_at); fin.setDate(fin.getDate() + (o.validite_jours || 30));
  const notes = [
    o.message,
    o.delai_jours != null ? `Démarrage possible sous ${o.delai_jours} jours après accord.` : "",
    o.duree_jours ? `Durée estimée des travaux : ${o.duree_jours} jours.` : "",
  ].filter(Boolean).join(" ");
  const doc: Doc = {
    id: o.id, kind: "quote", number: o.numero, status: o.statut === "acceptee" ? "signed" : "sent",
    client_snapshot: { name: contact?.nom || "Client Rénovio", address: contact?.adresse, zip: d.cp, city: d.ville,
      phone: contact?.telephone, email: contact?.email },
    title: d.cahier?.titre || d.titre, site_address: contact?.adresse ? `${contact.adresse}, ${d.cp} ${d.ville || ""}` : `${d.cp} ${d.ville || ""}`,
    issue_date: emis, valid_until: fin.toISOString().slice(0, 10), lines: o.lignes || [], notes,
    signed_at: o.signe_le, signer_name: o.signataire, signature_data: o.signature,
  };
  return { doc, company };
}

export async function telechargerDevis(...args: Parameters<typeof versDevis>) {
  const { doc, company } = versDevis(...args);
  const pdf = await buildPdf(doc, company);
  const blob = pdf.output("blob");
  const file = new File([blob], `${doc.number || "devis"}.pdf`, { type: "application/pdf" });
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: doc.number }); return; } catch {}
  }
  pdf.save(file.name);
}
