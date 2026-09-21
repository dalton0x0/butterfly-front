import {ref} from 'vue'
import {settingsService} from '@/services/settingsService'

// Barème des exercices.
//
// La note maximale est décidée par le serveur (butterfly.learning.max-grade). Elle est
// chargée une fois après l'authentification et conservée ici, plutôt que recopiée dans
// chaque écran qui affiche une note.
//
// La valeur reste une référence et non une constante : au premier rendu, avant la
// réponse du serveur, les écrans doivent bien afficher quelque chose. Le repli vaut donc
// 20, valeur par défaut du serveur, et sera remplacé dès que la réponse arrive.
const DEFAULT_MAX_GRADE = 20

export const maxGrade = ref(DEFAULT_MAX_GRADE)

/**
 * Charge le barème depuis le serveur.
 *
 * En cas d'échec, le repli est conservé et l'affichage reste cohérent : un tableau de
 * bord ne doit pas rester vide parce qu'un réglage d'affichage n'a pas pu être lu.
 */
export async function loadGradingSettings() {
    try {
        const settings = await settingsService.getSettings()
        if (settings?.maxGrade) {
            maxGrade.value = settings.maxGrade
        }
    } catch (error) {
        console.warn('[grading] barème indisponible, valeur par défaut conservée', error)
    }
}

/**
 * Remet le barème à sa valeur par défaut, à la déconnexion.
 * Le barème appartient au serveur interrogé, il ne doit pas survivre à la session.
 */
export function resetGradingSettings() {
    maxGrade.value = DEFAULT_MAX_GRADE
}

/**
 * Formate une note pour l'affichage.
 *
 * @param {?number} grade la note obtenue, ou null si l'exercice n'a pas été noté
 * @param {string} [fallback] ce qui s'affiche en l'absence de note
 * @returns {string} la note sur le barème, ou le repli
 */
export function formatGrade(grade, fallback = '-') {
    return grade == null ? fallback : `${grade} / ${maxGrade.value}`
}
