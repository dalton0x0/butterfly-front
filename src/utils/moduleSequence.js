/*
  Ordre de lecture du contenu d'un module.

  Le back renvoie les cours et les exercices dans deux listes séparées. Leur ordre
  commun est porté par le champ position, partagé entre les deux. Le quiz n'a pas
  de position : il ferme toujours la séquence.

  Cette règle sert à deux écrans : la liste "Tous" du module et la navigation
  précédent / suivant en bas d'un cours ou d'un exercice. Elle est écrite ici une
  seule fois pour que les deux affichent toujours le même ordre.
*/

export const CONTENT_TYPES = Object.freeze({
    COURSE: 'course',
    EXERCISE: 'exercise',
    QUIZ: 'quiz'
})

const ROUTE_PREFIX = {
    [CONTENT_TYPES.COURSE]: '/cours/',
    [CONTENT_TYPES.EXERCISE]: '/exercices/',
    [CONTENT_TYPES.QUIZ]: '/quiz/'
}

const KIND_LABEL = {
    [CONTENT_TYPES.COURSE]: 'Cours',
    [CONTENT_TYPES.EXERCISE]: 'Exercice',
    [CONTENT_TYPES.QUIZ]: 'Quiz'
}

/**
 * Construit la séquence ordonnée d'un module : cours et exercices triés par
 * position, puis le quiz s'il existe.
 *
 * Chaque élément garde ses champs d'origine et reçoit un champ _type.
 *
 * @param {object|null} module le ModuleResponse renvoyé par GET /modules/{id}
 * @returns {Array<object>} la séquence, vide si le module est absent
 */
export function buildModuleSequence(module) {
    if (!module) {
        return []
    }

    // Array.prototype.sort est stable : à position égale, les cours restent avant
    // les exercices, comme l'affichait déjà l'onglet "Tous".
    const items = [
        ...(module.courses || []).map((c) => ({...c, _type: CONTENT_TYPES.COURSE})),
        ...(module.exercises || []).map((e) => ({...e, _type: CONTENT_TYPES.EXERCISE}))
    ].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    if (module.quiz) {
        items.push({...module.quiz, _type: CONTENT_TYPES.QUIZ})
    }
    return items
}

/**
 * Retrouve les voisins d'un élément dans la séquence.
 *
 * @param {Array<object>} sequence la séquence produite par buildModuleSequence
 * @param {string} type le type de l'élément courant (CONTENT_TYPES)
 * @param {number} id l'identifiant de l'élément courant
 * @returns {{previous: object|null, next: object|null}} les voisins, null en bout de séquence
 * ou si l'élément n'y figure pas
 */
export function findNeighbours(sequence, type, id) {
    const index = sequence.findIndex((item) => item._type === type && item.id === id)
    if (index === -1) {
        return {previous: null, next: null}
    }
    return {
        previous: sequence[index - 1] ?? null,
        next: sequence[index + 1] ?? null
    }
}

/**
 * @param {object} item un élément de la séquence
 * @returns {string} l'adresse de la page de l'élément
 */
export function contentRoute(item) {
    return `${ROUTE_PREFIX[item._type]}${item.id}`
}

/**
 * @param {object} item un élément de la séquence
 * @returns {string} le libellé du type affiché à l'utilisateur
 */
export function contentKindLabel(item) {
    return KIND_LABEL[item._type]
}
