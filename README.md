# Rénovio — mise en relation particuliers et artisans de la rénovation

Le particulier décrit ses travaux, l'IA en fait un cahier des charges avec une estimation du budget, les artisans de son secteur
répondent avec un devis pré-rempli par l'IA à partir de leurs propres tarifs. Le client compare les offres (classées par score) et signe en ligne.

Next.js 14 · Supabase (comptes, base, stockage photos, fonction IA) · Claude (fonction `travaux-ia`)

## Parcours
- **Client** (`/client`) : nouvelle demande en 4 étapes (description + photos → questions de l'IA → cahier des charges + budget → coordonnées),
  suivi des demandes, comparatif des offres classées sur 100 (prix 40, avis 30, délai 15, profil 15), alerte « prix très bas »,
  PDF du devis, choix + signature au doigt, avis après chantier.
- **Artisan** (`/artisan`) : demandes ouvertes de ses métiers et départements, devis généré par l'IA avec ses tarifs puis modifiable ligne par ligne,
  une seule offre par demande (modifiable une fois, retirable), invisible des autres artisans ; coordonnées du client reçues seulement s'il est retenu.
  Onglets Mes offres, Tarifs (tarifs de départ par métier en 1 clic), Profil (SIRET, décennale, RGE, départements, franchise de TVA).

## Règles (dans la base, fichier `supabase/mise-en-relation.sql`)
- Demande ouverte 72 h (48 h si urgent) ou jusqu'à 5 offres.
- Pour répondre : SIRET à 14 chiffres + décennale valide + métier et département correspondants.
- Totaux des devis recalculés côté serveur. L'artisan ne peut pas cocher lui-même « Vérifié » : c'est l'admin (rôle `admin` dans `profils`).

## Installation
1. Supabase → SQL Editor : `supabase/schema.sql`, `supabase/catalogue.sql` (tarifs de départ), puis `supabase/mise-en-relation.sql`.
2. Edge Functions : déployer `supabase/functions/travaux-ia/index.ts` ; secret `ANTHROPIC_API_KEY` (et facultatif `ANTHROPIC_MODEL`).
3. Vercel : variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.

## Pas encore fait (V1)
Paiement des artisans (crédits / abonnement Stripe), messagerie client-artisan, notifications e-mail, back-office admin,
analyse des photos par l'IA côté artisan, CGU/CGV adaptées à la mise en relation (les pages `/legal` sont celles de l'ancienne appli).

---

# Ancienne appli devis (branche main)
# Rénovio — SaaS devis & factures pour tous les artisans de la rénovation

Déclinaison multi-métiers de Chantio. Next.js 14 · Supabase (comptes, base, stockage, fonction de scan) · Stripe (abonnements) · Claude (scan de plaque) · Vercel ou Netlify (hébergement)

## Métiers couverts (lib/trades.ts)
Plomberie et sanitaire · Chauffage, climatisation, PAC · Électricité · Maçonnerie et gros œuvre · Plâtrerie, cloisons · Isolation · Peinture et revêtements muraux · Carrelage et faïence · Parquet et sols souples · Menuiserie (fenêtres, portes, volets) · Couverture, charpente, zinguerie · Façade et ravalement · Cuisine, salle de bain, agencement · Terrassement, VRD, extérieurs · Petits travaux et multiservice

L'artisan choisit un ou plusieurs métiers à l'inscription (modifiable dans « Mon entreprise »). Cela adapte :
- le **catalogue de départ** (≈ 400 articles au total, prix HT indicatifs et TVA 5,5 / 10 / 20 % pré-réglées, chargés automatiquement), avec un filtre par métier ;
- les **exemples** affichés dans les champs (devis, chantier, SAV, réserves, planning) ;
- les **modules** : contrats et attestations d'entretien (chaudière, PAC, chauffe-eau thermodynamique, VMC) et scan de plaque seulement pour plomberie, chauffage et électricité. Sinon l'onglet Entretien est remplacé par Planning (superviseur) ou Quitus (technicien).

