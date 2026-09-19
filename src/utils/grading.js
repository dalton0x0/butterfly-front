// Barème des exercices.
//
// La note maximale est décidée par le serveur (butterfly.learning.max-grade) mais
// n'est exposée par aucune réponse d'API aujourd'hui. Elle était donc écrite en dur
// dans six endroits de trois écrans, avec le risque qu'un changement de barème n'en
// corrige que cinq.
//
// Cette constante ne supprime pas la duplication entre les deux dépôts, elle la ramène
// à un seul endroit côté front. Le jour où le serveur exposera le barème, seul ce
// fichier changera.
export const MAX_GRADE = 20

/**
 * Formate une note pour l'affichage.
 *
 * @param {?number} grade la note obtenue, ou null si l'exercice n'a pas été noté
 * @param {string} [fallback] ce qui s'affiche en l'absence de note
 * @returns {string} la note sur le barème, ou le repli
 */
export function formatGrade(grade, fallback = '-') {
    return grade == null ? fallback : `${grade} / ${MAX_GRADE}`
}
