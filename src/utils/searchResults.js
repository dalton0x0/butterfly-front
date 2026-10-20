/*
  Présentation des résultats de la recherche globale.

  Le serveur renvoie la nature et l'identifiant de chaque résultat. La page à ouvrir
  dépend en plus du rôle de la personne qui cherche : un apprenant lit un cours, un
  formateur ou un administrateur l'ouvre dans l'espace d'édition.
*/

import {ROLES} from './roles'

const LEARNER_ROUTES = {
    BLOCK: '/blocs/',
    MODULE: '/modules/',
    COURSE: '/cours/',
    EXERCISE: '/exercices/',
    QUIZ: '/quiz/'
}

const STAFF_ROUTES = {
    BLOCK: '/formateur/contenus/blocs/',
    MODULE: '/formateur/contenus/modules/',
    COURSE: '/formateur/contenus/cours/',
    EXERCISE: '/formateur/contenus/exercices/',
    QUIZ: '/formateur/contenus/quiz/'
}

// Ordre d'affichage des groupes et libellés.
const GROUPS = [
    {key: 'blocks', label: 'Blocs', icon: 'view_module'},
    {key: 'modules', label: 'Modules', icon: 'layers'},
    {key: 'courses', label: 'Cours', icon: 'menu_book'},
    {key: 'exercises', label: 'Exercices', icon: 'terminal'},
    {key: 'quizzes', label: 'Quiz', icon: 'quiz'},
    {key: 'users', label: 'Utilisateurs', icon: 'person'}
]

/**
 * Adresse de la page d'un résultat selon le rôle de la personne qui cherche.
 *
 * @param {{type: string, id: number}} hit un résultat
 * @param {string} role le rôle de l'utilisateur connecté
 * @returns {string|null} l'adresse, ou null si le rôle n'a pas de page pour ce résultat
 */
export function searchHitRoute(hit, role) {
    if (hit.type === 'USER') {
        if (role === ROLES.ADMIN) {
            return `/admin/utilisateurs/${hit.id}`
        }
        return role === ROLES.TEACHER ? `/formateur/apprenants/${hit.id}` : null
    }
    const routes = role === ROLES.USER ? LEARNER_ROUTES : STAFF_ROUTES
    return routes[hit.type] ? `${routes[hit.type]}${hit.id}` : null
}

/**
 * Transforme la réponse du serveur en groupes affichables sans les groupes vides.
 * Le libellé des utilisateurs devient « Apprenants » pour un formateur qui ne voit qu'eux.
 *
 * @param {object|null} response la réponse de GET /search
 * @param {string} role le rôle de l'utilisateur connecté
 * @returns {Array<{key: string, label: string, icon: string, hits: Array<object>}>}
 */
export function toSearchGroups(response, role) {
    if (!response) {
        return []
    }
    return GROUPS
        .map((group) => ({
            ...group,
            label: group.key === 'users' && role === ROLES.TEACHER ? 'Apprenants' : group.label,
            hits: (response[group.key] || []).map((hit) => ({...hit, to: searchHitRoute(hit, role)}))
        }))
        .filter((group) => group.hits.length > 0)
}
