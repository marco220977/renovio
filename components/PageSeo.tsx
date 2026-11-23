import Link from "next/link";
import { ARTICLES } from "@/lib/articles";
import { METIERS_SEO, DEPARTEMENTS, VILLES_SEO, aVille, titreSeo, type MetierSeo, type VilleSeo } from "@/lib/seo";
import { villesVoisines, texteLocal, prixReference } from "@/lib/seo-local";
import LogoMark from "@/components/LogoMark";

const INSCRIPTION = "/connexion?mode=signup&role=client";

export function Entete() {
  return (
    <nav className="flex items-center justify-between py-5">
      <Link href="/particuliers" className="text-2xl font-extrabold text-ink"><LogoMark />Réno<span className="text-flame">lien</span></Link>
      <Link href="/connexion?role=client" className="btn-ghost !py-2 text-sm">Se connecter</Link>
    </nav>
  );
}

export function Pied() {
  return (
    <footer className="mt-16 space-y-2 text-center text-xs text-slate-400">
      <p className="flex flex-wrap justify-center gap-4">
        <Link href="/travaux">Tous les métiers</Link>
        <Link href="/conseils">Conseils travaux</Link>
        <Link href="/particuliers">Comment ça marche</Link>
        <Link href="/legal/mentions-legales">Mentions légales</Link>
        <Link href="/legal/cgu">CGU</Link>
      </p>
      <p>© {new Date().getFullYear()} Rénolien</p>
    </footer>
  );
}

