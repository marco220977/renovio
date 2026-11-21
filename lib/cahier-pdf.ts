"use client";
// PDF du cahier des charges d'une demande (disponible avant de recevoir les offres).
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { money, pt } from "./pdf";
import type { Demande } from "./mer";
import { TRADES } from "./trades";

// Police standard : on retire les caractères qu'elle ne sait pas afficher (émojis, flèches…)
const t = (s?: string | null) => pt(s).replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/→/g, "->").replace(/≈/g, "env. ")
  .replace(/[^\x20-\x7E\xA0-\xFF€œŒ\n]/g, "").trim();

export async function ouvrirCahierPdf(d: Demande) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 15, L = W - 2 * M;
  const c = d.cahier;
  let y = M;
  const saut = (h: number) => { if (y + h > 282) { pdf.addPage(); y = M; } };
  const titreSection = (s: string) => {
    saut(14); y += 4;
    pdf.setFont("helvetica", "bold").setFontSize(12).setTextColor(234, 88, 12).text(t(s), M, y);
    pdf.setTextColor(15, 23, 42); y += 6;
  };
  const paragraphe = (s: string, taille = 10) => {
    pdf.setFont("helvetica", "normal").setFontSize(taille);
    for (const l of pdf.splitTextToSize(t(s), L)) { saut(5); pdf.text(l, M, y); y += 4.6; }
  };

  // En-tête
  pdf.setFont("helvetica", "bold").setFontSize(18).setTextColor(15, 23, 42).text("Réno", M, y + 6);
  pdf.setTextColor(234, 88, 12).text("lien", M + pdf.getTextWidth("Réno"), y + 6);
  pdf.setTextColor(100, 116, 139).setFont("helvetica", "normal").setFontSize(9)
    .text(`Cahier des charges · ${new Date(d.created_at).toLocaleDateString("fr-FR")}`, W - M, y + 6, { align: "right" });
  y += 16;
  pdf.setTextColor(15, 23, 42).setFont("helvetica", "bold").setFontSize(16);
  for (const l of pdf.splitTextToSize(t(c?.titre || d.titre || "Projet de travaux"), L)) { pdf.text(l, M, y); y += 7; }
  pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(71, 85, 105);
  const metiers = (d.metiers || []).map((m) => TRADES.find((x) => x.id === m)?.label || m).join(", ");
  pdf.text(t(`${d.ville || ""} ${d.cp}${d.delai ? ` · Délai souhaité : ${d.delai}` : ""}`), M, y); y += 5;
  if (metiers) { pdf.text(t(`Métiers : ${metiers}`), M, y); y += 5; }
  pdf.setTextColor(15, 23, 42);

  if (c?.resume) { titreSection("Résumé du projet"); paragraphe(c.resume); }
  titreSection("Description du client"); paragraphe(d.description);

  const rep = (d.reponses || []).filter((r) => r.reponse);
  if (rep.length) {
    titreSection("Précisions");
    autoTable(pdf, { startY: y, margin: { left: M, right: M }, theme: "plain", styles: { fontSize: 9.5, cellPadding: 1.6 },
      columnStyles: { 0: { cellWidth: 85, textColor: [100, 116, 139] }, 1: { fontStyle: "bold" } },
      body: rep.map((r) => [t(r.question), t(r.reponse)]) });
    y = (pdf as any).lastAutoTable.finalY + 2;
  }

  if (c && c.budget_max > 0) {
    titreSection("Budget estimé (indicatif)");
    saut(14);
    pdf.setFillColor(255, 237, 213).roundedRect(M, y - 1, L, 12, 2, 2, "F");
    pdf.setFont("helvetica", "bold").setFontSize(13).text(`${money(c.budget_min)} – ${money(c.budget_max)} TTC`.replace("–", "-"), M + 4, y + 7);
    y += 15;
    paragraphe("Estimation automatique à partir de la description et des photos. Seuls les devis des artisans font foi.", 8.5);
  }

  for (const lot of c?.lots || []) {
    titreSection(lot.titre);
    autoTable(pdf, { startY: y, margin: { left: M, right: M }, styles: { fontSize: 9.5, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 }, alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { cellWidth: 30, halign: "right" } },
      head: [["Poste", "Quantité"]],
      body: (lot.postes || []).map((p) => [t(p.designation + (p.precisions ? `\n${p.precisions}` : "")),
        p.quantite != null ? t(`${String(p.quantite).replace(".", ",")} ${p.unite || ""}`) : ""]) });
    y = (pdf as any).lastAutoTable.finalY + 2;
  }

  if (c?.points_attention?.length) { titreSection("À vérifier lors de la visite"); for (const p of c.points_attention) paragraphe(`- ${p}`); }
  if (c?.hypotheses?.length) { titreSection("Hypothèses retenues"); for (const p of c.hypotheses) paragraphe(`- ${p}`); }

  // Pied de page
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i).setFont("helvetica", "normal").setFontSize(7.5).setTextColor(100, 116, 139);
    pdf.text("Document établi avec Rénolien · www.renolien.fr · Ce cahier des charges n'est pas un devis.", M, 290);
    pdf.text(`${i}/${n}`, W - M, 290, { align: "right" });
  }

  const { ouvrirApercu } = await import("@/components/ApercuPdf");
  ouvrirApercu({ blob: pdf.output("blob"), nom: "cahier-des-charges.pdf", titre: `Cahier des charges — ${c?.titre || d.titre || "Projet"}` });
}
