# Plan d’intégration — Louhichi International

## Architecture cible

Le prototype actuel n’envoie et ne stocke aucune donnée. La version de production devra isoler le site public, l’espace client, l’administration et les connexions externes derrière une couche serveur sécurisée.

## Données principales

### Client

- identité et société ;
- contacts et préférences de notification ;
- utilisateurs autorisés ;
- historique des connexions et consentements.

### Expédition

- référence Louhichi ;
- numéro de conteneur ;
- origine, destination et ports ;
- marchandise, poids et type de conteneur ;
- compagnie, navire, ETD et ETA ;
- statut actuel et historique horodaté ;
- responsable interne.

### Jalons

`booking → positionnement → chargement → VGM → douane/MRN → gate-in → embarqué → en transit → arrivé`

Chaque mise à jour doit enregistrer l’auteur, la date, la source et une éventuelle note interne.

### Documents

- devis ;
- facture ;
- packing list ;
- booking ;
- BL ;
- EX-A et MRN ;
- preuve de sortie ;
- photos de chargement ;
- documents propres à la destination.

Les fichiers doivent être privés, chiffrés au repos et accessibles uniquement par lien temporaire après contrôle des droits.

## Connexions à prévoir

1. **Authentification** — comptes client et administrateur, récupération de mot de passe, rôles et double authentification pour l’administration.
2. **Base de données** — clients, expéditions, jalons, devis, factures, documents et journal d’audit.
3. **Stockage** — documents privés avec antivirus et durée de conservation définie.
4. **Tracking maritime** — fournisseur à choisir selon les compagnies réellement utilisées ; synchronisation planifiée avec reprise manuelle possible.
5. **Email/WhatsApp** — notifications uniquement après consentement et avec historique d’envoi.
6. **Facturation** — connexion au système comptable réel de Louhichi, sans dupliquer la source officielle.

## Ordre de réalisation

1. Valider les informations commerciales et les destinations.
2. Choisir l’hébergement, la base de données et l’authentification.
3. Migrer l’interface vers Next.js dès que l’installation des dépendances est disponible.
4. Construire les API serveur et le modèle de données.
5. Connecter le formulaire de devis.
6. Connecter l’espace client et les documents.
7. Ajouter le tracking maritime.
8. Ajouter les notifications et la facturation.
9. Réaliser les tests de sécurité, RGPD, sauvegarde et restauration.

## Informations métier manquantes

- coordonnées officielles et numéro WhatsApp ;
- pays et ports réellement desservis ;
- types de marchandises autorisés et exclus ;
- délais et conditions commerciales publiables ;
- outil actuel de devis/facturation ;
- source souhaitée pour le tracking ;
- durée de conservation des dossiers ;
- personnes autorisées à administrer la plateforme.

