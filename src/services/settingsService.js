import http from './http'

/*
  Réglages d'affichage fournis par le serveur.
  - GET /api/settings vers LearningSettingsResponse { maxGrade }
  - PUT /api/settings/registration vers RegistrationStatusResponse { open } (ADMIN, MANAGER)
*/
export const settingsService = {

    /**
     * Récupère les réglages d'apprentissage nécessaires à l'affichage.
     * Réservé aux comptes authentifiés, comme les écrans qui s'en servent.
     *
     * @returns {Promise<{maxGrade: number}>}
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
    }
}
