import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES_PRO, guidePro } from "@/lib/guides-pro";
import { DEPS_SEO } from "@/lib/seo-pro";
import { SITE } from "@/lib/site";
import { Rendu, ancre } from "@/components/ArticleBlocs";
import { EnteteContenu } from "@/components/PageEntreprise";
import OffreLancement, { INSCRIPTION_PRO } from "@/components/OffreLancement";

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES_PRO.map((g) => ({ slug: g.slug }));

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = guidePro(params.slug);
  if (!g) return {};
  return {
    title: { absolute: g.titre },
    description: g.description,
    alternates: { canonical: `/entreprises/guides/${g.slug}` },
    openGraph: { type: "article", title: g.titre, description: g.description, publishedTime: g.date },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const g = guidePro(params.slug);
  if (!g) notFound();
  const titres = g.blocs.filter((b) => b.t === "h2") as { t: "h2"; x: string }[];
  const autres = GUIDES_PRO.filter((x) => x.slug !== g.slug);
  const date = new Date(g.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: g.h1, description: g.description, datePublished: g.date, dateModified: g.date,
        author: { "@type": "Person", name: "Marco", jobTitle: "Plombier-chauffagiste, fondateur de Rénolien" },
        publisher: { "@type": "Organization", name: "Rénolien", url: SITE }, mainEntityOfPage: `${SITE}/entreprises/guides/${g.slug}` },
      { "@type": "FAQPage", mainEntity: g.faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Artisans", item: `${SITE}/entreprises` },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/entreprises/guides` },
        { "@type": "ListItem", position: 3, name: g.titre, item: `${SITE}/entreprises/guides/${g.slug}` },
      ] },
    ],
  };
  return (
    <EnteteContenu>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <p className="text-xs text-slate-500"><Link href="/entreprises">Artisans</Link> › <Link href="/entreprises/guides">Guides</Link></p>
      <header className="mt-3 rounded-3xl bg-gradient-to-br from-ink to-slate-800 p-6 text-white">
        <p className="text-5xl">{g.emoji}</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight">{g.h1}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-white/85">{g.chapo}</p>
        <p className="mt-4 text-sm text-white/60">Par <b className="text-white">Marco</b>, plombier-chauffagiste · Mis à jour le {date} · {g.lecture} min</p>
      </header>

      <div className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-3">
        {g.chiffres.map(([v, l]) => (
          <div key={v} className="rounded-2xl bg-flame-light p-4 text-center">
            <p className="text-2xl font-extrabold text-flame">{v}</p>
            <p className="mt-1 text-sm text-slate-700">{l}</p>
          </div>
        ))}
      </div>

      <nav className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Sommaire</p>
        <ol className="mt-2 space-y-1.5 text-[15px]">
          {titres.map((t, i) => <li key={i}><a href={`#${ancre(t.x)}`} className="font-semibold text-brand">{t.x}</a></li>)}
          <li><a href="#faq" className="font-semibold text-brand">Questions fréquentes</a></li>
        </ol>
      </nav>

      {g.blocs.map((b, i) => <Rendu key={i} b={b} />)}

      <div className="mt-10"><OffreLancement /></div>
      <div className="mt-4 text-center">
        <Link href={INSCRIPTION_PRO} className="btn-brand w-full py-4 text-lg sm:w-auto sm:px-10">Recevoir des chantiers gratuitement</Link>
        <p className="mt-2 text-xs text-slate-500">Inscription en 2 minutes · SIRET et décennale requis · Sans commission</p>
      </div>

      <h2 id="faq" className="mt-10 scroll-mt-4 border-l-4 border-flame pl-3 text-2xl font-extrabold">Questions fréquentes</h2>
      <div className="mt-4 space-y-2">
        {g.faq.map(([q, r]) => (
          <details key={q} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">{q}<span className="text-flame transition group-open:rotate-45">＋</span></summary>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{r}</p>
          </details>
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-slate-400">Sources : {g.sources.map(([t, u], i) => (
        <span key={u}>{i > 0 && " · "}<a href={u} target="_blank" rel="noopener nofollow" className="underline">{t}</a></span>
      ))}.</p>

      <h2 className="mt-10 text-xl font-extrabold">Trouver des chantiers près de chez vous</h2>
      <p className="mt-3 flex flex-wrap gap-2">
        {DEPS_SEO.map((d) => <Link key={d.slug} href={`/entreprises/chantiers/${d.slug}`} className="chip bg-white text-slate-700">Chantiers {d.nom} ({d.code})</Link>)}
      </p>

      <h2 className="mt-10 text-xl font-extrabold">À lire aussi</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{autres.map((x) => (
        <Link key={x.slug} href={`/entreprises/guides/${x.slug}`} className="card block">
          <span className="text-3xl">{x.emoji}</span>
          <span className="mt-2 block font-bold leading-snug">{x.h1}</span>
        </Link>
      ))}</div>
    </EnteteContenu>
  );
}
