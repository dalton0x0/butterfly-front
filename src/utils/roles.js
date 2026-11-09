/*
  Rôles et présentation associée.
  Les valeurs correspondent aux rôles définis côté back.
*/

// Les quatre rôles reconnus par le back.
export const ROLES = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    TEACHER: 'TEACHER',
    USER: 'USER'
}

// Présentation par défaut d'un rôle : libellé court et variante de couleur du chip.
const ROLE_CHIP = {
    [ROLES.ADMIN]: {label: 'Admin', variant: 'primary'},
    [ROLES.MANAGER]: {label: 'Gestionnaire', variant: 'primary'},
    [ROLES.TEACHER]: {label: 'Formateur', variant: 'primary'},
    [ROLES.USER]: {label: 'Apprenant', variant: 'neutral'}
}

/**
 * Renvoie le chip d'un rôle avec repli sur Apprenant si le rôle est inconnu.
 * @param {string} role rôle applicatif (ADMIN, TEACHER, USER)
 * @returns {{label: string, variant: string}}
 */
export function roleChip(role) {
    return ROLE_CHIP[role] || ROLE_CHIP[ROLES.USER]
}

// Rôles dont la portée couvre tous les blocs : ils ne reçoivent jamais de bloc.
const GLOBAL_SCOPE_ROLES = [ROLES.ADMIN, ROLES.MANAGER]

export function hasGlobalScope(role) {
    return GLOBAL_SCOPE_ROLES.includes(role)
}

/**
 * Rôles des comptes que l'utilisateur connecté voit et gère : tous pour l'administrateur,
 * apprenants et formateurs pour un gestionnaire. Le back applique la même règle aux
 * listes, à la recherche et aux fiches. Sert au filtre de la liste et à la création.
 * @param {string} actorRole rôle de l'utilisateur connecté
 * @returns {string[]}
 */
export function manageableRoles(actorRole) {
    return actorRole === ROLES.ADMIN
        ? [ROLES.USER, ROLES.TEACHER, ROLES.MANAGER, ROLES.ADMIN]
        : [ROLES.USER, ROLES.TEACHER]
}
