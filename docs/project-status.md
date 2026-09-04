# État du projet Louhichi

Dernière mise à jour : 4 septembre 2026.

## Fonctionnel dans le prototype

- page publique responsive ;
- identité visuelle officielle ;
- logo officiel intégré sans redessin ;
- services Booking, Transport et Douane ;
- storyboard cinématique en sept étapes piloté par le scroll ;
- 720 images WebP locales extraites de six séquences Higgsfield, soit 120 images par séquence ;
- canvas d’accueil et canvas du parcours pilotés par la position exacte du scroll ;
- préchargement progressif par groupes de huit images et cache partagé côté navigateur ;
- aucune balise vidéo et aucune URL Higgsfield distante dans la page publique ;
- section destinations sans allégations non validées ;
- tracker dynamique avec trois expéditions fictives et gestion des références inconnues ;
- formulaire de devis multi-étapes sans transmission ;
- espace client de démonstration ;
- administration de démonstration avec échéances et actions rapides ;
- FAQ et appels à l’action ;
- comportement mobile et préférence de réduction des animations.

## Préparé mais non connecté

- variables d’environnement documentées dans `.env.example` ;
- modèle de données et ordre des intégrations dans `docs/integration-plan.md` ;
- direction et prompt de la première cinématique dans `docs/cinematic-direction.md` ;
- connexions Higgsfield et GitHub vérifiées au niveau du compte ;
- dépôt GitHub public `leyou667/Louhichi` créé, encore vide.

## Bloqué ou en attente

- installation Next.js/21st.dev bloquée par les permissions Windows sur le dossier utilisateur ;
- création du premier commit bloquée par l’interdiction d’écriture dans `.git` ;
- publication du code sur GitHub en attente d’un accès en écriture au dossier local `.git` ;
- tracking réel impossible avant le choix d’un fournisseur et l’obtention de ses accès ;
- base de données, authentification, stockage, email et WhatsApp à choisir ;
- coordonnées et contenus commerciaux officiels manquants ;
- destinations réelles à valider ;
- SVG ou PNG transparent du logo recommandé pour les incrustations vidéo définitives.

## Higgsfield

- visuel maître du conteneur Louhichi généré et validé comme référence commune ;
- six séquences Cinema Studio Video de cinq secondes produites pour couvrir le parcours ;
- la séquence VGM sert aussi de fond à l’étape Formalités, enrichie par les documents interactifs du site ;
- les 720 images optimisées sont intégrées localement dans `assets/cinematics/frames` et pèsent environ 12 Mo ;
- les MP4 sources sont conservés localement pour maintenance mais exclus du futur dépôt Git ;
- solde Higgsfield après production : 43 crédits sur le plan Basic ;
- 37 crédits ont été consommés : 2 pour l’image maître, 30 pour les six vidéos retenues et 5 pour relancer une scène restée bloquée chez Higgsfield.
