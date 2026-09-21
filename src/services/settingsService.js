import http from './http'

/*
  Réglages d'affichage fournis par le serveur.
  - GET /api/settings vers LearningSettingsResponse { maxGrade }
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
    }
}
