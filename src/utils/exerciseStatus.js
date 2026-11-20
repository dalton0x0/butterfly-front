// Pastille du statut d'un exercice pour l'apprenant. Partagée par « Mes exercices » et la
// page d'un module : les deux doivent dire la même chose pour le même exercice.
const EXERCISE_STATUS_CHIPS = {
    NOT_STARTED: {label: 'À faire', variant: 'neutral', icon: 'radio_button_unchecked'},
    IN_PROGRESS: {label: 'En cours', variant: 'primary', icon: 'schedule'},
    SUBMITTED: {label: 'En attente de correction', variant: 'warning', icon: 'schedule'},
    VALIDATED: {label: 'Corrigé', variant: 'success', icon: 'check_circle'},
    REJECTED: {label: 'À retravailler', variant: 'danger', icon: 'cancel'}
}

/**
 * Renvoie la pastille d'un statut d'exercice.
 * @param {?string} status valeur de ExerciseStatus, absente pour un exercice non rendu
 * @returns {{label: string, variant: string, icon: string}}
 */
export function exerciseStatusChip(status) {
    return EXERCISE_STATUS_CHIPS[status] || EXERCISE_STATUS_CHIPS.NOT_STARTED
}
