/*
  Service de profil.

  Appels réseau liés au profil de l'utilisateur connecté.

  Correspondance avec le back :
  - PUT /api/profile vers UserResponse (profil mis à jour)
  - PATCH /api/profile/password vers void (révoque aussi toutes les sessions)
  - GET /api/profile/sessions vers SessionResponse[] (appareils connectés)
  - DELETE /api/profile/sessions/{id} vers void (déconnexion d'un appareil)
  - DELETE /api/profile/sessions/others vers void (déconnexion des autres appareils)
*/

import http from './http'

export const profileService = {
    /**
     * Met à jour les informations du profil.
     * @param {{ firstName: string, lastName: string, email: string, avatar?: string }} payload
     * @returns {Promise<object>} UserResponse
     */
    async updateProfile(payload) {
        const envelope = await http.put('/profile', payload)
        return envelope.data
    },

    /**
     * Change le mot de passe. Le back révoque toutes les sessions après succès,
     * l'utilisateur devra donc se reconnecter.
     * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} payload
     */
    async updatePassword(payload) {
        await http.patch('/profile/password', payload)
    },

    /**
     * Liste les sessions actives (appareils connectés) de l'utilisateur.
     * @returns {Promise<Array<{ id: number, createdAt: string, expiresAt: string }>>}
     */
    async listSessions() {
        const envelope = await http.get('/profile/sessions')
        return envelope.data
    },

    /**
     * Révoque une session précise (déconnexion d'un appareil).
     * @param {number} sessionId
     */
    async revokeSession(sessionId) {
        await http.delete(`/profile/sessions/${sessionId}`)
    },

    /**
     * Révoque toutes les sessions sauf la session courante.
     * @param {number} currentSessionId identifiant de la session à conserver
     */
    async revokeOtherSessions(currentSessionId) {
        await http.delete('/profile/sessions/others', {params: {currentSessionId}})
    }
}
