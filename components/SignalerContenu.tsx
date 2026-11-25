import { LEGAL } from "@/lib/legal";

/** Lien de signalement d'un artisan, d'une offre ou d'un avis (obligation DSA) : ouvre un e-mail pré-rempli vers Rénolien. */
export default function SignalerContenu({ quoi, nom, lien, className = "" }: { quoi: string; nom?: string; lien?: string; className?: string }) {
  const sujet = `Signalement : ${quoi}${nom ? ` – ${nom}` : ""}`;
  const corps = [
    `Je signale : ${quoi}${nom ? ` (${nom})` : ""}`,
    lien ? `Page concernée : ${lien}` : "",
    "",
    "Motif (faux artisan, avis douteux, contenu illicite ou injurieux, autre) :",
    "",
    "Explications :",
    "",
  ].filter((l, i) => l || i > 1).join("\n");
  const href = `mailto:${LEGAL.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  return (
    <a href={href} className={`text-xs text-slate-400 underline ${className}`}>
      🚩 Signaler {quoi}
    </a>
  );
}
