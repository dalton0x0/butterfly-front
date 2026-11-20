import http from './http'

/*
  Réglages d'affichage fournis par le serveur.
  - GET /api/settings vers LearningSettingsResponse { maxGrade, blockCreationRestricted }
  - PUT /api/settings/registration vers RegistrationStatusResponse { open } (ADMIN, MANAGER)
  - PUT /api/settings/block-creation { restricted } (ADMIN, MANAGER)
  - PUT /api/settings/manager-review { enabled } (ADMIN)
*/
export const settingsService = {

    /**
     * Récupère les réglages nécessaires à l'affichage.
     * Réservé aux comptes authentifiés, comme les écrans qui s'en servent.
     *
     * @returns {Promise<{maxGrade: number, blockCreationRestricted: boolean}>}
     */
    async getSettings() {
        const envelope = await http.get('/settings')
        return envelope.data
    },

    /**
     * Ouvre ou ferme l'inscription publique. La lecture passe par authService, car elle
     * est publique.
     *
     * @param {boolean} open
     * @returns {Promise<boolean>} l'état enregistré
     */
    async updateRegistrationOpen(open) {
        const envelope = await http.put('/settings/registration', {open})
        return envelope.data.open
    },

    /**
     * Réserve ou non la gestion des blocs à l'administration.
     *
     * @param {boolean} restricted
     * @returns {Promise<boolean>} l'état enregistré
     */
    async updateBlockCreationRestricted(restricted) {
        await http.put('/settings/block-creation', {restricted})
        return restricted
    },

    /**
     * Ouvre ou ferme la correction des exercices aux gestionnaires. Réservé à
     * l'administrateur.
     *
     * @param {boolean} enabled
     * @returns {Promise<boolean>} l'état enregistré
     */
    async updateManagerReviewEnabled(enabled) {
        await http.put('/settings/manager-review', {enabled})
        return enabled
    }
}
