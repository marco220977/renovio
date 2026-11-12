import LegalPage, { V } from "../LegalPage";
import { LEGAL as L } from "@/lib/legal";

export const metadata = { title: `Politique de confidentialité — ${L.app}` };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>1. Responsable du traitement</h2>
      <p>
        <V>{L.editor}</V>, <V>{L.address}</V>, est responsable des traitements de données personnelles réalisés sur {L.app}.
        Contact pour toute question ou demande : <V>{L.email}</V>.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><b>Tous les utilisateurs</b> : nom, e-mail, téléphone, mot de passe (chiffré), date d'inscription.</li>
        <li><b>Clients</b> : description des travaux, réponses aux questions, photos, code postal et ville, adresse du chantier, coordonnées de contact, devis signés et signature, avis.</li>
        <li><b>Artisans</b> : informations de l'entreprise (raison sociale, SIRET, adresse, métiers, départements), assurance décennale et attestation, certifications, tarifs, offres et devis, historique d'abonnement (les données de carte sont traitées uniquement par Stripe).</li>
        <li><b>Messages</b> échangés entre Clients et Artisans, et propositions de visite.</li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>Mise en relation, gestion des demandes, offres, devis, signatures et avenants : exécution du contrat (CGU).</li>
        <li>Préparation automatique des cahiers des charges et des devis par intelligence artificielle : exécution du contrat.</li>
        <li>Abonnements des Artisans et facturation : exécution du contrat et obligations comptables.</li>
        <li>Vérification des Artisans, prévention des fraudes et sécurité : intérêt légitime de l'Éditeur et des utilisateurs.</li>
        <li>Classement des offres et affichage des avis : exécution du contrat et obligations de transparence.</li>
      </ul>

      <h2>4. Qui voit quoi</h2>
      <ul>
        <li>Les Artisans des métiers et départements concernés voient la demande (description, photos, ville, cahier des charges), <b>sans</b> les coordonnées du Client.</li>
        <li>Les coordonnées et l'adresse du chantier ne sont transmises qu'à l'Artisan choisi par le Client.</li>
        <li>Un Artisan ne voit jamais les offres ni les messages des autres Artisans.</li>
        <li>Les Clients voient la fiche publique des Artisans (raison sociale, ville, SIRET, assurance, présentation, avis).</li>
        <li>L'Éditeur (administrateur) accède aux données nécessaires à la gestion et à la modération de la Plateforme.</li>
      </ul>

      <h2>5. Sous-traitants</h2>
      <ul>
        <li>Supabase Inc. : base de données, comptes et fichiers (serveurs dans l'Union européenne, à Paris).</li>
        <li>Vercel Inc. : hébergement de l'application (États-Unis / réseau mondial).</li>
        <li>Anthropic PBC (États-Unis) : intelligence artificielle. Les descriptions de travaux, réponses, photos et tarifs nécessaires y sont transmis pour générer les questions, cahiers des charges et devis ; les coordonnées des Clients ne sont pas transmises.</li>
        <li>Stripe Payments Europe Ltd (Irlande) : paiement des abonnements des Artisans.</li>
        <li>Sendinblue SAS / Brevo (France) : envoi des e-mails de prospection aux professionnels.</li>
      </ul>
      <p><b>Prospection des professionnels.</b> Rénolien peut contacter par e-mail ou par courrier des entreprises du bâtiment pour leur présenter la Plateforme. Les données utilisées (nom de l'entreprise, adresse, métier, e-mail ou téléphone professionnels) proviennent de registres publics : le répertoire Sirene de l'INSEE et la liste des entreprises RGE publiée par l'ADEME. Base légale : intérêt légitime de l'Éditeur à faire connaître son service à des professionnels, pour un message en rapport avec leur activité. Chaque e-mail contient un lien de désinscription ; l'opposition est aussi possible à tout moment par e-mail. Les entreprises ayant demandé à l'INSEE la non-diffusion de leurs données ne sont jamais contactées. Ces données sont supprimées 3 ans après le dernier contact sans réponse.</p>
      <p>Les transferts hors de l'Union européenne sont encadrés par les clauses contractuelles types de la Commission européenne ou un mécanisme équivalent.</p>

      <h2>6. Durées de conservation</h2>
      <ul>
        <li>Les données du compte sont conservées tant que le compte existe. Elles sont effacées lorsque l'utilisateur supprime son compte.</li>
        <li>Les factures d'abonnement sont conservées 10 ans (obligation comptable).</li>
        <li>Les Clients et les Artisans sont invités à télécharger leurs devis signés : chacun doit conserver ses propres documents (10 ans pour les professionnels).</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>La Plateforme n'utilise que des cookies strictement nécessaires (maintien de la connexion). Aucun cookie publicitaire ou de mesure d'audience n'est déposé.</p>

      <h2>8. Sécurité</h2>
      <p>Les échanges sont chiffrés (HTTPS). L'accès aux données est limité par des règles de sécurité au niveau de la base de données (chaque utilisateur n'accède qu'à ce qui le concerne).</p>

      <h2>9. Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Depuis votre espace, vous pouvez
        modifier vos informations, <b>télécharger vos données</b> et <b>supprimer votre compte</b>. Pour toute autre demande : <V>{L.email}</V>.
        Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).
      </p>
    </LegalPage>
  );
}
