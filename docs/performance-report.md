# Cinématique Louhichi — optimisation mobile

6 septembre 2026. Aucun service métier ni média généré supplémentaire n’a été acheté.
Le montage, les quatre sections et le logo officiel sont conservés.

## Changements

L’ancien moteur décodait une planche de six images à la fois (13,5 Mio de pixels).
Son préchargement pouvait sauter une planche nécessaire pendant un plan inversé
ou accéléré. Les planches évincées étaient ensuite redemandées et redécodées.
Le flou du fond était recalculé à l’affichage et la hauteur mobile pouvait effacer
le canvas en redimensionnant son bitmap.

Le moteur v3 utilise des images WebP indépendantes, préparées avec leurs fonds.
Les octets compressés sont transportés en fichiers indexés de 24 images, jamais
décodés comme une grande planche. Un Worker charge et décode les prochaines images
selon le vrai montage, la direction et la vitesse du scroll. Les transferts sont
acquittés pour limiter le nombre d’images décodées encore en transit.

La scène dépend uniquement de la position du scroll : pas de vidéo automatique,
pas de rattrapage temporisé. Un mélange des images voisines, lui aussi piloté
uniquement par le scroll, adoucit le rendu standard. Le profil éco l’évite.

## Budgets vérifiés

| Mesure | Avant | Mobile v3 |
|---|---:|---:|
| Médias utiles compressés du parcours mobile | 10,53 Mo | 6,16 Mo |
| Fichiers de transport distincts | 64 planches | 16 fichiers indexés |
| Pixels décodés d’une unité | 13,5 Mio | 1,22 Mio |
| Cache d’images affichables | 40,5 Mio maximum | 20,7 Mio maximum |
| Cache + deux décodages/transferts réservés | 40,5 Mio | 23,16 Mio |

Ces valeurs ne sont PAS la mémoire totale du navigateur : s’ajoutent le cache
compressé (plafond 10 Mio, film mobile 5,87 Mio), le canvas (1,22 Mio), le poster,
les copies/GPU internes et la page. Les plafonds concernent les ressources gérées
par l’application, pas une mesure du processus système.

Trois profils, quatre clips de 96 images chacun :

- Mobile : 384 × 832, 6 160 062 octets de fichiers indexés.
- Éco : 288 × 624, 3 993 190 octets.
- Ordinateur : 960 × 600, 7 176 210 octets.

Les 1 152 images ont été entièrement décodées lors de la conversion. Les offsets,
longueurs RIFF, dimensions, posters et 48 empreintes SHA-256 ont été contrôlés.
Le script de reconstruction est `scripts/build-film-packs.cjs`.

## Protocole et observations

Essais dans un navigateur de bureau avec fenêtre interne fixe 390 × 844, pas sur
un téléphone physique. Instrumentation locale : aller en 18 s, retour en 12 s,
sauts à 72 % puis 18 %, arrêt. La surcharge d’instrumentation et la charge du PC
font varier les temps ; il ne s’agit pas d’une certification 60 FPS.

Avant, en réseau local, un parcours a entraîné 152 chargements/décodages et
25,27 Mo de réponses. Le retour pouvait rester sur une scène ancienne malgré
des callbacks d’affichage régulièrement espacés. Un bon rythme de callbacks
ne suffit donc pas à prouver que les bonnes images sont affichées.

Sur le réseau ralenti simulé (150 ms + environ 4 Mbit/s par réponse, deux réponses
au plus en parallèle pour v3), le profil mobile standard v3 a terminé le parcours :

- 16 fichiers chargés, 6,16 Mo, aucune erreur média.
- Retard au 95e percentile : une image de la chronologie ; écart supérieur à trois
  images pour environ 0,52 % des échantillons, notamment aux sauts.
- Intervalle des callbacks au 95e percentile : 16,8 ms ; huit intervalles >34 ms.
- Coût maximal observé de la soumission du dessin : 3,6 ms. Ce n’est pas une mesure GPU.
- Retour à l’image 0, arrêt stable à l’image 68.

Dans le même scénario ralenti, l’ancien moteur a conservé de nombreuses images
obsolètes (écart >3 images pour environ 93 % des échantillons). Ces résultats
caractérisent ce test reproductible, pas tous les appareils et réseaux.

Le premier canvas a été visible après 2,64 s dans cet essai v3 ralenti ; le poster
prioritaire reste visible pendant l’attente. Les premiers affichages varient
suivant la charge et le réseau. Aucun « zéro latence » universel n’est promis.

## Tests de non-régression

`npm test` contrôle les liens internes, les quatre sections, l’absence de vidéo,
les médias actifs et le caractère fictif/non transmis des formulaires.
Une simulation déterministe du moteur parcourt 1 536 positions (deux allers-retours),
avec seulement 16 transferts de fichiers, cache borné, plans inversés et accélérés.
Elle vérifie aussi la limite de deux bitmaps en transit, pause/reprise après ACK,
relance réseau sans nouveau scroll et libération des ressources sur erreur de transfert.

Le repli sans Worker a également terminé le parcours mobile : 16 transferts,
aucune erreur, retard au 95e percentile d’une image. Contrôles interactifs validés :
arrêt réellement immobile, bitmap inchangé après redimensionnement en hauteur,
libération du cache hors du parcours, reprise sans rechargement réseau des fichiers
déjà en mémoire, mode léger sans nouveaux chargements et réactivation volontaire.
Les reprises avec Worker ont également passé les contrôles d’arrêt, de hauteur,
de libération hors écran et de réactivation. Le total d’octets peut continuer à
augmenter si le préchargement n’avait pas fini avant la sortie du parcours.
Le rendu a été inspecté à 390 × 844, 360 × 640 et 844 × 390 ; navigation mobile,
recherche de l’exemple Dakar et onglet documents contrôlés après la modification.

## Limites restantes

- Vérification matérielle Safari/iPhone et Android milieu de gamme à effectuer.
- Réseau coupé ou défilement brutal vers une scène non chargée : maintien du dernier
  visuel, plutôt qu’un écran noir ; une attente peut subsister.
- Réduction des animations et économie de données : version statique par défaut,
  avec activation volontaire possible. Petits appareils/réseaux 2G : profil éco.
- Les imperfections déjà présentes dans les images générées ne sont pas corrigées
  par l’optimisation technique (dont une inscription dans le plan large initial).
- Suivi réel, authentification, documents privés et envoi du devis restent à connecter.
