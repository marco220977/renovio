import LegalPage, { V } from "../LegalPage";
import { LEGAL as L } from "@/lib/legal";

export const metadata = { title: `Conditions générales d'utilisation — ${L.app}` };

export default function Page() {
  return (
    <LegalPage title="Conditions générales d'utilisation">
      <h2>1. Objet</h2>
      <p>
        {L.app} (la « Plateforme »), éditée par <V>{L.editor}</V> (l'« Éditeur »), met en relation des particuliers ayant un projet de travaux
        de rénovation (les « Clients ») avec des professionnels du bâtiment (les « Artisans »). Les présentes conditions s'appliquent à toute
        personne qui crée un compte. La création d'un compte vaut acceptation des présentes conditions. Les Artisans acceptent en outre les
        conditions générales de vente applicables aux abonnements.
      </p>

      <h2>2. Rôle de la Plateforme</h2>
      <ul>
        <li>L'Éditeur est un intermédiaire. Il n'est pas partie au contrat de travaux conclu entre le Client et l'Artisan, ne réalise aucun travaux et n'en garantit ni l'exécution, ni la qualité, ni le prix.</li>
        <li>Aucun règlement de travaux ne transite par la Plateforme : le Client paie l'Artisan directement, selon les conditions du devis signé.</li>
        <li>L'utilisation de la Plateforme est gratuite pour les Clients. Les Artisans paient un abonnement à l'Éditeur pour répondre aux demandes au-delà de la formule gratuite.</li>
      </ul>

      <h2>3. Compte</h2>
      <p>
        L'utilisateur doit être majeur et fournir des informations exactes et à jour. Il est responsable de la confidentialité de son mot de passe
        et de toute utilisation de son compte. Il peut supprimer son compte à tout moment depuis son espace (« Compte » ou « Profil »), sauf si un
        chantier est en cours de choix ou de devis définitif.
      </p>

      <h2>4. Parcours du Client</h2>
      <ol>
        <li><b>Demande</b> : le Client décrit ses travaux, avec des photos s'il le souhaite. Une intelligence artificielle l'aide à préciser sa demande et rédige un cahier des charges avec une estimation de budget.</li>
        <li><b>Offres</b> : la demande est visible pendant 72 heures (48 heures si elle est urgente), ou jusqu'à 5 offres, par les Artisans des métiers et départements concernés. Les coordonnées du Client ne leur sont pas communiquées.</li>
        <li><b>Choix sans engagement</b> : le Client choisit un Artisan. Ses coordonnées sont alors transmises à cet Artisan pour organiser une visite.</li>
        <li><b>Devis définitif</b> : après la visite, l'Artisan confirme ou ajuste son devis. Les écarts avec le devis provisoire sont affichés. Le Client peut le refuser et choisir une autre offre encore disponible.</li>
        <li><b>Signature</b> : la signature électronique du devis définitif forme le contrat entre le Client et l'Artisan.</li>
        <li><b>Avenants</b> : tout travail supplémentaire doit faire l'objet d'un avenant, signé par le Client dans la Plateforme.</li>
      </ol>
      <p>
        <b>Droit de rétractation</b> : le devis étant signé à distance, le Client consommateur dispose d'un délai de 14 jours à compter de la signature
        pour se rétracter sans motif (articles L221-18 et suivants du Code de la consommation), directement depuis la Plateforme ou auprès de l'Artisan,
        sous réserve des exceptions prévues par la loi.
      </p>

      <h2>5. Estimations et intelligence artificielle</h2>
      <p>
        Le cahier des charges, les quantités et la fourchette de budget sont produits automatiquement à partir des informations fournies. Ils sont
        indicatifs, peuvent comporter des erreurs et n'engagent ni l'Éditeur ni les Artisans. Le devis pré-rempli proposé aux Artisans est une aide :
        chaque Artisan reste seul responsable des prix, quantités, taux de TVA et mentions de ses devis.
      </p>

      <h2>6. Obligations des Artisans</h2>
      <ul>
        <li>Être un professionnel régulièrement immatriculé et renseigner un SIRET valide.</li>
        <li>Être titulaire des assurances obligatoires, notamment l'assurance de responsabilité civile décennale pour les travaux qui y sont soumis, et en tenir l'attestation à jour.</li>
        <li>Établir des devis sincères et conformes à la réglementation, honorer le devis signé, et ne réaliser aucun travail supplémentaire sans avenant signé.</li>
        <li>N'envoyer qu'une offre par demande, modifiable une seule fois avant le choix du Client.</li>
      </ul>
      <p>Le badge « Vérifié » signifie que l'Éditeur a contrôlé le SIRET et l'attestation d'assurance fournis. Il ne garantit pas la qualité des travaux.</p>

      <h2>7. Classement des offres</h2>
      <p>Conformément à l'article L111-7 du Code de la consommation, les offres sont classées par un score sur 100 calculé ainsi :</p>
      <ul>
        <li>prix, comparé aux autres offres reçues : 40 points (un prix anormalement bas par rapport à l'estimation n'est pas avantagé) ;</li>
        <li>avis des Clients précédents : 30 points (note neutre en l'absence d'avis) ;</li>
        <li>délai de démarrage : 15 points ;</li>
        <li>profil (vérification, certification RGE, assurance, présentation) : 15 points ;</li>
        <li>une pénalité s'applique aux Artisans dont les devis définitifs sont, en moyenne, nettement plus élevés que leurs devis provisoires.</li>
      </ul>
      <p>La formule d'abonnement de l'Artisan n'a aucune influence sur le classement. Aucun Artisan ne peut payer pour être mieux classé.</p>

      <h2>8. Avis</h2>
      <p>
        Seul un Client ayant signé un devis avec un Artisan via la Plateforme peut publier un avis sur cet Artisan, une fois par demande.
        Les avis ne donnent lieu à aucune contrepartie. L'Éditeur peut retirer un avis contenant des propos injurieux, diffamatoires, hors sujet
        ou des données personnelles. Les avis sont affichés avec leur note et ne sont pas triés selon leur caractère positif ou négatif.
      </p>

      <h2>9. Comportements interdits</h2>
      <ul>
        <li>Publier de fausses demandes ou de fausses offres, ou usurper l'identité d'un tiers.</li>
        <li>Utiliser les coordonnées obtenues à d'autres fins que le projet concerné (démarchage, revente…).</li>
        <li>Publier des contenus illicites, injurieux ou discriminatoires, dans les demandes, offres, messages ou avis.</li>
        <li>Tenter de contourner les mesures de sécurité de la Plateforme.</li>
      </ul>
      <p>En cas de manquement, l'Éditeur peut suspendre ou supprimer le compte concerné, après avoir informé l'utilisateur sauf urgence.</p>

      <h2>10. Responsabilité</h2>
      <p>
        L'Éditeur s'efforce d'assurer l'accès à la Plateforme mais ne garantit pas une disponibilité permanente. Il n'est pas responsable de
        l'exécution des travaux, des retards, malfaçons ou impayés, qui relèvent de la relation entre le Client et l'Artisan. Il ne garantit
        pas qu'une demande recevra des offres.
      </p>

      <h2>11. Données personnelles</h2>
      <p>Le traitement des données est décrit dans la <a href="/legal/confidentialite">politique de confidentialité</a>.</p>

      <h2>12. Modification des conditions</h2>
      <p>L'Éditeur peut modifier les présentes conditions. Les utilisateurs sont informés de toute modification importante avant son entrée en vigueur.</p>

      <h2>13. Litiges</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige avec l'Éditeur, le Client consommateur peut recourir
        gratuitement au médiateur de la consommation : <V>{L.mediateur}</V>. Les litiges entre un Client et un Artisan relatifs aux travaux
        relèvent de leur relation contractuelle. Contact : <V>{L.email}</V>.
      </p>
    </LegalPage>
  );
}
