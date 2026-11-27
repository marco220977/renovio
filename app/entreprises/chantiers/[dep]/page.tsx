import PasDeClient from "@/components/PasDeClient";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIERS_SEO } from "@/lib/seo";
import { DEPS_SEO, depSeo, dansDep, villesDuDep, domaine, DEP_PRO } from "@/lib/seo-pro";
import { GUIDES_PRO } from "@/lib/guides-pro";
import { EnteteContenu, ATOUTS, Tarifs, FaqPro, FAQ_PRO } from "@/components/PageEntreprise";
import OffreLancement, { INSCRIPTION_PRO } from "@/components/OffreLancement";

export const dynamicParams = false;
export const generateStaticParams = () => DEPS_SEO.map((d) => ({ dep: d.slug }));

export function generateMetadata({ params }: { params: { dep: string } }): Metadata {
  const d = depSeo(params.dep);
  if (!d) return {};
  const title = `Trouver des chantiers ${dansDep(d)} (${d.code}) : artisans`;
  const description = `Artisan ${dansDep(d)} ? Recevez des demandes de travaux de particuliers du ${d.code}, gratuitement et sans commission. Tous les métiers du bâtiment.`;
  return { title: { absolute: title }, description, openGraph: { title, description }, alternates: { canonical: `/entreprises/chantiers/${d.slug}` } };
}

export default function Page({ params }: { params: { dep: string } }) {
  const d = depSeo(params.dep);
  if (!d) notFound();
  const faq: [string, string][] = [
    [`Comment trouver des chantiers ${dansDep(d)} ?`, `Combinez une fiche Google avec les communes que vous couvrez ${dansDep(d)}, le bouche-à-oreille, les partenariats avec les agences et syndics du ${d.code}, et une plateforme qui filtre les demandes par département, comme Rénolien.`],
    [`Quels chantiers sont les plus demandés ${dansDep(d)} ?`, DEP_PRO[d.code] || ""],
    ...FAQ_PRO.slice(0, 4),
  ];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) };
  return (
    <EnteteContenu>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <p className="text-xs text-slate-500"><Link href="/entreprises">Artisans</Link> › Chantiers {d.nom}</p>
      <section className="pt-4">
        <span className="chip bg-flame-light text-flame">Artisans du {d.code}</span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Trouver des chantiers {dansDep(d)} ({d.code})</h1>
        <p className="mt-4 text-lg text-slate-600">Recevez des demandes de travaux de particuliers {dansDep(d)}, déjà décrites avec photos et cahier des charges. Envoyer une offre est gratuit, sans commission : vous ne payez que si un client vous choisit.</p>
        <div className="mt-6"><PasDeClient /></div>
        <div className="mt-4"><OffreLancement /></div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">Le marché des travaux {dansDep(d)}</h2>
        <p className="mt-3 text-slate-700">{DEP_PRO[d.code]}</p>
        <p className="mt-3 text-sm text-slate-600">Communes couvertes, entre autres : {villesDuDep(d.code).map((v) => v.nom).join(", ")}.</p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">Trouver des chantiers {dansDep(d)} par métier</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {METIERS_SEO.map((m) => (
            <Link key={m.slug} href={`/entreprises/${m.slug}/${d.slug}`} className="card flex items-center gap-3 !py-3 hover:border-flame">
              <span className="text-2xl">{m.emoji}</span><span className="text-sm font-semibold">Chantiers {domaine(m.slug)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">Pourquoi Rénolien</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ATOUTS.map(([i, t, x]) => <div key={t} className="card"><p className="text-2xl">{i}</p><h3 className="mt-1 font-bold">{t}</h3><p className="mt-1 text-sm text-slate-600">{x}</p></div>)}
        </div>
      </section>

      <Tarifs />
      <FaqPro faq={faq} />

      <section className="mt-12 text-center">
        <Link href={INSCRIPTION_PRO} className="btn-brand w-full py-4 text-lg sm:w-auto sm:px-10">Créer mon compte artisan</Link>
        <p className="mt-2 text-xs text-slate-500">Inscription en 2 minutes · SIRET et décennale requis</p>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-bold">Autres départements</h2>
        <p className="mt-2 flex flex-wrap gap-2">{DEPS_SEO.filter((x) => x.slug !== d.slug).map((x) => <Link key={x.slug} href={`/entreprises/chantiers/${x.slug}`} className="chip bg-white text-slate-700">Chantiers {x.nom} ({x.code})</Link>)}</p>
        <h2 className="mt-6 text-lg font-bold">Guides pour trouver des chantiers</h2>
        <p className="mt-2 flex flex-wrap gap-2">{GUIDES_PRO.map((g) => <Link key={g.slug} href={`/entreprises/guides/${g.slug}`} className="chip bg-white text-slate-700">{g.emoji} {g.titre.split(" : ")[0].split(" (")[0]}</Link>)}</p>
      </section>
    </EnteteContenu>
  );
}
