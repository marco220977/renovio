import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ARTICLES, article, type Bloc } from "@/lib/articles";
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

function Rendu({ b }: { b: Bloc }) {
  if (b.t === "h2") return <h2 className="mt-8 text-xl font-extrabold">{b.x}</h2>;
  if (b.t === "p") return <p className="mt-3 leading-relaxed text-slate-700">{b.x}</p>;
  if (b.t === "ul") return <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700">{b.x.map((l, i) => <li key={i}>{l}</li>)}</ul>;
  if (b.t === "astuce") return <p className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">💡 {b.x}</p>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead><tr>{b.entetes.map((e) => <th key={e} className="border-b-2 border-slate-200 p-2 text-left">{e}</th>)}</tr></thead>
        <tbody>{b.lignes.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} className={`border-b border-slate-100 p-2 ${j === l.length - 1 ? "font-semibold" : ""}`}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function PageArticle({ params }: { params: { slug: string } }) {
  const a = article(params.slug);
  if (!a) notFound();
  const m = metierSeo(a.metier);
  const autres = ARTICLES.filter((x) => x.slug !== a.slug);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: a.h1, description: a.description, datePublished: a.date, dateModified: a.date,
        author: { "@type": "Organization", name: "Rénolien", url: SITE }, publisher: { "@type": "Organization", name: "Rénolien", url: SITE },
        mainEntityOfPage: `${SITE}/conseils/${a.slug}` },
      { "@type": "FAQPage", mainEntity: a.faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Conseils", item: `${SITE}/conseils` },
        { "@type": "ListItem", position: 2, name: a.titre, item: `${SITE}/conseils/${a.slug}` },
      ] },
    ],
  };
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <article className="mx-auto max-w-3xl px-5 pb-28">
        <Entete />
        <p className="text-xs text-slate-500"><Link href="/conseils">Conseils travaux</Link> › {a.titre}</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight">{a.emoji} {a.h1}</h1>
        <p className="mt-2 text-xs text-slate-400">Mis à jour le {new Date(a.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {a.lecture} min de lecture</p>
        <p className="mt-4 text-lg leading-relaxed text-slate-800">{a.chapo}</p>
        {a.blocs.map((b, i) => <Rendu key={i} b={b} />)}

        <div className="card mt-8 space-y-3 border-orange-200 text-center">
          <p className="text-lg font-extrabold">Recevez jusqu'à 5 devis d'artisans vérifiés</p>
          <p className="text-sm text-slate-600">Décrivez vos travaux en 2 minutes. Gratuit et sans engagement.</p>
          <Link href={INSCRIPTION} className="btn-primary w-full py-3">Décrire mes travaux</Link>
          {m && <Link href={`/travaux/${m.slug}`} className="block text-sm font-semibold text-flame">Voir les {m.pros} près de chez vous →</Link>}
        </div>

        <h2 className="mt-10 text-xl font-extrabold">Questions fréquentes</h2>
        <div className="mt-3 space-y-2">
          {a.faq.map(([q, r]) => (
            <details key={q} className="card"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-slate-700">{r}</p></details>
          ))}
        </div>

        <p className="mt-8 text-xs text-slate-500">Prix indicatifs, toutes taxes comprises sauf mention contraire. Seul un devis après visite fixe le prix réel. Sources : {a.sources.map(([t, u], i) => (
          <span key={u}>{i > 0 && " · "}<a href={u} target="_blank" rel="noopener nofollow" className="underline">{t}</a></span>
        ))}.</p>

        {autres.length > 0 && <>
          <h2 className="mt-10 text-xl font-extrabold">À lire aussi</h2>
          <div className="mt-3 space-y-2">{autres.map((x) => <Link key={x.slug} href={`/conseils/${x.slug}`} className="card block font-semibold">{x.emoji} {x.h1}</Link>)}</div>
        </>}
        <Pied />
      </article>
    </main>
  );
}
