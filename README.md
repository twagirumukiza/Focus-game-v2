# FOCUS — v2

Jeu de suivi visuel / concentration. Solo + multijoueur en ligne (mode Survie),
compatible tablette et téléphone, prêt pour GitHub Pages.

## Nouveautés de la v2 (par rapport à v1)

En **mode multijoueur uniquement** :

- ❌ **Le bouton STOP est supprimé.**
- ⏱️ À la place, le créateur du salon choisit un **minuteur d'observation
  (2 à 10 secondes)**. Une fois ce temps écoulé, les points se figent
  **automatiquement, au même instant pour tous les joueurs** (synchronisé
  via l'horloge du serveur Firebase).
- ⚡ S'ouvre alors une **fenêtre de réponse (3 à 5 secondes, réglable par
  le créateur)** : chaque joueur doit cliquer sur le bon point avant la fin
  de ce délai.
- 💀 Un mauvais clic — ou l'absence de réponse à temps — élimine le joueur.
  La partie continue avec les survivants.
- 📈 À chaque manche, le nombre de points et la vitesse augmentent
  (progression automatique), jusqu'à ce qu'il ne reste qu'un seul joueur :
  le vainqueur.

Le mode **Solo** n'est pas affecté : le bouton STOP y est conservé tel quel.

## Installation

### 1. Créer le projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com) et créer un projet.
2. **Authentication** → onglet "Sign-in method" → activer **Anonyme**.
3. **Realtime Database** (pas Firestore) → créer une base, démarrer en mode production.
4. Dans les règles de la Realtime Database, coller le contenu de `firebase-rules.json` puis publier.
5. **Paramètres du projet** → "Vos applications" → ajouter une application Web →
   copier l'objet de configuration.
6. Coller cette configuration dans `firebase/firebase-config.js` à la place des
   valeurs `REMPLACE_MOI`.

### 2. Publier sur GitHub Pages

1. Créer un dépôt GitHub (ex. `focusgame-v2`) et y pousser tout le contenu de ce dossier.
2. Dans les paramètres du dépôt → **Pages** → source : branche `main`, dossier `/root`.
3. Le jeu est accessible à `https://<ton-compte>.github.io/<nom-du-depot>/`.

Aucune installation serveur n'est nécessaire (HTML + CSS + JS + Firebase uniquement).

## Structure du projet

```
/
├── index.html
├── css/style.css
├── js/
│   ├── config.js     — constantes partagées (options, progression de difficulté)
│   ├── engine.js      — moteur physique déterministe à graine partagée (sync multijoueur)
│   ├── audio.js        — sons synthétisés (WebAudio), vibration, plein écran, réglages
│   ├── ui.js             — navigation entre écrans, composants de configuration
│   ├── solo.js            — mode Solo (bouton STOP)
│   ├── online.js           — mode En ligne (Firebase, minuteur + fenêtre de réponse)
│   ├── lobby.js              — écrans salon / classement
│   └── app.js                 — point d'entrée
├── firebase/firebase-config.js — à remplir avec tes clés Firebase
└── firebase-rules.json          — règles de sécurité Realtime Database
```

## Comment fonctionne la synchronisation multijoueur

Tous les joueurs d'une manche partent de la **même graine aléatoire (seed)**
et du même horodatage de départ (`roundStartAt`, fourni par le serveur
Firebase). Le moteur (`engine.js`) fait avancer la simulation par **pas de
temps fixes**, jamais selon le taux de rafraîchissement de l'appareil : une
tablette à 60 Hz et un téléphone à 120 Hz calculent donc exactement la même
trajectoire après le même temps écoulé, sans avoir besoin de s'échanger la
position de chaque point en continu.

Le gel automatique et la fenêtre de réponse utilisent la même horloge
synchronisée : tous les appareils se figent au même instant, indépendamment
du réseau ou de la latence d'affichage.

## Limite connue

Si un joueur rafraîchit sa page en pleine manche, la reconnexion automatique
le ramène au salon d'attente plutôt qu'à la manche en cours (la reprise en
plein milieu d'une manche pourra être ajoutée dans une prochaine version).

---
by twagirumukiza
