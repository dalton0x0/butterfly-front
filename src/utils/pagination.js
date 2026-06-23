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
  Construit les paramètres d'URL de pagination attendus par Spring.
  Exemple : buildPageParams({ page: 0, size: 20, sort: 'name,asc' }).
  Rappel : l'index de page commence à 0 côté back.
*/
export function buildPageParams({page = 0, size = 20, sort} = {}) {
    const params = {page, size}
    if (sort) {
        params.sort = sort
    }
    return params
}
