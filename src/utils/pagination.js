/*
  Aide à la pagination.

  Le back renvoie des listes au format Page de Spring Data enveloppé dans ApiResponse.
  Après déballage par http.js, la charge utile (envelope.data) est l'objet Page lui-même :

    {
      content: [...], // les éléments de la page courante
      totalElements: 42, // nombre total d'éléments
      totalPages: 3, // nombre total de pages
      number: 0, // index de la page courante (commence à 0)
      size: 20, // taille de page
      first: true,
      last: false
    }

  normalizePage renvoie une forme stable et lisible pour l'UI, et protège contre
  les réponses partielles.
*/

export function normalizePage(page) {
    return {
        items: page?.content ?? [],
        totalElements: page?.totalElements ?? 0,
        totalPages: page?.totalPages ?? 0,
        page: page?.number ?? 0,
        size: page?.size ?? 0,
        isFirst: page?.first ?? true,
        isLast: page?.last ?? true
    }
}

/*
  Nombre maximum d'éléments qu'une page peut contenir.

  Cette valeur reflète PAGE_MAX_SIZE côté serveur (spring.data.web.pageable.max-page-size).
  Spring rabaisse toute demande supérieure sans erreur ni en-tête : une liste tronquée
  ressemble alors à une liste complète. Le plafond est donc appliqué ici à la source
  avec un avertissement pour que le décalage se voie pendant le développement plutôt
  qu'en production.

  À faire évoluer en même temps que PAGE_MAX_SIZE côté déploiement.
*/
export const MAX_PAGE_SIZE = 100

/*
  Taille de page par défaut des listes navigables.

  Elle valait 100, c'est-à-dire le plafond, parce qu'aucun écran ne savait changer de
  page : demander le maximum était la seule façon d'afficher beaucoup de lignes. Avec la
  navigation, une page courte se charge plus vite et se lit mieux.
*/
export const DEFAULT_PAGE_SIZE = 20

/*
  Construit les paramètres d'URL de pagination attendus par Spring.
  Exemple : buildPageParams({ page: 0, size: 20, sort: 'name,asc' }).
  Rappel : l'index de page commence à 0 côté back.
*/
export function buildPageParams({page = 0, size = 20, sort} = {}) {
    let effectiveSize = size
    if (size > MAX_PAGE_SIZE) {
        console.warn(
            `[pagination] taille demandée ${size} au dessus du plafond serveur, ramenée à ${MAX_PAGE_SIZE}`
        )
        effectiveSize = MAX_PAGE_SIZE
    }

    const params = {page, size: effectiveSize}
    if (sort) {
        params.sort = sort
    }
    return params
}
