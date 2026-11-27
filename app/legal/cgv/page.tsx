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
      <p>Les prix s'entendent hors taxes ; la TVA éventuellement applicable est ajoutée au taux en vigueur.</p>
      <ul>
        <li>L'envoi d'une offre n'est pas décompté. Un « client » est décompté lorsqu'un Client choisit l'offre de l'Artisan. Si le Client renonce à ce choix avant l'envoi du devis définitif (avant la visite), le crédit est rendu à l'Artisan. Le devis définitif, les modifications et les avenants ne sont pas décomptés.</li>
        <li>Le nombre d'offres en attente de réponse en même temps est limité selon la formule. Une offre choisie, refusée, retirée ou expirée libère une place.</li>
        <li>Clients pris en avance : une offre envoyée reste visible jusqu'à son expiration. Si un Client choisit l'offre d'un Artisan qui a déjà utilisé tous ses clients du mois et n'a plus de client offert, le choix est accepté et le client est « pris en avance » sur les mois suivants. Tant qu'une avance n'est pas remboursée, l'Artisan ne peut pas envoyer de nouvelle offre ; ses offres déjà envoyées restent valables. L'avance est remboursée automatiquement, dans cet ordre, par les clients du nouveau mois, puis par les clients offerts, ou immédiatement en cas de passage à une formule supérieure. Elle n'est jamais facturée en supplément.</li>
        <li>Formule évolutive (option) : l'Artisan abonné à une formule payante peut activer cette option depuis l'espace « Abonnement ». Lorsqu'un client est pris en avance au cours d'un mois, l'Artisan est informé et son abonnement passe automatiquement à la formule immédiatement supérieure le 1er du mois suivant, au tarif en vigueur de cette formule (remise éventuelle comprise), avec ajustement au prorata par Stripe. L'Artisan peut désactiver l'option et revenir à une formule inférieure à tout moment. Sans l'option, aucun changement de formule n'est fait sans son accord.</li>
        <li>Le compteur repart à zéro le premier jour de chaque mois civil. Les crédits non utilisés ne sont pas reportés.</li>
        <li>L'Éditeur peut offrir une formule pour une durée déterminée ou des clients offerts ; à l'échéance, l'Artisan repasse en formule Découverte. Les clients offerts sont utilisés une fois la limite mensuelle atteinte.</li>
        <li>Phase de lancement et membres fondateurs : les Artisans inscrits pendant la phase de lancement (jusqu'au 1er janvier 2027 inclus, date pouvant être prolongée par l'Éditeur) ont le statut de membre fondateur. Pendant cette phase, ils bénéficient gratuitement de la formule Illimitée, sans moyen de paiement. À la fin de la phase, ils en sont prévenus au moins 30 jours à l'avance ; la formule Découverte reste gratuite et les formules payantes leur sont proposées avec une remise de 30 % à vie, tant que l'abonnement reste actif sans interruption de plus de 3 mois. Un seul statut par entreprise (même SIRET). L'Éditeur peut retirer ce statut en cas de compte fictif, de doublon ou de manquement aux CGU.</li>
        <li>Parrainage : un Artisan inscrit avec le lien d'un autre Artisan reçoit 1 client offert ; le parrain reçoit 2 clients offerts lorsque son filleul envoie sa première offre. Les clients offerts n'ont pas de valeur monétaire et ne sont ni remboursables ni cessibles. L'Éditeur peut annuler les bonus obtenus par des comptes fictifs.</li>
        <li>« Pas de client, pas de facture » : si, pendant une période mensuelle d'abonnement payant, aucun Client n'a choisi d'offre de l'Artisan alors que celui-ci a envoyé au moins 3 offres au cours de cette même période, la mensualité suivante lui est offerte (remise de 100 % appliquée automatiquement sur la facture). Un choix annulé avec restitution du crédit n'est pas compté comme un client. Cette garantie ne donne lieu à aucun remboursement en argent ni report.</li>
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

      <h2>5. Prix et garantie de tarif</h2>
      <ul>
        <li>Garantie de tarif : le prix mensuel applicable à l'abonnement payant de l'Artisan au jour de sa souscription (remise éventuelle comprise) est garanti tant que cet abonnement reste actif sans interruption. Les changements de tarifs décidés par l'Éditeur s'appliquent aux nouvelles souscriptions, sans effet sur les abonnements en cours.</li>
        <li>La garantie prend fin en cas de résiliation, de passage en formule Découverte, de défaut de paiement non régularisé ou de résiliation par l'Éditeur pour manquement. Une nouvelle souscription se fait alors au tarif en vigueur à cette date. Un changement de formule se fait au tarif en vigueur de la nouvelle formule, qui est alors garanti dans les mêmes conditions.</li>
        <li>Par exception, en cas d'augmentation importante et justifiée de ses coûts (prestataires techniques, paiement, hébergement, envois de SMS ou d'e-mails, taxes ou obligations légales nouvelles), l'Éditeur peut réviser le tarif des abonnements en cours, avec un préavis d'au moins 2 mois par e-mail. L'Artisan qui refuse le nouveau tarif peut résilier sans frais avant son entrée en vigueur.</li>
        <li>Les modifications de TVA ou de taxes applicables s'appliquent de plein droit.</li>
      </ul>

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
