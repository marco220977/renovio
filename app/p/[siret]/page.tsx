// Adresse affichée dans les e-mails de prospection (www.renolien.fr/p/SIRET), sans le jeton personnel.
// Si l'artisan la recopie au lieu de cliquer, il arrive ici au lieu d'une page 404.
import Link from "next/link";
import LogoMark from "@/components/LogoMark";

const siretLisible = (s: string) => s.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");

export default function ProfilSansJeton({ params }: { params: { siret: string } }) {
  const siret = /^\d{14}$/.test(params.siret) ? params.siret : "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-orange-50 p-5">
      <div className="card w-full max-w-md space-y-4 p-6 text-center">
        <p className="text-2xl font-extrabold"><LogoMark />Réno<span className="text-flame">lien</span></p>
        <p className="text-lg font-bold">Votre profil est prêt 👋</p>
        {siret && <p className="text-sm text-green-700">✅ SIRET {siretLisible(siret)}</p>}
        <p className="text-sm text-slate-600">
          Pour l'activer, <b>cliquez directement sur le lien « Activer mon profil »</b> dans l'e-mail que vous avez reçu de Rénolien.
          Ce lien est personnel et sécurisé : il ne fonctionne pas s'il est recopié à la main.
        </p>
        <Link href="/entreprises" className="btn-brand w-full">Je n'ai plus l'e-mail : m'inscrire</Link>
        <p className="text-xs text-slate-500">Gratuit, sans engagement, sans carte bancaire.</p>
      </div>
    </main>
  );
}
