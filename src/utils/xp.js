// Libellés des sources de gains d'XP, alignés sur l'énumération XpSource du back.
const XP_SOURCE_LABELS = {
    COURSE_COMPLETED: 'Cours terminé',
    MODULE_COMPLETED: 'Module terminé',
    EXERCISE_VALIDATED: 'Exercice validé',
    QUIZ_PASSED: 'Quiz réussi',
    BADGE_UNLOCKED: 'Badge obtenu'
}

/**
 * Renvoie le libellé d'une source de gain d'XP.
 * @param {string} source valeur de XpSource
 * @returns {string} libellé lisible, ou la valeur brute si elle est inconnue
 */
export function xpSourceLabel(source) {
    return XP_SOURCE_LABELS[source] || source
}
