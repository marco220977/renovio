import Link from "next/link";
import type { Metadata } from "next";
import { GUIDES_PRO } from "@/lib/guides-pro";
import { DEPS_SEO } from "@/lib/seo-pro";
import { EnteteContenu } from "@/components/PageEntreprise";

export const metadata: Metadata = {
  title: { absolute: "Trouver des chantiers : guides pour artisans du bâtiment" },
  description: "Comment trouver des chantiers et des clients quand on est artisan : méthodes gratuites, plateformes comparées, conseils auto-entrepreneur en Île-de-France.",
  alternates: { canonical: "/entreprises/guides" },
};

export default function Guides() {
  return (
    <EnteteContenu>
      <p className="text-xs text-slate-500"><Link href="/entreprises">Artisans</Link> › Guides</p>
      <h1 className="mt-4 text-3xl font-extrabold">Trouver des chantiers : nos guides pour les artisans</h1>
      <p className="mt-3 text-slate-600">Écrits par un plombier-chauffagiste d'Île-de-France, pour les artisans qui veulent remplir leur planning sans se ruiner en contacts payants.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {GUIDES_PRO.map((g) => (
          <Link key={g.slug} href={`/entreprises/guides/${g.slug}`} className="card block">
            <span className="text-4xl">{g.emoji}</span>
            <span className="mt-2 block text-lg font-extrabold leading-snug">{g.h1}</span>
            <span className="mt-2 block line-clamp-3 text-sm text-slate-600">{g.chapo}</span>
            <span className="mt-2 block text-xs font-bold text-flame">Lire · {g.lecture} min →</span>
          </Link>
        ))}
      </div>
      <h2 className="mt-10 text-xl font-extrabold">Trouver des chantiers par département</h2>
      <p className="mt-3 flex flex-wrap gap-2">
        {DEPS_SEO.map((d) => <Link key={d.slug} href={`/entreprises/chantiers/${d.slug}`} className="chip bg-white text-slate-700">{d.nom} ({d.code})</Link>)}
      </p>
    </EnteteContenu>
  );
}
