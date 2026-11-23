import Link from "next/link";
import { METIERS_SEO } from "@/lib/seo";
import { DEPS_SEO, dansDep } from "@/lib/seo-pro";
import { GUIDES_PRO } from "@/lib/guides-pro";
import OffreLancement, { INSCRIPTION_PRO } from "@/components/OffreLancement";
import { EnteteContenu, ATOUTS, Tarifs, FaqPro, FAQ_PRO } from "@/components/PageEntreprise";

export const metadata = {
  title: { absolute: "Trouver des chantiers en Île-de-France, sans commission" },
  description: "Plateforme pour artisans : recevez des demandes de travaux de particuliers à Paris, dans le 94 et le 77. Sans commission, gratuit pendant le lancement.",
  alternates: { canonical: "/entreprises" },
};

export default function Entreprises() {
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ_PRO.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) };
  return (
    <EnteteContenu>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="pt-6 text-center">
        <span className="chip bg-flame-light text-flame">Artisans et entreprises du bâtiment</span>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Trouver des chantiers en Île-de-France, <span className="bg-gradient-to-r from-brand to-flame bg-clip-text text-transparent">le devis en 1 clic</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Des particuliers décrivent leurs travaux, l'IA prépare le cahier des charges. Vous recevez les demandes de vos métiers et de votre secteur, et vous répondez avec vos tarifs. Sans commission.
        </p>
      </section>
      <div className="mt-8"><OffreLancement /></div>

      <section className="mt-12">
        <h2 className="text-center text-2xl font-extrabold">Ce que vous y gagnez</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ATOUTS.map(([i, t, x]) => <div key={t} className="card"><p className="text-2xl">{i}</p><h3 className="mt-1 font-bold">{t}</h3><p className="mt-1 text-sm text-slate-600">{x}</p></div>)}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">Votre métier</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {METIERS_SEO.map((m) => (
            <Link key={m.slug} href={`/entreprises/${m.slug}`} className="card flex items-center gap-3 !py-3 hover:border-flame">
              <span className="text-2xl">{m.emoji}</span><span className="font-semibold">{m.pro[0].toUpperCase() + m.pro.slice(1)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">Trouver des chantiers près de chez vous</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {DEPS_SEO.map((d) => (
            <Link key={d.slug} href={`/entreprises/chantiers/${d.slug}`} className="card !py-3 text-center font-semibold hover:border-flame">Chantiers {dansDep(d)} ({d.code})</Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">Guides : comment trouver des clients</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {GUIDES_PRO.map((g) => (
            <Link key={g.slug} href={`/entreprises/guides/${g.slug}`} className="card flex items-center gap-3 !py-3 hover:border-flame">
              <span className="text-2xl">{g.emoji}</span><span className="text-sm font-semibold">{g.h1}</span>
            </Link>
          ))}
        </div>
      </section>

      <Tarifs />
      <FaqPro faq={FAQ_PRO} />

      <section className="mt-12 text-center">
        <Link href={INSCRIPTION_PRO} className="btn-brand w-full py-4 text-lg sm:w-auto sm:px-10">Créer mon compte artisan</Link>
        <p className="mt-2 text-xs text-slate-500">Inscription en 2 minutes · SIRET et décennale requis</p>
      </section>
    </EnteteContenu>
  );
}
