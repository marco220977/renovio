import Link from "next/link";

const etapesClient = [
  ["✍️", "Décrivez vos travaux", "En quelques phrases, avec des photos si vous voulez. L'IA vous pose 3 à 6 questions pour bien comprendre."],
  ["📋", "Recevez votre cahier des charges", "Votre projet découpé poste par poste, avec une estimation du budget avant même de contacter un artisan."],
  ["⚖️", "Comparez jusqu'à 5 devis", "Des artisans vérifiés de votre secteur répondent sous 72 h. Les offres sont classées par prix, avis et délai."],
  ["✅", "Choisissez et signez en ligne", "Vos coordonnées restent cachées jusqu'à votre choix : seul l'artisan retenu les reçoit."],
];

const atoutsArtisan = [
  ["📥", "Des demandes près de chez vous", "Filtrées par vos métiers et vos départements, déjà décrites et chiffrées."],
  ["🤖", "Votre devis prêt en 1 clic", "L'IA le pré-remplit avec vos propres tarifs. Vous ajustez et vous envoyez."],
  ["🔒", "Pas d'enchère au moins cher", "Une seule offre par artisan, invisible des concurrents. Le client compare aussi les avis et le délai."],
];

export default function Home({ searchParams }: { searchParams?: { compte?: string } }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50">
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <nav className="flex items-center justify-between py-5">
          <span className="text-2xl font-extrabold text-ink">Réno<span className="text-flame">vio</span></span>
          <Link href="/connexion" className="btn-ghost !py-2 text-sm">Se connecter</Link>
        </nav>

        {searchParams?.compte === "supprime" && <p className="rounded-xl bg-green-50 p-3 text-center text-sm text-green-900">Votre compte a bien été supprimé.</p>}
        <section className="pt-8 text-center">
          <span className="chip bg-flame-light text-flame">★ Travaux de rénovation</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Vos travaux décrits en 2 minutes, <span className="bg-gradient-to-r from-brand to-flame bg-clip-text text-transparent">les devis viennent à vous</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Expliquez ce que vous voulez faire. L'IA prépare le cahier des charges, les artisans de votre secteur vous envoient leur devis.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/connexion?mode=signup&role=client" className="btn bg-gradient-to-r from-ink to-brand py-4 text-lg text-white">
              🏠 J'ai des travaux
            </Link>
            <Link href="/connexion?mode=signup&role=artisan" className="btn-brand py-4 text-lg">
              🧰 Je suis artisan
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">Gratuit pour les particuliers. Sans engagement.</p>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-extrabold">Comment ça marche</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {etapesClient.map(([icon, t, d], i) => (
              <div key={t} className="card">
                <div className="flex items-center gap-2 text-2xl">{icon}<span className="text-sm font-bold text-slate-400">Étape {i + 1}</span></div>
                <h3 className="mt-2 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 card">
          <h2 className="text-2xl font-extrabold">Artisans : des chantiers, pas des contacts</h2>
          <div className="mt-4 space-y-4">
            {atoutsArtisan.map(([icon, t, d]) => (
              <div key={t} className="flex gap-3">
                <span className="text-2xl">{icon}</span>
                <div><h3 className="font-bold">{t}</h3><p className="text-sm text-slate-600">{d}</p></div>
              </div>
            ))}
          </div>
          <Link href="/connexion?mode=signup&role=artisan" className="btn-brand mt-6 w-full py-3.5">Créer mon compte artisan</Link>
        </section>

        <footer className="mt-16 space-y-2 text-center text-xs text-slate-400">
          <p className="flex flex-wrap justify-center gap-4">
            <Link href="/legal/mentions-legales">Mentions légales</Link>
            <Link href="/legal/cgu">CGU</Link>
            <Link href="/legal/cgv">CGV artisans</Link>
            <Link href="/legal/confidentialite">Confidentialité</Link>
          </p>
          <p>© {new Date().getFullYear()} Rénovio</p>
        </footer>
      </div>
    </main>
  );
}
