// Flux d'activité récente, construit à partir d'un aperçu de progression.
//
// Les trois écrans qui l'affichent (tableau de bord apprenant, fiche apprenant côté
// formateur, fiche utilisateur côté admin) en avaient chacun une copie identique à la
// limite d'affichage près. Le renommage des états d'exercice a dû être appliqué trois
// fois, ce qui est le signe habituel qu'une même connaissance vit en plusieurs endroits.

// Libellés des états d'exercice tels qu'ils apparaissent dans un flux d'activité.
// Ils décrivent un événement passé, là où les pastilles de statut décrivent un état.
const EXERCISE_EVENT_LABELS = {
    VALIDATED: 'Exercice corrigé',
    SUBMITTED: 'Exercice rendu',
    REJECTED: 'Exercice à retravailler'
}

/**
 * Fusionne les trois flux d'un aperçu en une liste d'événements datés.
 *
 * Les entrées sans date sont écartées : elles ne sauraient pas se placer dans la
 * chronologie et les afficher en fin de liste laisserait croire qu'elles sont anciennes.
 *
 * @param {object} overview l'aperçu de progression, éventuellement null
 * @param {number} limit nombre maximum d'événements renvoyés
 * @returns {Array<{icon: string, text: string, at: string}>} les événements, du plus récent au plus ancien
 */
export function buildRecentActivity(overview, limit) {
    const ov = overview || {}
    const items = []

    for (const c of ov.recentCourseProgress || []) {
        items.push({
            icon: 'menu_book',
            text: c.status === 'COMPLETED' ? `Cours terminé : ${c.courseName}` : `Cours en cours : ${c.courseName}`,
            at: c.completedAt || c.updatedAt || c.startedAt
        })
    }

    for (const e of ov.recentExerciseProgress || []) {
        const label = EXERCISE_EVENT_LABELS[e.status] || 'Exercice'
        items.push({
            icon: 'terminal',
            text: `${label} : ${e.exerciseName}`,
            at: e.validatedAt || e.submittedAt || e.updatedAt
        })
    }

    for (const q of ov.recentQuizAttempts || []) {
        // Une tentative abandonnée n'a pas été corrigée : afficher son score n'aurait aucun sens.
        items.push({
            icon: 'quiz',
            text: q.abandoned
                ? `Quiz abandonné : ${q.quizName}`
                : `${q.passed ? 'Quiz réussi' : 'Quiz tenté'} : ${q.quizName} (${q.score}/${q.maxScore})`,
            at: q.finishedAt || q.startedAt
        })
    }

    return items
        .filter((i) => i.at)
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, limit)
}
