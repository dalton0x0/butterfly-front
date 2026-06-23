/*
  Service d'authentification.

  Regroupe les appels réseau liés à l'authentification.
  Chaque fonction renvoie la charge utile déjà déballée (envelope.data)
  car l'intercepteur de http.js a déjà renvoyé l'enveloppe ApiResponse.

  Correspondance avec le back :
  - POST /api/auth/register vers AuthResponse
  - POST /api/auth/login vers AuthResponse
  - POST /api/auth/logout vers void
  - GET /api/profile vers UserResponse (profil complet)
*/

import http from './http'

export const authService = {
    /**
     * Connecte un utilisateur.
     * @param {{ email: string, password: string }} credentials
     * @returns {Promise<object>} AuthResponse { accessToken, refreshToken, type, email, firstName, lastName, role }
     */
    async login(credentials) {
        const envelope = await http.post('/auth/login', credentials)
        return envelope.data
    },

    /**
     * Inscrit un nouvel utilisateur (rôle USER par défaut côté back).
     * @param {{ firstName: string, lastName: string, email: string, password: string }} payload
     * @returns {Promise<object>} AuthResponse
     */
    async register(payload) {
        const envelope = await http.post('/auth/register', payload)
        return envelope.data
    },

    /**
     * Révoque le refresh token côté back.
     * @param {string} refreshToken
     */
    async logout(refreshToken) {
        await http.post('/auth/logout', {refreshToken})
    },

    /**
     * Récupère le profil complet de l'utilisateur connecté.
     * AuthResponse ne contient ni l'id, ni l'avatar, ni la promotion : on les
     * obtient via cet endpoint après connexion ou au rechargement de la page.
     * @returns {Promise<object>} UserResponse
     */
    async fetchProfile() {
        const envelope = await http.get('/profile')
        return envelope.data
    }
}
