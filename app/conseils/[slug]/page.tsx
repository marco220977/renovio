import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ARTICLES, article, type Bloc } from "@/lib/articles";
import { Rendu, ancre } from "@/components/ArticleBlocs";
import { metierSeo } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { Entete, Pied } from "@/components/PageSeo";

export const dynamicParams = false;
export function generateStaticParams() { return ARTICLES.map((a) => ({ slug: a.slug })); }

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = article(params.slug);
  if (!a) return {};
  return {
    title: { absolute: a.titre },
    description: a.description,
    alternates: { canonical: `/conseils/${a.slug}` },
    openGraph: { type: "article", title: a.titre, description: a.description, publishedTime: a.date },
  };
}

const INSCRIPTION = "/connexion?mode=signup&role=client";
export default function PageArticle({ params }: { params: { slug: string } }) {
  const a = article(params.slug);
  if (!a) notFound();
  const m = metierSeo(a.metier);
  const autres = ARTICLES.filter((x) => x.slug !== a.slug);
  const titres = a.blocs.filter((b): b is Extract<Bloc, { t: "h2" }> => b.t === "h2");
  const date = new Date(a.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: a.h1, description: a.description, datePublished: a.date, dateModified: a.date,
        author: { "@type": "Person", name: "Marco", jobTitle: "Plombier-chauffagiste, fondateur de Rénolien" },
        publisher: { "@type": "Organization", name: "Rénolien", url: SITE }, mainEntityOfPage: `${SITE}/conseils/${a.slug}` },
      { "@type": "FAQPage", mainEntity: a.faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Conseils", item: `${SITE}/conseils` },
        { "@type": "ListItem", position: 2, name: a.titre, item: `${SITE}/conseils/${a.slug}` },
      ] },
    ],
  };
  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mx-auto max-w-3xl px-5"><Entete /></div>

      {/* Bandeau */}
      <header className="bg-gradient-to-br from-ink to-slate-800 text-white">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <p className="text-xs text-white/60"><Link href="/conseils" className="underline">Conseils travaux</Link> › {m ? m.pros : "Guide"}</p>
          <p className="mt-4 text-5xl">{a.emoji}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{a.h1}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-white/85">{a.chapo}</p>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flame text-lg font-extrabold">M</span>
            <span className="text-sm leading-tight"><b>Marco</b>, plombier-chauffagiste<br /><span className="text-white/60">Mis à jour le {date} · {a.lecture} min de lecture</span></span>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-32">
        {/* En chiffres */}
        <div className="-mt-0 grid grid-cols-1 gap-3 pt-6 sm:grid-cols-3">
          {a.chiffres.map(([v, l]) => (
            <div key={v} className="rounded-2xl bg-flame-light p-4 text-center">
              <p className="text-2xl font-extrabold text-flame">{v}</p>
              <p className="mt-1 text-sm text-slate-700">{l}</p>
            </div>
          ))}
        </div>

        {/* Sommaire */}
        <nav className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Sommaire</p>
          <ol className="mt-2 space-y-1.5 text-[15px]">
            {titres.map((t, i) => <li key={i}><a href={`#${ancre(t.x)}`} className="font-semibold text-brand">{i + 1}. {t.x}</a></li>)}
            <li><a href="#faq" className="font-semibold text-brand">{titres.length + 1}. Questions fréquentes</a></li>
          </ol>
        </nav>

        {a.blocs.map((b, i) => <Rendu key={i} b={b} />)}

        {/* Appel à l'action */}
        <div className="mt-10 rounded-3xl bg-gradient-to-br from-flame to-orange-500 p-6 text-center text-white">
          <p className="text-2xl font-extrabold">Recevez jusqu'à 5 devis d'artisans vérifiés</p>
          <p className="mt-2 text-white/90">✓ Gratuit · ✓ Sans engagement · ✓ Artisans de votre secteur</p>
          <Link href={INSCRIPTION} className="btn mt-4 w-full bg-white py-3.5 text-lg font-extrabold text-flame">Décrire mes travaux en 2 min</Link>
          {m && <Link href={`/travaux/${m.slug}`} className="mt-3 block text-sm font-semibold text-white underline">Voir les {m.pros} près de chez vous</Link>}
        </div>

        <h2 id="faq" className="mt-10 scroll-mt-4 border-l-4 border-flame pl-3 text-2xl font-extrabold">Questions fréquentes</h2>
        <div className="mt-4 space-y-2">
          {a.faq.map(([q, r]) => (
            <details key={q} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">{q}<span className="text-flame transition group-open:rotate-45">＋</span></summary>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{r}</p>
            </details>
          ))}
        </div>

        {/* Auteur */}
        <div className="mt-10 flex gap-4 rounded-2xl border border-slate-200 p-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-flame text-2xl font-extrabold text-white">M</span>
          <div className="text-sm leading-relaxed text-slate-700">
            <p className="font-bold text-ink">Écrit par Marco, plombier-chauffagiste</p>
            <p>Artisan en Île-de-France et fondateur de Rénolien, la plateforme qui met en relation les particuliers avec des artisans vérifiés de leur secteur.</p>
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-400">Prix indicatifs TTC relevés en 2026. Seul un devis après visite fixe le prix réel. Sources : {a.sources.map(([t, u], i) => (
          <span key={u}>{i > 0 && " · "}<a href={u} target="_blank" rel="noopener nofollow" className="underline">{t}</a></span>
        ))}.</p>

        {autres.length > 0 && <>
          <h2 className="mt-10 text-xl font-extrabold">À lire aussi</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{autres.map((x) => (
            <Link key={x.slug} href={`/conseils/${x.slug}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-3xl">{x.emoji}</span>
              <span className="mt-2 block font-bold leading-snug">{x.h1}</span>
              <span className="mt-1 block text-xs text-slate-400">{x.lecture} min de lecture</span>
            </Link>
          ))}</div>
        </>}
        <Pied />
      </article>

      {/* Bouton fixe en bas sur téléphone */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <Link href={INSCRIPTION} className="btn-brand w-full py-3 text-base">📝 Recevoir 5 devis gratuits</Link>
      </div>
    </main>
  );
}
