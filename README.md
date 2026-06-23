# InfraDev LMS - Frontend

> Interface web de la plateforme d'apprentissage InfraDev (LMS).

Application monopage (SPA) développée en Vue 3 consommant l'API REST Spring Boot du projet InfraDev.
Elle couvre trois espaces selon le rôle de l'utilisateur connecté (apprenant, formateur, administrateur) avec
authentification JWT, navigation protégée par rôle et une couche de services par domaine.

---

## Sommaire

- [Présentation](#présentation)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation et configuration](#installation-et-configuration)
- [Démarrage](#démarrage)
- [Architecture](#architecture)
- [Authentification](#authentification)
- [Couche services](#couche-services)
- [Routage et espaces](#routage-et-espaces)
- [Design system](#design-system)
- [Structure du projet](#structure-du-projet)
- [Auteur](#auteur)
- [Licence](#licence)

---

## Présentation

Ce dépôt contient le frontend d'InfraDev.

L'interface s'adapte au rôle :

- **Apprenant** : tableau de bord, blocs et modules de son parcours, cours, exercices à rendre, quiz, badges et profil.
- **Formateur** : gestion du contenu pédagogique, correction des exercices et suivi des apprenants de son périmètre.
- **Administrateur** : tableau de bord global, gestion des utilisateurs, des promotions, des contenus et du catalogue de badges.

---

## Stack technique

| Composant             | Version | Rôle                                          |
|-----------------------|---------|-----------------------------------------------|
| Vue                   | 3.5     | Framework (Composition API, `<script setup>`) |
| Vue Router            | 4.5     | Routage et garde de navigation                |
| Pinia                 | 2.3     | Gestion d'état (session, rôle)                |
| Axios                 | 1.7     | Client HTTP et intercepteurs                  |
| Tailwind CSS          | 4.0     | Styles utilitaires (via `@tailwindcss/vite`)  |
| Vite                  | 6.0     | Bundler et serveur de développement           |
| marked + highlight.js | 18 / 11 | Rendu Markdown des contenus de cours          |
| DOMPurify             | 3.4     | Assainissement du HTML rendu (anti-XSS)       |

Material Symbols Outlined (icônes) et la police Inter sont chargés côté page.
La palette "Cobalt sky" est définie dans `src/style.css`.

---

## Prérequis

- **Node.js 18 ou supérieur**
- **npm**
- Le **backend InfraDev**

---

## Installation et configuration

```bash
# Installer les dépendances
npm install
```

L'URL de l'API est configurable via une variable d'environnement Vite. Créez un fichier `.env` (ou `.env.local`) à la racine si vous souhaitez surcharger la valeur par défaut :

```dotenv
# URL de base de l'API
VITE_API_URL=
```

---

## Démarrage

```bash
npm run dev # serveur de développement (par défaut http://localhost:5173)
npm run build # build de production dans dist/
npm run preview # prévisualiser le build de production
```

Au lancement, l'application restaure automatiquement la session si un refresh token valide est présent
puis redirige vers la page de connexion sinon.

---

## Architecture

L'application suit une séparation des responsabilités :

```
Vue (composant) -> Service (par domaine) -> http (Axios + intercepteurs) -> API
        |                                          |
     Store Pinia (session, rôle) <-----------------+
        |
     Router (gardes par rôle)
```

- **`views/`** : une vue par page, regroupées par espace (apprenant, formateur, admin).
- **`components/`** : composants réutilisables et sans logique métier (avatar, modale, chips, barres de progression, etc.).
- **`services/`** : un module par domaine fonctionnel, seul point de contact avec l'API. Les vues n'appellent jamais Axios directement.
- **`stores/`** : état applicatif partagé via Pinia (essentiellement la session et le rôle).
- **`router/`** : définition des routes et gardes de navigation.
- **`utils/`** : fonctions pures transverses (pagination, médias, validations, Markdown, icônes de badge).
- **`layouts/`** : `DefaultLayout` (navbar + contenu + footer) et `AuthLayout` (carte centrée pour connexion et inscription).

---

## Authentification

L'authentification repose sur les jetons JWT émis par le backend
(access token court, refresh token long, avec rotation du refresh à chaque renouvellement).

- **`services/http.js`** : instance Axios centrale. Un intercepteur de requête ajoute l'en-tête `Authorization: Bearer <accessToken>`. Un intercepteur de réponse déballe l'enveloppe `ApiResponse` du backend et sur une réponse `401` tente un refresh puis rejoue la requête d'origine. Si plusieurs requêtes échouent simultanément, un seul refresh est lancé : les autres patientent dans une file d'attente puis sont rejouées avec le nouveau jeton (évite les refresh concurrents).
- **`services/tokenStorage.js`** : persistance des jetons. Selon l'option "Se souvenir de moi", ils sont stockés dans le `localStorage` (la session survit à la fermeture du navigateur) ou dans le `sessionStorage`.
- **`stores/auth.js`** : store Pinia exposant l'utilisateur courant et des accesseurs dérivés (`isAuthenticated`, `role`, `isAdmin`, `isTeacher`, `fullName`). La session est restaurée au rechargement de la page à partir du refresh token persisté.

Le rôle affiché et les accès découlent donc du compte réellement authentifié.

---

## Couche services

Chaque domaine fonctionnel a son service, qui encapsule les appels à l'API et la normalisation des réponses (pagination, déballage d'enveloppe) :

| Service             | Domaine                                                            |
|---------------------|--------------------------------------------------------------------|
| `authService`       | Inscription, connexion, refresh, déconnexion                       |
| `userService`       | Utilisateurs (liste, détail, CRUD, rôle, statut, promotion, blocs) |
| `promotionService`  | Promotions (CRUD, activation, membres)                             |
| `blockService`      | Blocs pédagogiques                                                 |
| `moduleService`     | Modules et prérequis                                               |
| `courseService`     | Cours                                                              |
| `exerciseService`   | Exercices et fichiers de soumission                                |
| `quizService`       | Quiz, passation et barème                                          |
| `progressService`   | Progression (cours, exercices, quiz, vues d'ensemble)              |
| `correctionService` | File de correction et historique côté formateur                    |
| `badgeService`      | Catalogue, progression, administration et recalcul des badges      |
| `dashboardService`  | Tableau de bord apprenant                                          |
| `profileService`    | Profil et mot de passe                                             |
| `mediaService`      | Médias (couvertures, avatars)                                      |
| `http`              | Instance Axios + intercepteurs (transverse)                        |
| `tokenStorage`      | Persistance des jetons (transverse)                                |

---

## Routage et espaces

Le routage est protégé par des métadonnées sur chaque route :

- `requiresAuth: true` : page réservée aux utilisateurs connectés.
- `roles: ['ADMIN', 'TEACHER']` : page réservée à certains rôles.

Une garde globale `router.beforeEach` redirige vers la connexion si l'utilisateur n'est pas authentifié et
bloque l'accès aux pages dont le rôle ne correspond pas.

Les trois espaces :

- **Apprenant** (racine `/`) : `/`, `/blocs`, `/modules/:id`, `/cours/:id`, `/exercices`, `/quiz`, `/badges`, `/profil`...
- **Formateur** (`/formateur/...`) : gestion de contenu (`/formateur/contenus` et ses sous-écrans), apprenants (`/formateur/apprenants` et le détail `/:id`), corrections.
- **Administrateur** (`/admin/...`) : tableau de bord (`/admin`), utilisateurs (`/admin/utilisateurs`, détail et création), promotions (`/admin/promotions`), badges (`/admin/badges`). La gestion de contenu est accessible aux administrateurs via l'alias `/admin/contenus` qui pointe vers l'écran de contenu existant.

---

## Design system

Toutes les couleurs sont définies une seule fois dans `src/style.css` via le bloc `@theme` de Tailwind v4.

| Token        | Valeur  | Usage                     |
|--------------|---------|---------------------------|
| primary      | #0047AB | boutons, liens, barres    |
| primary-dark | #00327D | navbar, footer            |
| navy         | #000080 | titres                    |
| accent       | #82C8E5 | fonds teintés, état actif |
| background   | #F7F9FF | fond de page              |
| surface      | #FFFFFF | cartes                    |

Les composants réutilisables s'appuient exclusivement sur ces tokens pour
garantir la cohérence visuelle entre les trois espaces.

---

## Structure du projet

```
src/
|-- assets/
|-- components/         # Composants réutilisables (présentation, sans logique métier)
|-- layouts/            # DefaultLayout (navbar + footer) et AuthLayout (connexion/inscription)
|-- router/
|   |-- index.js        # Routes et garde de navigation par rôle
|-- services/           # Un module par domaine + http.js et tokenStorage.js
|-- stores/
|   |-- auth.js         # Session et rôle (Pinia)
|-- utils/              # Fonctions pures (pagination, médias, validations, Markdown, icônes)
|-- views/              # Une vue par page, regroupées par espace
|-- style.css           # Design tokens "Cobalt sky"
|-- App.vue             # Choix du layout selon la route
|-- main.js             # Point d'entrée
```

---

## Auteur

**Chéridanh**

- GitHub : [github.com/dalton0x0](https://github.com/dalton0x0)
- Portfolio : [cheridanh.fr](https://cheridanh.fr)

Projet développé dans le cadre du cursus Master 1 en développement Java / Full-Stack.

---

## Licence

Projet académique. Tous droits réservés.

Pour toute demande relative à l'utilisation, la modification ou la redistribution du code, contacter l'auteur.