export function PageSeo({ m, v }: { m: MetierSeo; v?: VilleSeo }) {
  const ou = v ? `${aVille(v.nom)} (${v.dep})` : "en Île-de-France";
  const faq: [string, string][] = [
    ...(v ? [[`Comment trouver un ${m.pro} ${aVille(v.nom)} ?`, `Décrivez ${m.sujet} sur Rénolien en indiquant votre code postal (${v.cp === "75000" ? "750xx" : v.cp}). Votre demande est montrée aux ${m.pros} qui interviennent dans le ${v.dep === "75" ? "département de Paris" : `département ${DEPARTEMENTS[v.dep]} (${v.dep})`}, et jusqu'à 5 d'entre eux vous envoient leur devis.`] as [string, string]] : []),
    ...(v ? [[`Les ${m.pros} interviennent-ils aussi autour de ${v.nom} ?`, `Oui. Les artisans qui travaillent ${aVille(v.nom)} couvrent en général tout le secteur, notamment ${villesVoisines(v, 4).map((x) => `${x.nom} (${x.km} km)`).join(", ")}.`] as [string, string]] : []),
    ...m.faq,
    ["Rénolien est-il payant pour les particuliers ?", "Non, c'est gratuit et sans engagement. Vous payez uniquement les travaux, directement à l'artisan choisi."],
  ];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "FAQPage", mainEntity: faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Travaux", item: "https://www.renolien.fr/travaux" },
          { "@type": "ListItem", position: 2, name: m.pro, item: `https://www.renolien.fr/travaux/${m.slug}` },
          ...(v ? [{ "@type": "ListItem", position: 3, name: v.nom, item: `https://www.renolien.fr/travaux/${m.slug}/${v.slug}` }] : []),
        ],
      },
    ],
  };
  const proches = v ? villesVoisines(v) : [];
  const local = v ? texteLocal(m, v) : [];
  const prix = prixReference(m);
  const T = titreSeo(m);
  const autres = METIERS_SEO.filter((x) => x.slug !== m.slug);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mx-auto max-w-3xl px-5 pb-28">
        <Entete />
        <p className="text-xs text-slate-500">
          <Link href="/travaux">Travaux</Link> › <Link href={`/travaux/${m.slug}`}>{m.pro}</Link>{v && <> › {v.nom}</>}
        </p>

        <section className="pt-4">
          <span className="chip bg-flame-light text-flame">Gratuit · Sans engagement</span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {m.emoji} {T} {ou} : comparez les devis
          </h1>
          <p className="mt-4 text-lg text-slate-600">{m.intro}</p>
          {v && (
            <p className="mt-3 text-slate-600">
              Vous habitez {aVille(v.nom)} ou dans les environs ? Indiquez votre code postal dans votre demande : seuls les {m.pros} qui travaillent dans le {v.dep === "75" ? "secteur de Paris" : `${DEPARTEMENTS[v.dep]}`} la verront. Votre nom et votre téléphone restent cachés jusqu'à ce que vous choisissiez un artisan.
            </p>
          )}
          <Link href={INSCRIPTION} className="btn mt-6 w-full bg-gradient-to-r from-ink to-brand py-4 text-lg text-white sm:w-auto sm:px-10">
            Décrire mes travaux →
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Les travaux les plus demandés</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {m.travaux.map((t) => <li key={t} className="card !py-3 text-sm">✓ {t}</li>)}
          </ul>
        </section>

        {v && (
          <section className="mt-12">
            <h2 className="text-2xl font-extrabold">{m.sujet[0].toUpperCase() + m.sujet.slice(1)} {aVille(v.nom)} : ce qu'il faut savoir</h2>
            {local.map((p) => <p key={p} className="mt-3 text-slate-700">{p}</p>)}
            <p className="mt-3 text-sm text-slate-500">
              Code postal {v.cp === "75000" ? "750xx" : v.cp} · {v.dep === "75" ? "Paris" : DEPARTEMENTS[v.dep]} ({v.dep}) ·{" "}
              <Link href={`/travaux/${m.slug}`} className="underline">{T} en Île-de-France</Link>
            </p>
          </section>
        )}

        {prix.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-extrabold">Prix indicatifs {v ? aVille(v.nom) : "en Île-de-France"}</h2>
            <div className="card mt-4 !p-0">
              {prix.map((x) => (
                <div key={x.nom} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0">
                  <span>{x.nom}</span>
                  <span className="whitespace-nowrap font-semibold">{x.prix.toLocaleString("fr-FR")} € HT / {x.unite}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Prix de référence utilisés par l'estimation Rénolien, fourniture et pose sauf mention contraire. Chaque artisan applique ses propres tarifs dans son devis.</p>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Comment ça marche</h2>
          <ol className="mt-4 space-y-2 text-slate-700">
            <li><b>1.</b> Vous décrivez {m.sujet} en quelques phrases, avec des photos. L'IA vous pose quelques questions.</li>
            <li><b>2.</b> Vous recevez un cahier des charges et une estimation indicative du budget.</li>
            <li><b>3.</b> Jusqu'à 5 {m.pros} {v ? "du secteur" : "de votre secteur"} envoient chacun une seule offre, sans voir celles des autres.</li>
            <li><b>4.</b> Vous choisissez sans engagement, l'artisan vient voir puis envoie son devis définitif. Vous signez seulement si vous êtes d'accord, avec 14 jours pour vous rétracter.</li>
          </ol>
        </section>

        <section className="mt-12 rounded-2xl bg-ink p-5 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase text-flame">Nos conseils pour un bon devis</p>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            {m.conseils.map((c) => <li key={c}>→ {c}</li>)}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Questions fréquentes</h2>
          <div className="mt-4 space-y-2">
            {faq.map(([q, r]) => (
              <details key={q} className="card group">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {q}<span className="text-slate-400 transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">{r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 text-center">
          <h2 className="text-2xl font-extrabold">Besoin d'un {m.pro} {v ? aVille(v.nom) : "en Île-de-France"} ?</h2>
          <Link href={INSCRIPTION} className="btn-brand mt-5 w-full py-4 text-lg sm:w-auto sm:px-10">Recevoir mes devis gratuitement</Link>
        </section>

        <section className="mt-14">
          {v ? (
            <>
              <h2 className="text-lg font-bold">{m.pros[0].toUpperCase() + m.pros.slice(1)} près de {v.nom}</h2>
              <p className="mt-2 flex flex-wrap gap-2">
                {proches.map((x) => <Link key={x.slug} href={`/travaux/${m.slug}/${x.slug}`} className="chip bg-white text-slate-700">{T} {aVille(x.nom)} · {x.km} km</Link>)}
              </p>
              <h2 className="mt-6 text-lg font-bold">Autres travaux {aVille(v.nom)}</h2>
              <p className="mt-2 flex flex-wrap gap-2">
                {autres.map((x) => <Link key={x.slug} href={`/travaux/${x.slug}/${v.slug}`} className="chip bg-white text-slate-700">{x.emoji} {x.pro}</Link>)}
              </p>
            </>
          ) : (
            <>
              {Object.entries(DEPARTEMENTS).map(([d, nom]) => (
                <div key={d} className="mb-5">
                  <h2 className="text-lg font-bold">{m.pros[0].toUpperCase() + m.pros.slice(1)} – {nom} ({d})</h2>
                  <p className="mt-2 flex flex-wrap gap-2">
                    {VILLES_SEO.filter((x) => x.dep === d).map((x) => <Link key={x.slug} href={`/travaux/${m.slug}/${x.slug}`} className="chip bg-white text-slate-700">{x.nom}</Link>)}
                  </p>
                </div>
              ))}
              <h2 className="text-lg font-bold">Autres métiers</h2>
              <p className="mt-2 flex flex-wrap gap-2">
                {autres.map((x) => <Link key={x.slug} href={`/travaux/${x.slug}`} className="chip bg-white text-slate-700">{x.emoji} {x.pro}</Link>)}
              </p>
            </>
          )}
        </section>
        {ARTICLES.filter((x) => x.metier === m.slug).map((x) => (
          <Link key={x.slug} href={`/conseils/${x.slug}`} className="card mt-8 block">
            <span className="text-xs font-semibold uppercase text-slate-400">Guide</span>
            <span className="mt-1 block font-bold">{x.emoji} {x.h1} →</span>
          </Link>
        ))}
        <Pied />
      </div>
    </main>
  );
}
