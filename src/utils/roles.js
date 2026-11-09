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

// Rôles des comptes qu'un gestionnaire peut créer et gérer.
const ROLES_MANAGED_BY_MANAGER = [ROLES.USER, ROLES.TEACHER]

export function hasGlobalScope(role) {
    return GLOBAL_SCOPE_ROLES.includes(role)
}

/**
 * Indique si un compte de ce rôle peut être géré par l'utilisateur connecté.
 * Le back applique la même règle : ce test ne fait que masquer ce qu'il refuserait.
 * @param {string} actorRole rôle de l'utilisateur connecté
 * @param {string} targetRole rôle du compte visé
 * @returns {boolean}
 */
export function canManageAccount(actorRole, targetRole) {
    if (actorRole === ROLES.ADMIN) {
        return true
    }
    return actorRole === ROLES.MANAGER && ROLES_MANAGED_BY_MANAGER.includes(targetRole)
}

/**
 * Rôles proposés à la création d'un compte selon l'utilisateur connecté.
 * @param {string} actorRole rôle de l'utilisateur connecté
 * @returns {string[]}
 */
export function creatableRoles(actorRole) {
    return actorRole === ROLES.ADMIN ? [ROLES.USER, ROLES.TEACHER, ROLES.MANAGER, ROLES.ADMIN] : ROLES_MANAGED_BY_MANAGER
}
