

# Projet - SUMOT

## Description

SUMOT est une application basée sur l'architecture microservices. C'est un jeu reprenant le jeu du MOTUS où l'objectif est de trouver un mot en un minimum de coups.

## Installation

Tous les microservices sont des images docker. Pour les installer, il suffit de lancer la commande suivante :

```bash
docker build -t <nom_image> <chemin_dockerfile>
```

(En fin de projet les iamges seront disponibles sur le dockerhub).

Le projet est basé sur un docker-compose. Pour lancer le projet, il suffit de lancer la commande suivante :

```bash
docker-compose up
```

## Score Management

- On utilise un serveur Node.js pour gérer les scores. Avec une api basée sur express.js. La base de donnée utilisée est Redis.
- Le port utilisé est le 3002.
- Le serveur propose deux entrées :
  - /getscore : pour récupérer le score
  - /setscore : pour modifier le score
  - La forme du retour est du JSON et est de la forme suivante :
    ```json
    {
      "gameWon": 0,
      "attempts": 0
    }
    ```
- Pour l'instant nous ne pouvons gérer qu'un seul utilisateur.
