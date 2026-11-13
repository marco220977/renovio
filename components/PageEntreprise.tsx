import Link from "next/link";
import { METIERS_SEO, type MetierSeo } from "@/lib/seo";
import { DEPS_SEO, villesDuDep, dansDep, type DepSeo } from "@/lib/seo-pro";
import { FORMULES, texteClients, texteAttente } from "@/lib/formules";
import OffreLancement, { INSCRIPTION_PRO } from "@/components/OffreLancement";

const Maj = (s: string) => s[0].toUpperCase() + s.slice(1);

export function EnteteContenu({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50">
      <div className="mx-auto max-w-3xl px-5 pb-28">
        <nav className="flex items-center justify-between py-5">
          <Link href="/entreprises" className="text-2xl font-extrabold text-ink">Réno<span className="text-flame">lien</span> <span className="text-sm font-semibold text-slate-400">Pro</span></Link>
          <Link href="/connexion?role=artisan" className="btn-ghost !py-2 text-sm">Se connecter</Link>
        </nav>
        {children}
        <footer className="mt-16 space-y-2 text-center text-xs text-slate-400">
          <p className="flex flex-wrap justify-center gap-4">
            <Link href="/entreprises">Artisans</Link>
            <Link href="/particuliers">Particuliers</Link>
            <Link href="/legal/cgv">CGV artisans</Link>
            <Link href="/legal/mentions-legales">Mentions légales</Link>
          </p>
          <p>© {new Date().getFullYear()} Rénolien</p>
        </footer>
      </div>
    </main>
  );
}

export const ATOUTS: [string, string, string][] = [
  ["📥", "Des chantiers près de chez vous", "Vous ne voyez que les demandes de vos métiers et de vos départements, déjà décrites, avec photos et cahier des charges."],
  ["🤖", "Votre devis prêt en 1 clic", "L'IA pré-remplit le devis avec vos propres tarifs. Vous ajustez, vous envoyez. Fini les soirées sur les devis."],
  ["🔒", "Pas d'enchère au moins cher", "Une seule offre par artisan, invisible des concurrents. Le client compare aussi vos avis, votre délai et votre sérieux."],
  ["🏠", "Vous voyez le chantier avant de vous engager", "Le client vous choisit, vous passez faire la visite, puis vous envoyez votre devis définitif. Les écarts sont expliqués au client."],
  ["💶", "Vous payez seulement quand un client vous choisit", "Envoyer une offre est gratuit. Pas de crédit perdu pour un devis sans réponse, et 0 % de commission sur vos chantiers."],
  ["✍️", "Devis signé en ligne", "Signature électronique, avenants pour les travaux en plus, messagerie et rendez-vous : tout est écrit."],
];

