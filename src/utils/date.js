/*
  Formatage de dates pour l'affichage centralisé.

  Le format par défaut (par exemple 03 janv. 2026) couvre la majorité des vues.
  Les cas particuliers passent leurs propres options Intl ou une valeur de repli
  différente sans recopier la logique de parsing et de validation.
*/

const DEFAULT_OPTIONS = {day: '2-digit', month: 'short', year: 'numeric'}

/**
 * Formate une date en français.
 * @param {string|number|Date} value valeur ISO, timestamp ou objet Date.
 * @param {{fallback?: string|null, options?: object}} [config]
 * fallback : valeur renvoyée si la date est absente ou invalide (défaut : chaîne vide).
 * options : options Intl.DateTimeFormat (défaut : jour court, mois court, année).
 * @returns {string|null} date formatée, ou la valeur de repli.
 */
export function formatDate(value, {fallback = '', options = DEFAULT_OPTIONS} = {}) {
    if (!value) {
        return fallback
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime())
        ? fallback
        : date.toLocaleDateString('fr-FR', options)
}
