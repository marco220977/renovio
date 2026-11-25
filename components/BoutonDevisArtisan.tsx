"use client";
import { useRouter } from "next/navigation";
import { ecrireInvite } from "@/lib/realisations";

/** « Demander un devis à cet artisan » : mémorise l'artisan, puis ouvre le dépôt de demande (après connexion si besoin) */
export default function BoutonDevisArtisan({ id, nom, slug, className = "" }: { id: string; nom: string; slug: string; className?: string }) {
  const router = useRouter();
  return (
    <button className={`btn-brand w-full py-3.5 ${className}`} onClick={() => { ecrireInvite({ id, nom, slug }); router.push("/client/nouvelle"); }}>
      📩 Demander un devis à {nom}
    </button>
  );
}
