/*
  Lecture de la date d'expiration d'un jeton JWT côté client.

  Le contenu du jeton n'est pas vérifié ici : seule la signature contrôlée par le back
  fait foi. La date sert uniquement à éviter d'envoyer une requête avec un jeton que le
  back refusera de toute façon.
*/

// Marge avant l'expiration : un jeton qui expire pendant le trajet de la requête serait
// refusé à l'arrivée. Elle absorbe aussi un léger décalage d'horloge du poste.
const EXPIRY_MARGIN_MS = 30_000

/**
 * @param {string} token le jeton JWT
 * @returns {number|null} la date d'expiration en millisecondes, null si illisible
 */
function readExpiry(token) {
    try {
        const payload = token.split('.')[1]
        const json = atob(payload.replaceAll('-', '+').replaceAll('_', '/'))
        const exp = JSON.parse(json).exp
        return Number.isFinite(exp) ? exp * 1000 : null
    } catch {
        return null
    }
}

/**
 * Indique si un jeton d'accès est expiré ou expire dans les 30 secondes.
 *
 * Un jeton illisible est considéré comme valide : le back tranchera, et le 401 éventuel
 * sera traité comme avant.
 *
 * @param {string} token le jeton JWT
 * @param {number} now l'instant de référence en millisecondes, paramétrable pour les tests
 * @returns {boolean} true si le jeton doit être renouvelé avant l'envoi
 */
export function isAccessTokenExpiring(token, now = Date.now()) {
    const expiry = readExpiry(token)
    return expiry !== null && expiry - EXPIRY_MARGIN_MS <= now
}
