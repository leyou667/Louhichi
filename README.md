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
- Sources : 96 images exportées par prise. Le moteur v3 décode des images WebP
  indépendantes, regroupées en petits fichiers de transport indexés (24 images).
- Montage : découverte/chargement, camion/port, levage court, dépose corrigée, traversée.
- La première prise de grue est écartée en entier. Le levage utilise le plan
  de chargement inversé, puis une nouvelle prise assure la dépose horizontale.
- Sources verticales natives 576 × 1024 ; plans larges 1024 × 576.
- Rendus mobiles 384 × 832, éco 288 × 624 et ordinateur 960 × 600.
- Les prises verticales intermédiaires restent intégralement visibles sur ordinateur :
  arrière-plan atmosphérique issu de la même image, sans bandes noires.
- Décodage dans un Worker, repli compatible sans Worker, deux opérations maximum.
- Préchargement selon le sens et la vitesse du scroll, y compris les plans inversés.
- Cache mobile de 17 images (20,7 Mio) ; deux places réservées au décodage/transfert.
  Total pixels borné à moins de 24 Mio mobile / 32 Mio ordinateur, hors canvas,
  poster, cache compressé (10 Mio maximum) et allocations internes du navigateur.
- Les effets atmosphériques sont calculés à la conversion, pas pendant le scroll.
- La hauteur de la barre d’adresse ne redimensionne plus le bitmap du canvas.
- Premier visuel prioritaire ; conservation du dernier rendu si une image manque.
- Version statique avec réduction des animations ou économie de données ; bouton
  de bascule et liens de passage direct. Profil éco pour appareil peu puissant.
- Aucun élément video, aucune lecture automatique et aucun MP4 chargé par le site.

Médias actifs dans assets/film-v3/. Sources de conversion dans assets/film-v2/.
Les anciennes cinématiques restent
archivées dans assets/cinematics/ et ne sont plus référencées par la page.
Les fichiers vidéo originaux ne font pas partie de la publication.

### Vérification et reconstruction des médias

- `npm test` vérifie les fichiers et le moteur : 1 536 positions, aller-retour,
  cache borné, reprise après pause, nouvelle tentative réseau, nettoyage des transferts.
- `scripts/build-film-packs.cjs` reconstruit les profils avec Sharp 0.35.4
  (dépendance de conversion seulement ; le site n’a aucune dépendance d’exécution).
- Syntaxe : `node scripts/build-film-packs.cjs assets/film-v2 assets/film-v3`.
  Sharp doit être accessible par `require('sharp')` ou `LOUHICHI_SHARP_PATH`.
- Mesures et limites : [rapport de performance](docs/performance-report.md).

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
