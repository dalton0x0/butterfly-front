/*
  Service de profil.

  Appels réseau liés au profil de l'utilisateur connecté.

  Correspondance avec le back :
  - PUT /api/profile vers UserResponse (profil mis à jour)
  - PATCH /api/profile/password vers void (révoque aussi toutes les sessions)
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
    }
}
