import Link from "next/link";

export const metadata = {
  title: "Devis travaux de rénovation gratuits : salle de bain, plomberie, électricité…",
  description: "Décrivez vos travaux en 2 minutes. L'IA prépare votre cahier des charges et une estimation, puis jusqu'à 5 artisans vérifiés de votre secteur vous envoient leur devis. Gratuit et sans engagement.",
  alternates: { canonical: "/particuliers" },
};

const INSCRIPTION = "/connexion?mode=signup&role=client";

const etapes = [
  ["✍️", "Décrivez vos travaux", "Quelques phrases suffisent, dictées au micro si vous voulez, avec des photos. L'IA vous pose 3 à 6 questions pour ne rien oublier."],
  ["📋", "Recevez votre cahier des charges", "Votre projet découpé poste par poste, avec une estimation du budget. Vous savez à quoi vous attendre avant même de parler à un artisan."],
  ["⚖️", "Comparez jusqu'à 5 devis", "Les artisans de votre secteur répondent sous 72 h. Les offres sont classées par prix, avis, délai et sérieux du profil."],
  ["🏠", "Choisissez, sans engagement", "L'artisan choisi vient voir le chantier et vous envoie son devis définitif. Vous voyez clairement ce qui a changé par rapport à son premier prix."],
  ["✅", "Signez en ligne", "Vous ne signez qu'une fois d'accord sur le devis définitif. Et vous gardez 14 jours pour changer d'avis."],
];

const garanties = [
  ["🔒", "Vos coordonnées restent cachées", "Les artisans voient votre projet, pas votre nom ni votre téléphone. Seul celui que vous choisissez les reçoit."],
  ["🧾", "Artisans contrôlés", "SIRET et assurance décennale obligatoires pour répondre. Le badge « Vérifié » indique que nous avons contrôlé leurs documents."],
  ["🚫", "Pas de vente au moins cher", "Chaque artisan fait une seule offre, sans voir celles des autres. Un prix anormalement bas vous est signalé."],
  ["💬", "Tout se passe au même endroit", "Questions, rendez-vous de visite, devis, travaux en plus : tout est écrit et signé dans l'appli, rien à l'oral."],
];

const faq = [
  ["Combien ça coûte ?", "Rien. Rénolien est gratuit pour les particuliers, sans engagement. Vous payez uniquement les travaux, directement à l'artisan choisi."],
  ["Suis-je obligé d'accepter un devis ?", "Non. Vous pouvez comparer, poser des questions, choisir un artisan puis changer d'avis après sa visite. Vous n'êtes engagé qu'après avoir signé le devis définitif, et vous avez encore 14 jours pour vous rétracter."],
  ["Quels travaux ?", "Plomberie, chauffage, électricité, salle de bain, cuisine, carrelage, peinture, menuiseries, isolation, toiture, façade, maçonnerie, extérieurs et petits travaux."],
  ["Et si l'artisan découvre un problème pendant le chantier ?", "Il doit vous proposer un avenant dans l'appli, avec l'explication et le prix. Vous l'acceptez ou le refusez avant que les travaux supplémentaires soient faits."],
  ["L'estimation de l'IA est-elle fiable ?", "C'est un ordre de grandeur pour vous aider à juger les devis. Les prix réels sont ceux des artisans, confirmés après leur visite."],
];

export default function Particuliers() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })),
  };
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="mx-auto max-w-3xl px-5 pb-28">
        <nav className="flex items-center justify-between py-5">
          <Link href="/particuliers" className="text-2xl font-extrabold text-ink">Réno<span className="text-flame">lien</span></Link>
          <Link href="/connexion?role=client" className="btn-ghost !py-2 text-sm">Se connecter</Link>
        </nav>

        <section className="pt-6 text-center">
          <span className="chip bg-flame-light text-flame">Gratuit · Sans engagement</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Vos travaux décrits en 2 minutes, <span className="bg-gradient-to-r from-brand to-flame bg-clip-text text-transparent">les devis viennent à vous</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Salle de bain, chauffage, électricité, peinture… Expliquez ce que vous voulez faire : nous préparons votre projet et des artisans vérifiés de votre secteur vous envoient leur devis.
          </p>
          <Link href={INSCRIPTION} className="btn mt-8 w-full bg-gradient-to-r from-ink to-brand py-4 text-lg text-white sm:w-auto sm:px-10">
            Décrire mes travaux →
          </Link>
          <p className="mt-3 text-sm text-slate-500">Inscription en 30 secondes. Vos coordonnées restent privées.</p>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-extrabold">Comment ça marche</h2>
          <ol className="mt-6 space-y-3">
            {etapes.map(([icon, t, d], i) => (
              <li key={t} className="card flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-flame-light text-2xl">{icon}</div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Étape {i + 1}</p>
                  <h3 className="font-bold">{t}</h3>
                  <p className="mt-0.5 text-sm text-slate-600">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-extrabold">Vous gardez la main</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {garanties.map(([icon, t, d]) => (
              <div key={t} className="card">
                <p className="text-2xl">{icon}</p>
                <h3 className="mt-1 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl bg-ink p-5 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase text-flame">Exemple</p>
          <p className="mt-2 text-lg font-bold">« Je veux refaire ma salle de bain de 6 m² : douche à l'italienne, meuble vasque et faïence. »</p>
          <ul className="mt-4 space-y-1 text-sm text-white/80">
            <li>→ 4 questions de l'IA (gamme, WC, état des murs…)</li>
            <li>→ Cahier des charges en 5 lots et une estimation de budget</li>
            <li>→ Les devis des plombiers et carreleurs de votre secteur, classés</li>
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-extrabold">Questions fréquentes</h2>
          <div className="mt-6 space-y-2">
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

        <section className="mt-16 text-center">
          <h2 className="text-2xl font-extrabold">Prêt à lancer votre projet ?</h2>
          <Link href={INSCRIPTION} className="btn-brand mt-5 w-full py-4 text-lg sm:w-auto sm:px-10">Décrire mes travaux gratuitement</Link>
        </section>

        <footer className="mt-16 space-y-2 text-center text-xs text-slate-400">
          <p className="flex flex-wrap justify-center gap-4">
            <Link href="/travaux">Trouver un artisan</Link>
            <Link href="/legal/mentions-legales">Mentions légales</Link>
            <Link href="/legal/cgu">CGU</Link>
            <Link href="/legal/confidentialite">Confidentialité</Link>
            <Link href="/">Vous êtes artisan ?</Link>
          </p>
          <p>© {new Date().getFullYear()} Rénolien</p>
        </footer>
      </div>

      {/* Bouton toujours visible sur téléphone */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <Link href={INSCRIPTION} className="btn-brand w-full py-3.5">Décrire mes travaux →</Link>
      </div>
    </main>
  );
}
