# Historique des versions - Butterfly Frontend

Toutes les versions notables de l'interface Butterfly, de la plus récente à la plus ancienne.

Le projet suit le versionnage sémantique. Une version majeure marque une rupture de
compatibilité, une mineure ajoute des capacités, un correctif répare sans rien ajouter.

Chaque version correspond à un tag Git annoté du même nom. Le titre de chaque section
renvoie vers la comparaison GitHub avec la version précédente, c'est-à-dire l'ensemble des
commits qu'elle apporte. La toute première version renvoie vers son tag n'ayant pas de prédécesseur.

---

## [v1.7.0](https://github.com/dalton0x0/butterfly-front/compare/v1.6.0...v1.7.0) - 2026-09-10

Listes navigables et alignement sur les contraintes du serveur. Les écrans d'utilisateurs,
d'apprenants et de corrections se parcourent page par page avec recherche et filtres traités
par le serveur : appliqués à la page reçue, ils n'auraient trouvé que ce qui était déjà affiché.
Un composable `usePagedList` porte l'état commun de ces listes et règle deux pièges que du code
dispersé laissait passer, le retour en première page sur changement de filtre et l'écrasement
d'une réponse récente par une plus lente. La saisie de recherche est temporisée et les barres
de recherche restent montées pendant le chargement, faute de quoi le champ perdrait le focus à
chaque frappe. Trois services demandaient des pages de 200 éléments alors que le serveur plafonne
à 100 et rabaisse sans le signaler : le plafond est désormais appliqué à la source avec un
avertissement en développement. La file de correction lit le nom de l'apprenant fourni par l'API
au lieu de télécharger la liste complète des comptes. Un refus de portée pédagogique affiche
un écran dédié plutôt qu'une erreur générique puisque réessayer n'y changerait rien. La longueur
maximale du mot de passe rejoint celle du serveur et le téléchargement de fichiers est unifié
dans un seul module avec libération différée de l'URL temporaire que certains navigateurs
interprétaient comme une annulation.

## [v1.6.0](https://github.com/dalton0x0/butterfly-front/compare/v1.5.0...v1.6.0) - 2026-09-07

Robustesse du démarrage et de la session. L'attente de premier niveau du point d'entrée
rendait le chunk partagé asynchrone et bloquait les vues chargées à la demande qui l'importent :
page blanche sur Chromium et Gecko, WebKit passant. Le montage repasse par une chaîne de promesse.
Polices rapatriées dans le bundle, l'application ne dépend plus d'un domaine externe pour
s'afficher correctement et fonctionne sans accès Internet. Indicateur de chargement affiché
pendant l'amorçage, l'écran n'est plus vide entre l'arrivée du HTML et le montage. Renouvellement
de jeton sérialisé entre onglets par `navigator.locks` : deux onglets qui renouvelaient ensemble
déclenchaient la détection de rejeu du backend et fermaient toutes les sessions. Destination
conservée à l'expiration de session. Échecs de chargement du profil désormais journalisés, le
repli sur le profil minimal était silencieux alors qu'il prive les écrans de `id` et de
`emailVerified`. Configuration nginx : compression du bundle rétablie quelle que soit la table
MIME de l'image, en-tête de cache posé une seule fois sur les assets, nom du backend réinterrogé
auprès du DNS de Docker au lieu d'être figé au démarrage.

## [v1.5.0](https://github.com/dalton0x0/butterfly-front/compare/v1.4.1...v1.5.0) - 2026-08-31

Suivi détaillé des apprenants. Nouveau panneau à trois onglets sur les fiches
apprenant du formateur et de l'administrateur avec l'historique complet des cours, des
exercices et des tentatives de quiz. Il complète l'activité récente qui ne montre que les
dernières entrées. Composant unique partagé par les deux vues plutôt qu'un gabarit recopié.
L'onglet exercices s'appuie sur l'endpoint de la file de correction qui restreint un
formateur aux exercices de ses propres blocs contrairement aux deux autres onglets.

## [v1.4.1](https://github.com/dalton0x0/butterfly-front/compare/v1.4.0...v1.4.1) - 2026-08-31

Correctifs d'accès et de messages d'erreur. Les pages de mot de passe oublié et de
nouveau mot de passe ne sont plus réservées aux visiteurs : le lien reçu par e-mail s'ouvre
aussi depuis une session déjà connectée comme celui de vérification d'adresse. Session locale
abandonnée après une réinitialisation réussie, le serveur ayant révoqué toutes les sessions.
Corps d'erreur du back désormais lu sur les réponses binaires : un téléchargement refusé affiche
sa vraie cause au lieu du message générique. Requêtes mises en attente pendant un renouvellement
raté rejetées avec la même forme d'erreur que les autres.

