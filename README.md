# Louhichi International

Prototype fonctionnel du site Louhichi International — Import & Export.

## Lancer localement

```powershell
node server.mjs
```

Puis ouvrir `http://127.0.0.1:3000`.

## État actuel

- identité visuelle basée sur `#111111`, `#0B1F33`, `#F5F3EF` et `#C8A96B` ;
- page publique responsive ;
- 720 images d’animation issues de six cinématiques Higgsfield, réparties sur les sept étapes ;
- 120 positions par séquence, regroupées en 72 planches WebP optimisées puis affichées sur canvas selon la position exacte du scroll ;
- aucune vidéo lancée ou téléchargée par le navigateur lors de la consultation du site ;
- préchargement progressif des planches pour préserver la fluidité et réduire fortement le nombre de requêtes réseau ;
- tracker de démonstration (`LOU-26091`) ;
- formulaire de devis multi-étapes sans envoi de données ;
- aperçu de l’espace client ;
- aperçu interactif de l’administration et de ses échéances ;
- présentation de marque avec le logo officiel fourni ;
- section destinations sans publication de pays non validés ;
- contenus et destinations définitifs encore à valider ;
- logo officiel transparent/vectoriel encore à fournir ;
- séquences d’images optimisées pesant environ 13 Mo au total.

La direction et le plan de production se trouvent dans `docs/cinematic-direction.md`. Le fichier source actuellement disponible pour le logo est `assets/louhichi-logo-official.jpg`.

L’architecture des futures connexions est documentée dans `docs/integration-plan.md`. `.env.example` contient uniquement les noms des variables attendues, sans aucun secret.

## Sécurité

Le prototype ne collecte et ne transmet aucune donnée. Les futures clés d’API devront être stockées côté serveur et jamais ajoutées au dépôt Git.
