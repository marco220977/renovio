// Ce que Rénolien contrôle réellement sur chaque artisan (accueil et page particuliers)
const CONTROLES = [
  ["🏢", "SIRET vérifié", "Contrôlé dans le répertoire officiel des entreprises (INSEE) : l'entreprise doit exister et être active. Un seul compte par SIRET."],
  ["🛡️", "Décennale contrôlée", "Obligatoire pour répondre. L'attestation est lue et comparée à la fiche : même entreprise, dates de validité, métiers couverts."],
  ["⏰", "Badge retiré si l'assurance expire", "Chaque nuit, nous retirons le badge « Vérifié » des artisans dont la décennale a expiré. Ils ne peuvent plus répondre avant d'envoyer la nouvelle."],
  ["📄", "RC Pro contrôlée", "Les artisans peuvent aussi déposer leur responsabilité civile professionnelle : le badge « RC Pro » n'apparaît qu'une fois l'attestation contrôlée."],
  ["🌿", "RGE vérifié à la source", "La mention RGE est vérifiée dans le registre officiel de l'ADEME (annuaire France Rénov'), pas déclarée par l'artisan."],
  ["⭐", "Avis de vrais clients", "Seuls les clients ayant signé un devis avec l'artisan peuvent laisser un avis."],
] as const;

export default function Controles() {
  return (
    <section className="mt-16">
      <h2 className="text-center text-2xl font-extrabold">Chaque artisan est contrôlé</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">Les badges affichés sur les offres correspondent à des vérifications réelles, mises à jour automatiquement.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CONTROLES.map(([icon, t, d]) => (
          <div key={t} className="card flex gap-3">
            <span className="text-2xl">{icon}</span>
            <div><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>
          </div>
        ))}
      </div>
      <p className="mt-4 flex flex-wrap justify-center gap-1 text-xs">
        <span className="chip bg-green-100 text-green-800">✔ Vérifié par Rénolien</span>
        <span className="chip bg-slate-100 text-slate-700">SIRET ✓</span>
        <span className="chip bg-blue-100 text-blue-800">Décennale ✓</span>
        <span className="chip bg-indigo-100 text-indigo-800">RC Pro ✓</span>
        <span className="chip bg-emerald-100 text-emerald-800">🌿 RGE</span>
      </p>
    </section>
  );
}
