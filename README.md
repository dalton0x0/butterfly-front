# Butterfly - Frontend

Interface web de la plateforme de gestion de l'apprentissage (LMS) Butterfly. Application monopage
(SPA) développée en Vue 3 qui consomme l'API REST du backend et adapte l'expérience au rôle de
l'utilisateur connecté (apprenant, formateur, administrateur).

---

## Sommaire

- [Présentation](#présentation)
- [Pile technique](#pile-technique)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Authentification](#authentification)
- [Parcours e-mail](#parcours-e-mail)
- [Couche services](#couche-services)
- [Routage et espaces](#routage-et-espaces)
- [Design system](#design-system)
- [Accessibilité et qualité](#accessibilité-et-qualité)
- [Structure du projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Installation et configuration](#installation-et-configuration)
- [Lancement](#lancement)
- [Déploiement conteneurisé](#déploiement-conteneurisé)
- [Conventions](#conventions)
- [Historique des versions](#historique-des-versions)
- [Feuille de route](#feuille-de-route)

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

Les polices sont hébergées par l'application et livrées dans le bundle : Inter et Fira Code via
`@fontsource-variable`, les icônes via `material-symbols`. Elles étaient auparavant chargées
depuis Google Fonts. Les rapatrier supprime une dépendance externe au premier rendu, permet un
fonctionnement sur un réseau sans accès Internet et évite de transmettre l'adresse IP des
utilisateurs à un tiers. La palette « Cobalt sky » est définie dans `src/style.css`.

## Fonctionnalités

Communes :

- Inscription, connexion et session persistée avec rafraîchissement transparent du jeton.
- Confirmation de l'adresse e-mail avec rappel permanent tant qu'elle n'est pas faite.
- Réinitialisation du mot de passe par lien reçu par message.
- Consultation et édition du profil, dont l'avatar.
- Rendu Markdown sécurisé des contenus (assaini par DOMPurify), avec coloration syntaxique.
- Message de retour flottant après une action, visible quel que soit le défilement de la page.

Espace apprenant :

- Parcours des blocs et modules, avec signalement des modules verrouillés et de leurs prérequis.
- Suivi d'un cours et enregistrement de la progression.
- Passation de quiz interactifs (limite de temps par question), avec restitution du score et du
  corrigé.
- Avertissement avant de quitter un quiz en cours, la sortie étant enregistrée comme une tentative.
- Historique distinguant une tentative abandonnée d'un échec au barème.
- Soumission d'exercice (dépôt du contenu et des fichiers en une action), édition tant que la
  soumission est en attente.
- Téléchargement des fichiers joints à un énoncé d'exercices.
- Tableau de bord gamifié : expérience, badges et série d'activités.

Espace formateur :

- Gestion complète du contenu : blocs, modules, cours, exercices et quiz, avec prérequis et
  réordonnancement.
- Éditeur Markdown avec barre de mise en forme, raccourcis clavier, continuation automatique des
  listes et aperçu côte à côte. Images insérables par bouton, collage d'une capture ou
  glisser-déposer et contenu remplissable depuis un fichier `.md`.
- Import des questions d'un quiz depuis un fichier JSON avec contrôle avant application et modèle
  téléchargeable.
- Fichiers joints aux énoncés d'exercices, sélectionnables avant même le premier enregistrement.
- Mélange des questions et des réponses activable par quiz.
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
  Cette file ne protège que l'onglet courant : un verrou `navigator.locks` sérialise l'appel entre
  les onglets ouverts, faute de quoi deux onglets présenteraient le même jeton de rafraîchissement,
  le second serait vu comme un rejeu et le backend révoquerait toutes les sessions. Le jeton est
  relu après obtention du verrou, un verrou seul ne disant rien de ce qui s'est passé pendant
  l'attente.
- `services/tokenStorage.js` : persistance des jetons. Selon l'option « Se souvenir de moi », ils
  sont stockés dans le `localStorage` (la session survit à la fermeture du navigateur) ou dans le
  `sessionStorage`.
- `stores/auth.js` : store Pinia exposant l'utilisateur courant et des accesseurs dérivés
  (`isAuthenticated`, `role`, `isAdmin`, `isTeacher`, `fullName`). La session est restaurée au
  rechargement de la page à partir du jeton de rafraîchissement persisté.

Chaque rotation renvoie un nouvel identifiant de session enregistré au même titre que les jetons.
Sans cette mise à jour, l'écran des appareils connectés cesserait de reconnaître l'appareil courant
au bout de quelques minutes et une déconnexion des autres appareils fermerait la session en cours
au lieu de la préserver.

Depuis la version 1.3.0, la session à préserver n'est plus transmise par le client :
le serveur la déduit du jeton présenté, seule source qui ne puisse pas être périmée.

Les erreurs remontées par la couche HTTP sont des instances d'`ApiError`, une classe étendant
`Error`. Elles portent donc une pile d'appels exploitable fonctionnent avec `instanceof` et
s'affichent correctement dans la console, ce qu'un objet littéral ne permettait pas.

Quand la session est définitivement perdue, la redirection vers la connexion conserve la page en
cours dans le paramètre `redirect`, celui-là même que la garde de navigation utilise déjà. Une
reconnexion ramène donc l'utilisateur là où il travaillait plutôt que sur le tableau de bord.

## Parcours e-mail

Trois écrans complètent l'authentification, tous servis par `AuthLayout`.

| Route                   | Écran                | Rôle                                      |
|-------------------------|----------------------|-------------------------------------------|
| `/mot-de-passe-oublie`  | `ForgotPasswordView` | Saisie de l'adresse, confirmation neutre  |
| `/nouveau-mot-de-passe` | `ResetPasswordView`  | Saisie du nouveau mot de passe            |
| `/verification-email`   | `VerifyEmailView`    | Confirmation automatique, renvoi si échec |

Les chemins doivent correspondre aux valeurs configurées côté backend
(`butterfly.mail.verification-path` et `butterfly.mail.password-reset-path`) : ce sont eux qui
composent les liens envoyés par message. Toute modification se répercute des deux côtés.

### Points de conception

**`/verification-email` n'est pas réservée aux visiteurs anonymes** contrairement aux deux autres.
La politique de vérification étant souple côté serveur, un utilisateur est souvent connecté au moment
où il ouvre le lien reçu. L'écarter le renverrait au tableau de bord sans jamais confirmer son adresse.

**Le jeton est lu dans l'URL puis renvoyé dans le corps de la requête.** C'est ainsi que le lien le
transmet, mais une URL se retrouve dans les journaux du serveur, l'historique du navigateur et
l'en-tête `Referer` envoyé aux ressources externes de la page.

**Les confirmations sont affichées quelle que soit la réponse du serveur.** Ce dernier ne dit jamais
si un compte correspond à une adresse. Afficher un message différent selon le cas annulerait cette
précaution côté interface.

**Le code 403 renvoyé à la connexion est traité à part.** Il signale une adresse non vérifiée après
le délai de grâce : les identifiants sont corrects, c'est l'état du compte qui bloque. L'écran
affiche donc le message du serveur et un lien vers le renvoi de confirmation, plutôt que le message
d'identifiants invalides qui orienterait vers la mauvaise piste.

**Le bandeau de rappel vit dans le layout** et non dans une vue : il doit suivre l'utilisateur où
qu'il aille. Il peut être masqué pour la session en cours mais réapparaît au chargement suivant,
s'agissant d'un rappel et non d'une notification.

## Couche services

Chaque domaine fonctionnel a son service, qui encapsule les appels à l'API et la normalisation des
réponses (pagination, déballage d'enveloppe).

| Service             | Domaine                                                                                         |
|---------------------|-------------------------------------------------------------------------------------------------|
| `authService`       | Inscription, connexion, rafraîchissement, déconnexion, vérification d'adresse, réinitialisation |
| `userService`       | Utilisateurs (liste, détail, CRUD, rôle, statut, promotion, blocs)                              |
| `promotionService`  | Promotions (CRUD, activation, membres)                                                          |
| `blockService`      | Blocs pédagogiques                                                                              |
| `moduleService`     | Modules et prérequis                                                                            |
| `courseService`     | Cours                                                                                           |
| `exerciseService`   | Exercices et fichiers de soumission                                                             |
| `quizService`       | Quiz, passation et barème                                                                       |
| `progressService`   | Progression (cours, exercices, quiz, vues d'ensemble)                                           |
| `correctionService` | File de correction et historique côté formateur                                                 |
| `badgeService`      | Catalogue, progression, administration et recalcul des badges                                   |
| `dashboardService`  | Tableau de bord apprenant                                                                       |
| `profileService`    | Profil et mot de passe                                                                          |
| `mediaService`      | Médias (couvertures, avatars, images de contenu, vidéos)                                        |
| `http`              | Instance Axios et intercepteurs (transverse)                                                    |
| `tokenStorage`      | Persistance des jetons (transverse)                                                             |

## Routage et espaces

Le routage est protégé par des métadonnées sur chaque route : `requiresAuth` pour les pages
réservées aux utilisateurs connectés, et `roles` pour les pages réservées à certains rôles. Une
garde globale `router.beforeEach` redirige vers la connexion si l'utilisateur n'est pas authentifié
et bloque l'accès aux pages dont le rôle ne correspond pas.

Quatre routes restent publiques : la connexion, l'inscription, la demande de réinitialisation et la
définition d'un nouveau mot de passe. La confirmation d'adresse est accessible dans les deux états,
connecté ou non.

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

Un indicateur de chargement est écrit en CSS directement dans le `<head>` de `index.html` et son
balisage à l'intérieur de `<div id="app">`. Une application à page unique ne peut rien peindre
avant le montage de Vue : le serveur ne renvoie qu'un conteneur vide. L'indicateur remplit cet
intervalle. Il n'a pas besoin d'être retiré puisque Vue remplace le contenu de son élément racine
au montage, ce qui écarte toute désynchronisation entre montage et nettoyage.

## Accessibilité et qualité

### Étiquettes de formulaire

Tous les champs de l'application sont associés à une étiquette par `for` et `id`, selon la convention
`<écran>-<champ>` en minuscules avec tirets : `login-email`, `profile-first-name`,
`quiz-question-0-option-1`. Le préfixe par écran garantit l'unicité dans le document, un identifiant
HTML étant unique pour toute la page et non par composant.

Trois situations ont demandé un traitement particulier :

- **champs sans étiquette visible** (recherches, filtres) : `<label class="sr-only">` plutôt
  qu'`aria-label`, afin que le texte reste présent dans le DOM et donc relisible ;
- **champs produits en boucle** (options de quiz, cases à cocher de prérequis) : identifiants dérivés
  de l'index ou de la clé métier, comme pour les attributs `:key` ;
- **composant réutilisable** (`MarkdownEditor`) : identifiant fourni par le parent, ou généré par
  `useId()` à défaut, ce qui autorise plusieurs instances sur une même page.

### Analyse statique

Les signalements SonarQube ont été traités par lots :

- **sous-titres des vidéos** : les vidéos sont téléversées par les formateurs et le modèle ne prévoit
  aucun fichier associé. Ajouter une balise `track` vide ferait disparaître le signalement sans
  rendre la moindre vidéo accessible,
- **await de premier niveau dans une vue** : la suggestion transformerait le composant en composant
  asynchrone qui exigerait alors un `<Suspense>` parent pour être monté. La correction retenue est
  `onMounted` qui satisfait la règle sans casser l'écran,
- **await de premier niveau dans le point d'entrée** : la règle inverse qui pousse à remplacer une
  chaîne de promesse par une attente directe. L'appliquer ici rend le chunk d'entrée asynchrone et
  provoque un interblocage avec les vues chargées à la demande (voir « Cible de compilation »). Le
  signalement est neutralisé par un `NOSONAR` accompagné du motif, jamais seul,
- **groupement sémantique des listes d'options** : écart relevé en revue et non signalé par l'outil,
  reporté avec la refonte des composants de formulaire.

Un signalement d'analyse statique décrit un symptôme avec justesse et propose un remède avec
approximation : il voit le motif syntaxique, pas le contexte d'exécution. Comprendre la raison de la
règle, puis choisir le remède adapté, vaut mieux que l'appliquer mécaniquement.

### Cible de compilation

`build.target` est fixé à `es2022` dans `vite.config.js`. Conséquence assumée : les navigateurs
antérieurs à Chrome 89, Firefox 89, Safari 15 et Edge 89, tous sortis en 2021 ne sont plus pris
en charge.

Ce réglage venait à l'origine d'une attente de premier niveau dans le point d'entrée, non
transpilable. Elle a été retirée en 1.6.0 : elle rendait le chunk d'entrée asynchrone, or les vues
chargées à la demande l'importent et ne pouvaient donc pas terminer leur évaluation tant qu'il
restait suspendu. Le routeur attendant lui-même la résolution de ces vues, les trois s'attendaient
mutuellement et l'application ne se montait jamais. Chromium et Gecko bloquaient, WebKit passait.
La cible reste à `es2022` sans plus dépendre de ce cas.

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

À la racine : `Dockerfile` et `nginx.conf` pour l'image de production.

## Prérequis

- Node.js 20 ou supérieur (l'image de production utilise Node 22)
- npm
- Le backend Butterfly démarré et accessible

## Installation et configuration

```bash
npm install
```

L'URL de l'API est configurable via une variable d'environnement Vite. Créer un fichier `.env` (ou
`.env.local`) à la racine pour surcharger la valeur par défaut :

```dotenv
# URL de base de l'API (suffixe /api obligatoire)
VITE_API_URL=http://localhost:8080/api

# Nom affiché de l'application
VITE_APP_NAME=Butterfly

# Slogan de pied de page, le caractère | servant de séparateur de ligne
VITE_APP_TAGLINE=
```

Ces variables sont lues à la construction et non à l'exécution : un changement impose de relancer le
serveur de développement ou de reconstruire l'image.

## Lancement

```bash
npm run dev      # serveur de développement (par défaut http://localhost:5173)
npm run build    # build de production dans dist/
npm run preview  # prévisualiser le build de production
```

Au lancement, l'application restaure automatiquement la session si un jeton de rafraîchissement
valide est présent, sinon elle redirige vers la page de connexion.

## Déploiement conteneurisé

Le `Dockerfile` construit l'image en deux étapes : Vite produit les fichiers statiques puis seuls
ces fichiers et nginx sont conservés. Node n'apparaît pas dans l'image finale. Une construction Vite
ne produisant rien qui ne doive être exécuté.

L'image est construite avec `VITE_API_URL=/api`, soit une adresse relative. Nginx réachemine `/api/`
vers le backend par le réseau interne. Trois bénéfices : une seule origine donc aucune question de
CORS, un seul port ouvert et une image indépendante du serveur sur lequel elle tourne.

Le nom et le slogan de l'application sont surchargeables au build, le `.env` local n'entrant pas
dans le contexte Docker :

```bash
docker build --build-arg VITE_APP_NAME=Butterfly --build-arg "VITE_APP_TAGLINE=Apprendre|Évoluer" .
```

L'image d'exécution est la variante non privilégiée de nginx, maintenue par l'équipe nginx :
le processus tourne sous un utilisateur sans droits et écoute sur le port 8080, un processus
non root ne pouvant se lier aux ports inférieurs à 1024. La correspondance vers le port 80
est faite par l'orchestration.

`nginx.conf` traite trois points qui, omis cassent le déploiement :

- **réécriture des routes** : toute adresse inconnue renvoie `index.html`, à charge pour Vue Router
  de résoudre la navigation. Sans cette règle, un rechargement sur `/profil` produit une erreur 404,
- **en-tête `X-Forwarded-For`** : sans lui, la limitation de débit du backend verrait toutes les
  requêtes venir de nginx et leur appliquerait un unique quota bloquant tous les utilisateurs,
- **taille de corps de requête** portée à 210 Mo, les vidéos pouvant atteindre 200 Mo côté applicatif
  alors que nginx rejette par défaut au-delà de 1 Mo.

Nginx réachemine aussi les chemins de Swagger (`/swagger-ui.html`, `/swagger-ui/`, `/v3/api-docs`),
que le profil docker du backend active : la documentation de l'API reste consultable à travers le
point d'entrée unique, sans port supplémentaire ouvert.

L'orchestration complète vit dans un dépôt de déploiement distinct, backend et frontend étant
versionnés séparément.

## Conventions

- Composants en Composition API avec `<script setup>`.
- Identifiants de code en anglais, commentaires et textes utilisateur en français (UTF-8 avec
  accents).
- Les vues passent toujours par un service pour parler à l'API, jamais par Axios directement.
- Les couleurs passent exclusivement par les tokens de thème.
- Commits au format Conventional Commits en anglais, atomiques.
- Versionnage sémantique (SemVer) et tags Git annotés.

### Tags Git

Un tag annoté par version publiée, nommé `vMAJEUR.MINEUR.CORRECTIF`.

Le message suit toujours la même forme en anglais comme les commits :

```text
Titre court sans point final

- premier changement notable
- deuxième changement notable
- troisième changement notable
```

Trois à cinq puces sans point final. Le tag doit se lire en trois secondes depuis
`git tag -n99` : le détail vit dans [CHANGELOG.md](CHANGELOG.md) qui reste la référence.

Toujours créer le tag avec `-a` et `-m`. Sans `-m`, Git reprend le message du commit
désigné, ce qui produit un tag annonçant `chore(release): bump version` au lieu du
contenu de la version.

## Historique des versions

Version courante : **v1.8.0**.

L'historique complet des versions avec le détail de chaque livraison est dans [CHANGELOG.md](CHANGELOG.md).

## Feuille de route

Prévu pour la suite du projet :

- **tests de composants** (Vitest et Testing Library). Le défaut de bandeau invisible corrigé en
  1.3.0 dû à un champ absent d'une fonction de correspondance aurait été détecté immédiatement,
- **ESLint et `eslint-plugin-vue`** dans le projet, afin de relever localement l'essentiel de ce que
  SonarQube signale après coup,
- **composants de formulaire réutilisables**, portant l'association étiquette-champ et le groupement
  sémantique par `fieldset` une fois pour toutes,
- **titre de page par route**, complément d'accessibilité aujourd'hui absent,
- **sous-titres des vidéos**, dès que le modèle backend acceptera un fichier associé,
- **internationalisation**, si l'ouverture à d'autres langues est retenue.

---

<p align="center">
  Made with ❤️ by Chéridanh TSIELA
</p>
