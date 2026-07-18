/*
  Rôles et présentation associée.
  Les valeurs correspondent aux rôles définis côté back.
*/

// Les trois rôles reconnus par le back.
export const ROLES = {
    ADMIN: 'ADMIN',
    TEACHER: 'TEACHER',
    USER: 'USER'
}

// Présentation par défaut d'un rôle : libellé court et variante de couleur du chip.
const ROLE_CHIP = {
    [ROLES.ADMIN]: {label: 'Admin', variant: 'primary'},
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