export function Tarifs() {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold">Tarifs simples, sans engagement</h2>
      <p className="mt-1 text-sm text-slate-600"><b className="text-flame">Pendant la phase de lancement, tout est gratuit et illimité pour les membres fondateurs, puis -30 % à vie.</b> Ensuite, <b>vous ne payez que les clients qui vous choisissent.</b> Envoyer une offre ne coûte rien : un crédit est décompté seulement quand un client choisit votre offre, et il vous est rendu s'il renonce avant la visite. Abonnement mensuel sans engagement, aucune commission.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {FORMULES.map((f) => (
          <div key={f.id} className={`card !py-3 ${f.id === "illimite" ? "border-2 border-flame" : ""}`}>
            <p className="flex items-baseline justify-between"><b>{f.nom}</b><span className="font-extrabold">{f.prix === 0 ? "Gratuit" : `${f.prix} €/mois`}</span></p>
            <p className="text-sm text-slate-600">{texteClients(f.quota)} · {texteAttente(f.attente)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FaqPro({ faq }: { faq: [string, string][] }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold">Questions fréquentes</h2>
      <div className="mt-4 space-y-2">
        {faq.map(([q, r]) => (
          <details key={q} className="card group">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{q}<span className="text-slate-400 transition group-open:rotate-45">＋</span></summary>
            <p className="mt-2 text-sm text-slate-600">{r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export const FAQ_PRO: [string, string][] = [
  ["Pourquoi est-ce gratuit en ce moment ?", "Rénolien est en phase de lancement : nous constituons d'abord le réseau des premières entreprises avant d'ouvrir largement aux particuliers. Les artisans inscrits pendant cette période sont « membres fondateurs » : tout est gratuit et illimité jusqu'à la fin du lancement (31 mars 2027), sans carte bancaire. Ensuite, ils gardent -30 % à vie sur toutes les formules, et la formule Découverte reste gratuite. Vous serez prévenu un mois avant."],
  ["Que faut-il pour s'inscrire ?", "Un SIRET et une assurance décennale en cours de validité. Vous pouvez déposer votre attestation depuis votre profil pour obtenir le badge « Vérifié »."],
  ["Est-ce que je paie pour des devis sans réponse ?", "Non. Envoyer une offre est gratuit. Un crédit est décompté uniquement quand un client choisit votre offre, et il vous est rendu si le client renonce avant la visite."],
  ["Est-ce que je paie une commission sur mes chantiers ?", "Non. Le client vous paie directement. Rénolien se rémunère uniquement par l'abonnement."],
  ["Combien d'artisans répondent à chaque demande ?", "5 au maximum. Chacun fait une seule offre, sans voir celles des autres : pas de course au prix le plus bas."],
  ["Puis-je modifier mon prix après la visite ?", "Oui. Votre première offre sert au client à choisir. Après la visite, vous envoyez votre devis définitif, et le client voit les écarts expliqués avant de signer."],
];

export function PageEntreprise({ m, d }: { m: MetierSeo; d?: DepSeo }) {
  const ou = d ? dansDep(d) : "en Île-de-France";
  const faq: [string, string][] = [
    [`Quels chantiers vais-je recevoir en tant que ${m.pro} ?`, `Les demandes de particuliers ${ou} qui concernent votre métier : ${m.travaux.slice(0, 3).join(", ").toLowerCase()}, etc. Vous choisissez vos métiers et vos départements dans votre profil.`],
    ...FAQ_PRO,
  ];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) };
  return (
    <EnteteContenu>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <p className="text-xs text-slate-500"><Link href="/entreprises">Artisans</Link> › <Link href={`/entreprises/${m.slug}`}>{Maj(m.pro)}</Link>{d && <> › {d.nom}</>}</p>
      <section className="pt-4">
        <span className="chip bg-flame-light text-flame">Pour les {m.pros}</span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{m.emoji} {Maj(m.pro)} {ou} : trouvez de nouveaux chantiers</h1>
        <p className="mt-4 text-lg text-slate-600">
          Recevez des demandes de particuliers déjà décrites et chiffrées, près de chez vous. Faites votre offre en 1 clic avec vos tarifs, sans commission et sans enchère au moins cher.
        </p>
        <div className="mt-6"><OffreLancement /></div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">Les chantiers que vous recevrez</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {m.travaux.map((t) => <li key={t} className="card !py-3 text-sm">✓ {t}</li>)}
        </ul>
        {d && (
          <p className="mt-4 text-sm text-slate-600">
            Secteurs couverts {dansDep(d)} : {villesDuDep(d.code).map((v) => v.nom).join(", ")} et toutes les autres communes du département.
          </p>
        )}
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
        <h2 className="text-2xl font-extrabold">Prêt à recevoir vos premiers chantiers ?</h2>
        <Link href={INSCRIPTION_PRO} className="btn-brand mt-5 w-full py-4 text-lg sm:w-auto sm:px-10">Créer mon compte {m.pro}</Link>
        <p className="mt-2 text-xs text-slate-500">Inscription en 2 minutes · SIRET et décennale requis</p>
      </section>

      <section className="mt-14">
        {!d && (
          <>
            <h2 className="text-lg font-bold">{Maj(m.pros)} par département</h2>
            <p className="mt-2 flex flex-wrap gap-2">{DEPS_SEO.map((x) => <Link key={x.slug} href={`/entreprises/${m.slug}/${x.slug}`} className="chip bg-white text-slate-700">{x.nom} ({x.code})</Link>)}</p>
          </>
        )}
        {d && (
          <>
            <h2 className="text-lg font-bold">{Maj(m.pros)} dans les autres départements</h2>
            <p className="mt-2 flex flex-wrap gap-2">{DEPS_SEO.filter((x) => x.slug !== d.slug).map((x) => <Link key={x.slug} href={`/entreprises/${m.slug}/${x.slug}`} className="chip bg-white text-slate-700">{x.nom} ({x.code})</Link>)}</p>
          </>
        )}
        <h2 className="mt-6 text-lg font-bold">Autres métiers</h2>
        <p className="mt-2 flex flex-wrap gap-2">
          {METIERS_SEO.filter((x) => x.slug !== m.slug).map((x) => <Link key={x.slug} href={d ? `/entreprises/${x.slug}/${d.slug}` : `/entreprises/${x.slug}`} className="chip bg-white text-slate-700">{x.emoji} {x.pro}</Link>)}
        </p>
      </section>
    </EnteteContenu>
  );
}
