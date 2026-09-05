# Louhichi International

Site mobile-first de Louhichi International — Import & Export.
Version publique : https://leyou667.github.io/Louhichi/

## Exécution

Projet statique sans dépendance ni étape de compilation.
Node.js sert uniquement à la prévisualisation et aux vérifications.

- Développement : npm run dev
- Vérification syntaxique : npm run check
- Ouvrir http://127.0.0.1:3000/

## Refonte du 5 septembre 2026

Quatre ensembles : accueil cinématographique, services, espace client unifié, devis/contact.
Palette officielle et monogramme JPG fourni préservés ; icônes vectorielles homogènes.

### Cinématique au défilement

- Un canvas plein écran, au début du site, animé uniquement par la position du scroll.
- Sept chapitres narratifs et sept prises Higgsfield : cinq verticales, deux horizontales.
- 96 images exportées par prise, en planches WebP de six images.
- Montage : découverte/chargement, camion/port, levage court, dépose corrigée, traversée.
- La première prise de grue est écartée en entier. Le levage utilise le plan
  de chargement inversé, puis une nouvelle prise assure la dépose horizontale.
- Versions verticales natives 576 × 1024 ; plans larges 1024 × 576.
- Les prises verticales intermédiaires restent intégralement visibles sur ordinateur :
  arrière-plan atmosphérique issu de la même image, sans bandes noires.
- Préchargement des images voisines ; trois planches décodées au maximum, soit
  40,5 Mio de pixels de planches (hors canvas, moteur du navigateur et cache réseau).
- Premier visuel prioritaire ; conservation du dernier rendu si une image manque.
- Version statique avec réduction des animations, économie de données ou appareil
  annonçant au plus 2 Go de mémoire ; bouton de bascule et liens de passage direct.
- Aucun élément video, aucune lecture automatique et aucun MP4 chargé par le site.

Sources optimisées dans assets/film-v2/. Les anciennes cinématiques restent
archivées dans assets/cinematics/ et ne sont plus référencées par la page.
Les fichiers vidéo originaux ne font pas partie de la publication.

### Fonctions de démonstration

- Recherche par référence Louhichi et numéro de conteneur de démonstration.
- Expédition, documents téléchargeables d'exemple et compte réunis en trois onglets.
- Références : LOU-26091, LOU-25842, LOU-25117.
- Vue gestion compacte avec échéances fictives.
- Devis en quatre étapes avec validation ; aucune transmission ni conservation.
- Navigation clavier, menu mobile, contrôles tactiles.

## Connexions à terminer

Le suivi réel, l'authentification, le stockage des documents et l'envoi des devis
nécessitent des services serveur et des accès métier. Les coordonnées professionnelles,
mentions légales et destinations commerciales doivent être validées avant usage réel.
Le site public est explicitement une démonstration.

Ne jamais placer de clé API, de données client ou de documents privés dans le dépôt
public. GitHub Pages n'est pas un backend. Voir docs/integration-plan.md.
21st.dev reste une finition facultative, non nécessaire au fonctionnement actuel.

## Publication

GitHub Pages publie la branche main à la racine. Le dépôt distant et son historique
sont conservés ; la publication n'exige pas l'écriture dans le dossier .git local.
