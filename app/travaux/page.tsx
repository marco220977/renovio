import Link from "next/link";
import { METIERS_SEO } from "@/lib/seo";
import { Entete, Pied } from "@/components/PageSeo";

export const metadata = {
  title: "Trouver un artisan pour vos travaux en Île-de-France : devis gratuits",
  description: "Plombier, électricien, chauffagiste, peintre, carreleur, couvreur… Décrivez vos travaux et recevez jusqu'à 5 devis d'artisans vérifiés à Paris, dans le Val-de-Marne et en Seine-et-Marne.",
  alternates: { canonical: "/travaux" },
};

export default function Travaux() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50">
      <div className="mx-auto max-w-3xl px-5 pb-28">
        <Entete />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Quel artisan cherchez-vous ?</h1>
        <p className="mt-3 text-slate-600">Choisissez votre type de travaux, puis votre ville. Les demandes sont gratuites et sans engagement.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {METIERS_SEO.map((m) => (
            <Link key={m.slug} href={`/travaux/${m.slug}`} className="card flex items-center gap-3 hover:border-flame">
              <span className="text-3xl">{m.emoji}</span>
              <span className="font-bold">{m.pro[0].toUpperCase() + m.pro.slice(1)}</span>
            </Link>
          ))}
        </div>
        <Pied />
      </div>
    </main>
  );
}
