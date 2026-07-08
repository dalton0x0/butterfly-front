# InfraDev - Frontend

Interface web de la plateforme de gestion de l'apprentissage (LMS) InfraDev. Application monopage
(SPA) développée en Vue 3 qui consomme l'API REST du backend et adapte l'expérience au rôle de
l'utilisateur connecté (apprenant, formateur, administrateur).

Version : 1.0.1

---

## Sommaire

- [Présentation](#présentation)
- [Pile technique](#pile-technique)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Authentification](#authentification)
- [Couche services](#couche-services)
- [Routage et espaces](#routage-et-espaces)
- [Design system](#design-system)
- [Structure du projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Installation et configuration](#installation-et-configuration)
- [Lancement](#lancement)
- [Conventions](#conventions)
- [Historique des versions](#historique-des-versions)

## Présentation

Le frontend expose trois espaces selon le rôle de l'utilisateur authentifié :

- Apprenant : tableau de bord, blocs et modules de son parcours (avec indicateurs de verrouillage),
  cours, exercices à rendre, quiz, badges et profil.
- Formateur : gestion du contenu pédagogique, correction des exercices et suivi des apprenants de
  son périmètre.
- Administrateur : tableau de bord global, gestion des utilisateurs, des promotions, des contenus et
  du catalogue de badges.

L'interface et les accès découlent du compte réellement authentifié : le rôle est déterminé côté
serveur, jamais présumé côté client.

## Pile technique

| Composant             | Version | Rôle                                          |
|-----------------------|---------|-----------------------------------------------|
| Vue                   | 3.5     | Framework (Composition API, `<script setup>`) |
| Vue Router            | 4.5     | Routage et gardes de navigation               |
| Pinia                 | 2.3     | Gestion d'état (session, rôle)                |
| Axios                 | 1.7     | Client HTTP et intercepteurs                  |
| Tailwind CSS          | 4.0     | Styles utilitaires (via `@tailwindcss/vite`)  |
| Vite                  | 6.0     | Bundler et serveur de développement           |
| marked + highlight.js | 18 / 11 | Rendu Markdown des contenus de cours          |
| DOMPurify             | 3.4     | Assainissement du HTML rendu (anti-XSS)       |

Les icônes (Material Symbols Outlined) et la police Inter sont chargées côté page. La palette
« Cobalt sky » est définie dans `src/style.css`.

## Fonctionnalités

Communes :

- Inscription, connexion et session persistée avec rafraîchissement transparent du jeton.
- Consultation et édition du profil, dont l'avatar.
- Rendu Markdown sécurisé des contenus (assaini par DOMPurify), avec coloration syntaxique.

Espace apprenant :

- Parcours des blocs et modules, avec signalement des modules verrouillés et de leurs prérequis.
- Suivi d'un cours et enregistrement de la progression.
- Passation de quiz interactifs (limite de temps par question), avec restitution du score et du
  corrigé.
- Soumission d'exercice (dépôt du contenu et des fichiers en une action), édition tant que la
  soumission est en attente.
- Tableau de bord gamifié : expérience, badges et série d'activités.

Espace formateur :

- Gestion complète du contenu : blocs, modules, cours, exercices et quiz, avec prérequis et
  réordonnancement.
- Téléversement de médias (images de couverture, images de contenu, vidéos).
- File de correction : validation ou rejet des soumissions avec note et retour.
- Suivi des apprenants de son périmètre.

Espace administrateur :

- Tableau de bord global.
- Gestion des utilisateurs (comptes, rôles, statut, promotion) et des promotions.
- Gestion du catalogue de badges.

## Architecture

L'application applique une séparation nette des responsabilités. Une vue appelle un service métier,
qui passe par l'instance Axios (`http`), qui parle à l'API. La session et le rôle sont centralisés
dans un store Pinia, et le routeur applique les gardes par rôle.

```
Vue (composant) -> Service (par domaine) -> http (Axios + intercepteurs) -> API
        |                                          |
     Store Pinia (session, rôle) <-----------------+
        |
     Router (gardes par rôle)
```

- `views/` : une vue par page, regroupées par espace (apprenant, formateur, administrateur).
- `components/` : composants réutilisables et sans logique métier (avatar, modale, chips, barres et
  anneaux de progression, éditeur et rendu Markdown, etc.).
- `services/` : un module par domaine fonctionnel, seul point de contact avec l'API. Les vues
  n'appellent jamais Axios directement.
- `stores/` : état applicatif partagé via Pinia (essentiellement la session et le rôle).
- `router/` : définition des routes et gardes de navigation.
- `utils/` : fonctions pures transverses (pagination, médias, validations, Markdown, icônes de
  badge, dates, rôles, upload).
- `layouts/` : `DefaultLayout` (navbar, contenu, footer) et `AuthLayout` (carte centrée pour la
  connexion et l'inscription).

## Authentification

L'authentification repose sur les jetons émis par le backend : un jeton d'accès de courte durée et
un jeton de rafraîchissement de longue durée, avec rotation à chaque renouvellement.

- `services/http.js` : instance Axios centrale. Un intercepteur de requête ajoute l'en-tête
  d'autorisation. Un intercepteur de réponse déballe l'enveloppe `ApiResponse` du backend et sur un
  code 401, tente un rafraîchissement puis rejoue la requête d'origine. Si plusieurs requêtes
  échouent en même temps, un seul rafraîchissement est lancé : les autres patientent dans une file
  d'attente puis sont rejouées avec le nouveau jeton, ce qui évite les rafraîchissements concurrents.
- `services/tokenStorage.js` : persistance des jetons. Selon l'option « Se souvenir de moi », ils
  sont stockés dans le `localStorage` (la session survit à la fermeture du navigateur) ou dans le
  `sessionStorage`.
- `stores/auth.js` : store Pinia exposant l'utilisateur courant et des accesseurs dérivés
  (`isAuthenticated`, `role`, `isAdmin`, `isTeacher`, `fullName`). La session est restaurée au
  rechargement de la page à partir du jeton de rafraîchissement persisté.

## Couche services

Chaque domaine fonctionnel a son service, qui encapsule les appels à l'API et la normalisation des
réponses (pagination, déballage d'enveloppe).

| Service             | Domaine                                                            |
|---------------------|--------------------------------------------------------------------|
| `authService`       | Inscription, connexion, rafraîchissement, déconnexion              |
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
| `mediaService`      | Médias (couvertures, avatars, images de contenu, vidéos)           |
| `http`              | Instance Axios et intercepteurs (transverse)                       |
| `tokenStorage`      | Persistance des jetons (transverse)                                |

## Routage et espaces

Le routage est protégé par des métadonnées sur chaque route : `requiresAuth` pour les pages
réservées aux utilisateurs connectés, et `roles` pour les pages réservées à certains rôles. Une
garde globale `router.beforeEach` redirige vers la connexion si l'utilisateur n'est pas authentifié
et bloque l'accès aux pages dont le rôle ne correspond pas.

Les trois espaces :

- Apprenant (racine `/`) : `/`, `/blocs`, `/modules/:id`, `/cours/:id`, `/exercices`, `/quiz`,
  `/badges`, `/profil`.
- Formateur (`/formateur/...`) : gestion de contenu (`/formateur/contenus` et ses sous-écrans),
  apprenants (`/formateur/apprenants` et le détail), corrections.
- Administrateur (`/admin/...`) : tableau de bord (`/admin`), utilisateurs, promotions, badges. La
  gestion de contenu est accessible à l'administrateur via l'alias `/admin/contenus`.

## Design system

Toutes les couleurs sont définies une seule fois dans `src/style.css` via le bloc `@theme` de
Tailwind v4. Les composants réutilisables s'appuient exclusivement sur ces tokens pour garantir la
cohérence visuelle entre les trois espaces.

| Token        | Valeur  | Usage                     |
|--------------|---------|---------------------------|
| primary      | #0047AB | boutons, liens, barres    |
| primary-dark | #00327D | navbar, footer            |
| navy         | #000080 | titres                    |
| accent       | #82C8E5 | fonds teintés, état actif |
| background   | #F7F9FF | fond de page              |
| surface      | #FFFFFF | cartes                    |

## Structure du projet

```
src/
|-- assets/
|-- components/       Composants réutilisables (présentation, sans logique métier)
|-- layouts/          DefaultLayout (navbar, footer) et AuthLayout (connexion, inscription)
|-- router/
|   |-- index.js      Routes et gardes de navigation par rôle
|-- services/         Un module par domaine, plus http.js et tokenStorage.js
|-- stores/
|   |-- auth.js       Session et rôle (Pinia)
|-- utils/            Fonctions pures (pagination, médias, validations, Markdown, icônes, dates)
|-- views/            Une vue par page, regroupées par espace
|-- style.css         Design tokens « Cobalt sky »
|-- App.vue           Choix du layout selon la route
|-- main.js           Point d'entrée
```

## Prérequis

- Node.js 18 ou supérieur
- npm
- Le backend InfraDev démarré et accessible

## Installation et configuration

```bash
npm install
```

L'URL de l'API est configurable via une variable d'environnement Vite. Créer un fichier `.env` (ou
`.env.local`) à la racine pour surcharger la valeur par défaut :

```dotenv
# URL de base de l'API
VITE_API_URL=http://localhost:8080/api
```

## Lancement

```bash
npm run dev      # serveur de développement (par défaut http://localhost:5173)
npm run build    # build de production dans dist/
npm run preview  # prévisualiser le build de production
```

Au lancement, l'application restaure automatiquement la session si un jeton de rafraîchissement
valide est présent, sinon elle redirige vers la page de connexion.

## Conventions

- Composants en Composition API avec `<script setup>`.
- Identifiants de code en anglais, commentaires et textes utilisateur en français (UTF-8 avec
  accents).
- Les vues passent toujours par un service pour parler à l'API, jamais par Axios directement.
- Les couleurs passent exclusivement par les tokens de thème.
  - Commits au format Conventional Commits en français.

## Historique des versions

- v1.0.1 : alignement de la version du paquet npm sur celle du projet et corrections de
  documentation. Aucune modification fonctionnelle : le contrat de pagination stabilisé côté
  backend (v1.0.1) conserve exactement la structure JSON déjà consommée par `normalizePage`.
- v1.0.0 : première version stable et complète alignée sur le backend v1.0.0. Couvre les trois
  espaces (apprenant, formateur, administrateur), l'authentification avec rafraîchissement
  transparent, la navigation guidée par les prérequis, l'évaluation par exercices et quiz, la
  gamification et la gestion des médias.

---

<p align="center">
  Made with ❤️ by Chéridanh TSIELA
</p>