## Fonctions
- Tout Chantio : comptes et équipe (superviseurs / techniciens), essai 14 jours puis abonnement Stripe, clients, devis, signature sur place ou à distance avec photo, factures, acomptes, avoirs, envoi par e-mail, relances, planning, suivi de chantier avec photos, quitus / PV de réception avec réserves, SAV, chiffre d'affaires, export comptable, PWA
- **Devis par lots** (bouton « ＋ Lot ») : titres de lot, sous-totaux, récapitulatif par lot sur le PDF, lignes déplaçables ↑ ↓
- **Calcul de quantité** (📐 à côté de « Qté ») : longueur × largeur/hauteur × nombre − ouvertures
- **Mention TVA à taux réduit** conforme à la loi de finances 2025 : la certification du client figure sur le devis signé (plus de formulaire Cerfa), avec la clause spécifique 5,5 % si des travaux d'amélioration énergétique sont présents

## Import des catalogues fournisseurs
Catalogue → « 📥 Importer un catalogue fournisseur » (`/app/catalogue/import`) :
- **Excel / CSV** (lecture dans le téléphone, SheetJS) : détection automatique de l'en-tête et des colonnes (référence, désignation, prix net, unité, famille, marque), modifiables.
- **PDF / photo** : lecture par l'IA (fonction Supabase `lire-catalogue`, même secret `ANTHROPIC_API_KEY` que le scan).
- Remise fournisseur %, coefficient de vente, TVA, métier ; sélection des articles ; import par paquets.
- Réimporter un tarif du même fournisseur **met à jour les prix** des références existantes (fonction SQL `import_supplier_items`).

## Modifier le catalogue de départ
1. Modifier `data/catalogue.ts`.
2. `npm run catalogue` régénère `supabase/catalogue.sql`.
3. Exécuter `supabase/catalogue.sql` dans Supabase (SQL Editor). Les entreprises existantes récupèrent les nouveaux articles avec le bouton « Compléter mon catalogue ».

## Mise en ligne (tout depuis le téléphone)

### 1. Supabase
1. supabase.com → New project (région Europe — Paris ou Francfort).
2. SQL Editor → New query → coller tout `supabase/schema.sql` → Run, puis pareil avec `supabase/catalogue.sql`.
3. Edge Functions → créer la fonction `scan-plaque` avec le code de `supabase/functions/scan-plaque/index.ts`, puis Secrets → `ANTHROPIC_API_KEY`.
4. Authentication → URL Configuration → Site URL = l'adresse Vercel (étape 3).
5. Project Settings → API : noter `Project URL`, `anon public`, `service_role`.

### 2. Clé Anthropic (scan de plaque)
console.anthropic.com → API Keys → créer une clé.

### 3. Vercel
1. vercel.com → Add New → Project → importer le dépôt GitHub.
2. Environment Variables : remplir toutes les variables de `.env.example`.
3. Deploy.

### 4. Stripe
1. dashboard.stripe.com → Catalogue de produits → créer « Abonnement Pro », 29 € HT mensuel → copier le `price_...` dans `STRIPE_PRICE_ID`.
2. Développeurs → Webhooks → Ajouter un endpoint : `https://TON-SITE/api/stripe/webhook`,
   événements `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` → copier le secret `whsec_...` dans `STRIPE_WEBHOOK_SECRET`.
3. Paramètres → Portail client → activer (pour que les clients gèrent leur abonnement).
4. Redéployer sur Vercel après avoir ajouté les variables.

## À faire avant de vendre
- CGV/CGU, mentions légales et politique de confidentialité (RGPD) du SaaS.
- Réforme de la facture électronique : à partir de septembre 2026 toutes les entreprises doivent pouvoir recevoir des factures électroniques, et l'émission devient obligatoire pour les TPE/PME en septembre 2027, via une plateforme agréée (PA). Prévoir un partenariat API avec une plateforme agréée et la génération Factur-X (V2).
- Faire valider par un expert-comptable l'obligation de certification anti-fraude TVA (art. 286 I-3° bis du CGI), puisque l'appli enregistre des paiements de particuliers.