## [v1.4.0](https://github.com/dalton0x0/butterfly-front/compare/v1.3.1...v1.4.0) - 2026-08-31

Création de contenu et passation de quiz. Éditeur Markdown enrichi (barre de mise en
forme, raccourcis, continuation des listes, aperçu côte à côte, collage et glisser-déposer
d'images) sans nouvelle dépendance, la sanitation DOMPurify et le nettoyage des images orphelines
restant en place. Import des questions d'un quiz par fichier JSON, contrôlé avant application.
Fichiers joints aux énoncés d'exercices, côté formateur comme côté apprenant. Réglage du mélange
des questions et des réponses. Avertissement avant de quitter un quiz en cours. Correctifs :
puces et numéros des listes rétablis dans le rendu Markdown (le reset de Tailwind les retirait),
vue conservée dans l'éditeur après un bouton de mise en forme, retour d'action rendu visible par
un message flottant, confirmations natives remplacées par les modales du site.

## [v1.3.1](https://github.com/dalton0x0/butterfly-front/compare/v1.3.0...v1.3.1) - 2026-08-05

Correctifs de conteneurisation. Passage à la variante non privilégiée de nginx sur la
branche stable courante (1.30, la 1.27 ne recevant plus de correctifs de sécurité) : le serveur
tourne sans root et écoute sur le port 8080, revalidation forcée d'`index.html` pour éviter
qu'un navigateur ne serve une interface périmée après un redéploiement, en-têtes de sécurité
rétablis sur les assets (un bloc `location` déclarant son propre `add_header` n'hérite plus de
ceux du serveur), envois de fichiers transmis en flux au backend sans bufferisation disque, nom
et slogan de l'application surchargeables au build de l'image, chemins de Swagger réacheminés
vers le backend pour consulter la documentation de l'API à travers le point d'entrée unique.

## [v1.3.0](https://github.com/dalton0x0/butterfly-front/compare/v1.2.0...v1.3.0) - 2026-08-03

Parcours e-mail, accessibilité et conteneurisation. Trois écrans ajoutés (demande de
réinitialisation, définition d'un nouveau mot de passe, confirmation d'adresse) et un bandeau de
rappel tant que l'adresse n'est pas confirmée. Le code 403 renvoyé à la connexion est distingué et
propose un renvoi de lien. Correction d'un défaut de session : l'identifiant renvoyé à chaque
rotation n'était pas enregistré, ce qui faisait perdre la reconnaissance de l'appareil courant et
pouvait déconnecter l'utilisateur lors d'une déconnexion des autres appareils. La session à
préserver est désormais déduite du jeton côté serveur. Qualité : campagne SonarQube (erreurs
applicatives portées par une classe `ApiError`, paramètres de pagination déstructurés, `Set` pour
les recherches d'appartenance, `RegExp.exec`, chaînage optionnel, attributs HTML obsolètes retirés,
complexité cognitive réduite) et accessibilité de tous les champs de formulaire, tous associés à leur
étiquette. Déploiement : image Docker en deux étapes servie par nginx, cible de
compilation portée à `es2022`.

## [v1.2.0](https://github.com/dalton0x0/butterfly-front/compare/v1.1.0...v1.2.0) - 2026-07-23

Sécurité et gestion des sessions. Le rafraîchissement de jeton n'est plus déclenché sur
les endpoints d'authentification (un 401 y est une réponse définitive, et non un jeton expiré),
ce qui évite de rejouer un refresh token déjà révoqué. La page de connexion informe l'utilisateur
redirigé après invalidation de sa session, et le profil expose un écran des appareils connectés
permettant de révoquer une session ou de se déconnecter de tous les autres appareils.

## [v1.1.0](https://github.com/dalton0x0/butterfly-front/compare/v1.0.1...v1.1.0) - 2026-07-23

Passage à l'identité Butterfly (renommage de l'application, logo et favicon dédiés,
slogan de pied de page configurable), chargement optimisé de Highlight.js, simplification des
exports avec l'alias `@` pour les imports de configuration et suppression des utilitaires et
imports devenus inutiles.

## [v1.0.1](https://github.com/dalton0x0/butterfly-front/compare/v1.0.0...v1.0.1) - 2026-07-23

Alignement de la version du paquet npm sur celle du projet et corrections de
documentation. Aucune modification fonctionnelle : le contrat de pagination stabilisé côté
backend (v1.0.1) conserve exactement la structure JSON déjà consommée par `normalizePage`.

## [v1.0.0](https://github.com/dalton0x0/butterfly-front/releases/tag/v1.0.0) - 2026-07-23

Première version stable et complète alignée sur le backend v1.0.0. Couvre les trois
espaces (apprenant, formateur, administrateur), l'authentification avec rafraîchissement
transparent, la navigation guidée par les prérequis, l'évaluation par exercices et quiz, la
gamification et la gestion des médias.
