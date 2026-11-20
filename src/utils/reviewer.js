/**
 * Mention du correcteur d'une soumission.
 *
 * Le serveur ne donne le nom du correcteur qu'à l'équipe. L'apprenant reçoit seulement
 * l'indication que la correction vient de l'administration : il connaît ses formateurs,
 * mais le nom d'un administrateur ne lui apprend rien.
 *
 * @param {?{reviewerName?: string, reviewedByAdministration?: boolean}} submission
 * @returns {?string} la mention à afficher, ou null s'il n'y a rien à dire
 */
export function reviewerMention(submission) {
    if (submission?.reviewerName) {
        return `Corrigé par ${submission.reviewerName}`
    }
    if (submission?.reviewedByAdministration) {
        return "Corrigé par l'administration"
    }
    return null
}

/**
 * Pastille du correcteur, placée à côté du statut pour rester visible.
 * L'icône distingue une correction de l'administration de celle d'un formateur.
 *
 * @param {?{reviewerName?: string, reviewedByAdministration?: boolean}} submission
 * @returns {?{label: string, variant: string, icon: string}} la pastille, ou null
 */
export function reviewerChip(submission) {
    const label = reviewerMention(submission)
    if (!label) {
        return null
    }
    const icon = submission.reviewedByAdministration ? 'shield_person' : 'person'
    return {label, variant: 'primary', icon}
}
