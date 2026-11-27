/** Promesse artisans, affichée en haut des pages entreprises */
export default function PasDeClient() {
  return (
    <div className="rounded-2xl border-2 border-flame bg-orange-50 p-4 text-left">
      <p className="text-lg font-extrabold text-orange-900">💶 Vous payez seulement si un client vous choisit</p>
      <p className="mt-1 text-sm text-orange-900">Envoyer une offre est gratuit, 0 % de commission sur vos chantiers.</p>
      <p className="mt-2 font-bold text-orange-900">🎁 Pas de client, pas de facture : aucun client dans le mois, le mois suivant est offert.</p>
    </div>
  );
}
