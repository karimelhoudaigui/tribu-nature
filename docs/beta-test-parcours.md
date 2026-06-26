# Plan de test beta - parcours sociaux Tribu Nature

Objectif : verifier que les parcours principaux fonctionnent avec de vrais comptes, de vraies donnees Supabase, et restent visibles apres rafraichissement.

## Preparation

- Utiliser deux comptes differents, par exemple `Samy` et `Karim`.
- Ouvrir l'app dans deux navigateurs differents, ou un navigateur normal + une fenetre privee.
- Verifier que les deux comptes ont un profil visible et modifiable.

## 1. Profil

1. Se connecter avec le compte Samy.
2. Aller dans `Profil`.
3. Modifier la ville, la bio, le niveau physique, le style d'aventure ou les badges.
4. Enregistrer.
5. Rafraichir la page.

Resultat attendu :
- Les informations modifiees restent affichees.
- Les donnees viennent bien de Supabase, pas seulement de l'etat local du navigateur.

## 2. Demande pour rejoindre un Trip utilisateur

1. Samy cree une Trip depuis `Creer une Trip`.
2. Karim ouvre cette Trip et clique sur le bouton pour demander a rejoindre.
3. Samy doit recevoir une notification.
4. Samy ouvre la notification.
5. Samy consulte le profil de Karim depuis la notification.
6. Samy accepte la demande.

Resultat attendu :
- Karim apparait dans les participants de la Trip.
- Karim est ajoute dans la conversation de groupe du Trip.
- La notification peut etre marquee comme traitee.
- Apres refresh, le statut reste correct.

## 3. Idee de voyage catalogue

1. Samy clique sur `Tu es interesse` sur une idee de voyage.
2. Karim clique aussi sur `Tu es interesse` sur la meme idee.
3. Les deux ouvrent la conversation associee.
4. Samy envoie un message.
5. Karim repond.

Resultat attendu :
- Les deux utilisateurs voient les memes messages.
- Les deux utilisateurs apparaissent dans les participants.
- La conversation reste disponible apres refresh.

## 4. Ma tribu

1. Samy envoie une demande de tribu a Karim.
2. Karim voit la notification ou la demande entrante.
3. Karim accepte.
4. Samy ouvre `Ma tribu`.
5. Samy clique sur `Message` sur la ligne de Karim.
6. Samy envoie un message.
7. Karim ouvre `Ma tribu` et verifie la conversation.

Resultat attendu :
- Karim apparait dans la liste de tribu de Samy.
- Samy apparait dans la liste de tribu de Karim.
- La conversation privee est reelle et partagee entre les deux comptes.
- Les messages restent visibles apres refresh.

## 5. Mes Trips

1. Utiliser un compte qui est deja interesse ou participant d'une Trip.
2. Aller dans `Mes Trips`.
3. Cliquer sur la card de cette Trip.

Resultat attendu :
- Si l'utilisateur est deja interesse ou participant, la card ouvre directement la conversation.
- Elle n'ouvre pas une fiche informative statique.

## 6. Responsive

Tester les pages suivantes en largeur mobile :

- `Trips compatibles`
- detail Trip
- notifications
- `Ma tribu`
- conversation de groupe
- conversation privee
- `Profil`

Resultat attendu :
- Aucun bloc important ne sort de l'ecran.
- Les boutons restent accessibles.
- Les conversations restent lisibles.
- Les cards ne cassent pas la mise en page.

## 7. Regression rapide avant partage

Avant de partager une version beta :

```bash
npm run build
SUPABASE_ACCESS_TOKEN=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:flows
```

Ne pas mettre les cles secretes dans GitHub. Les injecter seulement en variable d'environnement locale ou dans l'outil de deploiement.
