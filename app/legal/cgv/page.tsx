import LegalPage, { V } from "../LegalPage";
import { LEGAL as L } from "@/lib/legal";
import { FORMULES } from "@/lib/formules";

export const metadata = { title: `Conditions générales de vente — ${L.app}` };

export default function Page() {
  return (
    <LegalPage title="Conditions générales de vente (abonnements artisans)">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent les abonnements souscrits par les professionnels (l'« Artisan ») auprès de <V>{L.editor}</V> (l'« Éditeur »)
        pour répondre aux demandes de travaux publiées sur {L.app}. Elles complètent les <a href="/legal/cgu">conditions générales d'utilisation</a>.
        L'abonnement est réservé aux professionnels agissant pour les besoins de leur activité.
      </p>

      <h2>2. Formules</h2>
      <table className="w-full border-collapse text-sm">
        <thead><tr className="border-b text-left"><th className="py-1">Formule</th><th>Clients par mois</th><th>Offres en attente</th><th>Prix par mois</th></tr></thead>
        <tbody>
          {FORMULES.map((f) => (
            <tr key={f.id} className="border-b"><td className="py-1">{f.nom}</td><td>{f.quota ?? "illimités"}</td><td>{f.attente ?? "illimitées"}</td><td>{f.prix ? `${f.prix} €` : "gratuit"}</td></tr>
          ))}
        </tbody>
      </table>
      <p>Les prix s'entendent <V>[HT, TVA en sus au taux en vigueur / TVA non applicable, art. 293 B du CGI]</V>.</p>
      <ul>
        <li>L'envoi d'une offre n'est pas décompté. Un « client » est décompté lorsqu'un Client choisit l'offre de l'Artisan. Si le Client renonce à ce choix avant l'envoi du devis définitif (avant la visite), le crédit est rendu à l'Artisan. Le devis définitif, les modifications et les avenants ne sont pas décomptés.</li>
        <li>Le nombre d'offres en attente de réponse en même temps est limité selon la formule. Une offre choisie, refusée, retirée ou expirée libère une place.</li>
        <li>Si plusieurs Clients choisissent l'Artisan alors que sa limite mensuelle est atteinte, les choix restent valables ; l'Artisan ne peut plus envoyer de nouvelle offre jusqu'au mois suivant ou à un changement de formule.</li>
        <li>Le compteur repart à zéro le premier jour de chaque mois civil. Les crédits non utilisés ne sont pas reportés.</li>
        <li>L'Éditeur peut offrir une formule pour une durée déterminée ou des clients offerts ; à l'échéance, l'Artisan repasse en formule Découverte. Les clients offerts sont utilisés une fois la limite mensuelle atteinte.</li>
        <li>Offre de lancement : les 50 premiers comptes Artisans créés à compter du 11 novembre 2026 reçoivent automatiquement la formule Illimitée pendant 60 jours, sans moyen de paiement. Un seul compte et un seul bénéfice par SIRET, y compris après suppression d'un compte. À l'échéance, l'Artisan repasse en formule Découverte sauf souscription d'une formule payante. L'Éditeur peut retirer l'avantage en cas de compte fictif ou de doublon.</li>
        <li>Parrainage : un Artisan inscrit avec le lien d'un autre Artisan reçoit 1 client offert ; le parrain reçoit 2 clients offerts lorsque son filleul envoie sa première offre. Les clients offerts n'ont pas de valeur monétaire et ne sont ni remboursables ni cessibles. L'Éditeur peut annuler les bonus obtenus par des comptes fictifs.</li>
        <li>L'abonnement donne accès aux demandes : il ne garantit aucun nombre de demandes, de choix par les Clients ou de chantiers.</li>
        <li>La formule souscrite n'a aucune influence sur le classement des offres.</li>
      </ul>

      <h2>3. Souscription et paiement</h2>
      <ul>
        <li>L'abonnement est souscrit depuis l'espace « Abonnement ». Il est payable mensuellement et d'avance par carte bancaire, via le prestataire Stripe. L'Éditeur n'a pas accès aux données de carte.</li>
        <li>Il est reconduit automatiquement chaque mois jusqu'à résiliation.</li>
        <li>Un changement de formule prend effet immédiatement ; Stripe calcule l'ajustement au prorata.</li>
        <li>En cas d'échec de paiement, l'Éditeur peut repasser le compte en formule Découverte après une relance restée sans effet.</li>
        <li>Une facture est émise pour chaque paiement et disponible depuis l'espace « Abonnement ».</li>
      </ul>

      <h2>4. Durée et résiliation</h2>
      <ul>
        <li>L'abonnement est sans engagement de durée. Il peut être résilié à tout moment depuis l'espace « Abonnement ».</li>
        <li>La résiliation prend effet à la fin de la période déjà payée ; aucun remboursement au prorata n'est dû. L'Artisan repasse ensuite en formule Découverte.</li>
        <li>La suppression du compte met fin immédiatement à l'abonnement, sans remboursement de la période en cours.</li>
        <li>L'Éditeur peut résilier l'abonnement d'un Artisan qui ne respecte pas les conditions générales d'utilisation (fausses informations, assurance non valable, comportements interdits), après information sauf urgence.</li>
      </ul>

      <h2>5. Prix</h2>
      <p>L'Éditeur peut modifier ses tarifs moyennant un préavis de 30 jours. L'Artisan qui refuse le nouveau tarif peut résilier avant son entrée en vigueur.</p>

      <h2>6. Absence de droit de rétractation</h2>
      <p>L'abonnement étant souscrit par un professionnel pour les besoins de son activité, le droit de rétractation du Code de la consommation ne s'applique pas, sauf cas prévus par la loi.</p>

      <h2>7. Responsabilité</h2>
      <p>
        L'Éditeur fournit la Plateforme avec diligence, sans garantie de résultat commercial. Sa responsabilité, si elle était engagée, est limitée
        au montant payé par l'Artisan au cours des trois derniers mois. L'Artisan reste seul responsable de ses devis, de ses travaux et de ses
        relations avec les Clients.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, tout litige relève des tribunaux compétents du ressort
        du siège de l'Éditeur (<V>{L.city}</V>). Contact : <V>{L.email}</V>.
      </p>
    </LegalPage>
  );
}
