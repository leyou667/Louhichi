# État du projet Louhichi

Mise à jour : 6 septembre 2026.

## Refonte réalisée

- Quatre ensembles : introduction plein écran, services, espace client/suivi unifié, devis/contact.
- Identité officielle bleu nuit, noir, ivoire, or ; monogramme officiel conservé.
- Icônes vectorielles camion, conteneur, navire, douane, suivi, documents et compte.
- Un seul canvas au scroll, réversible et immobile sans défilement.
- Prises portrait natives, deux plans panoramiques pour ordinateur.
- Sept prises Higgsfield converties en WebP, six retenues ; première prise de grue
  écartée en entier. Le chargement inversé fournit le levage depuis le camion,
  avant une descente horizontale dédiée sur le navire.
- Moteur v3 : images individuelles WebP, décodage Worker avec repli, transport
  regroupé en 16 fichiers par profil et cache compressé distinct du cache décodé.
- Cache mobile standard de 17 images (20,7 Mio), plus deux places de décodage/transfert.
  Canvas, poster et allocations du navigateur s'ajoutent à ce budget de pixels.
- Chargement orienté selon le défilement, premier visuel prioritaire, maintien du dernier rendu.
- Flou précalculé, absence de redimensionnement du canvas lors des seules variations de hauteur.
- Pause hors écran et reprise sans blocage ; tentatives réseau après échec.
- Mode léger, réduction des animations, économie de données ; accès direct aux sections.
- Recherche d'exemples, documents téléchargeables, onglets accessibles, aperçu gestion.
- Devis quatre étapes validé sans transmission ou stockage de données personnelles.

## Validation

- JavaScript de l'interface, du moteur de scroll et du serveur : vérification syntaxique.
- Recherche valide/invalide, exemple Dakar, navigation d'onglets au clavier.
- Devis vide bloqué puis parcours complet avec données fictives et confirmation explicite.
- Retour en arrière au scroll et image inchangée quand le scroll est arrêté.
- Vérifications visuelles en fenêtres de dimensions mobiles et ordinateur.
- Ces essais ne remplacent pas des tests matériels Safari iPhone et Android milieu de gamme.
- Optimisation et mesures détaillées : [rapport de performance](performance-report.md).

## Publication et accès

- Dépôt distant existant : leyou667/Louhichi.
- Site : https://leyou667.github.io/Louhichi/
- GitHub Pages est configuré sur main, racine.
- Les limites d'écriture du .git local n'empêchent pas la publication par la connexion GitHub.
- Les anciennes cinématiques sont conservées dans le dépôt mais plus utilisées.
- 21st.dev n'a pas été ajouté : finition facultative laissée pour la fin.

## À connecter avant exploitation commerciale

- Suivi réel des expéditions et fournisseur de données.
- Authentification et contrôle d'accès côté serveur.
- Base de données, stockage privé des pièces et téléchargement sécurisé.
- Réception des demandes de devis et confirmations email.
- Coordonnées de contact, identité légale, contenus et destinations validés.
- Informations de confidentialité adaptées aux futurs traitements de données.

Aucune clé privée ni donnée client réelle ne doit être publiée dans GitHub Pages.
Les références, documents et profils actuels sont explicitement fictifs.
