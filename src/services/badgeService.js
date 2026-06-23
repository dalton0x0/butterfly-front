/*
  Service des badges.

  GET /api/badges/me/progress renvoie tous les badges avec pour l'utilisateur connecté
  l'état (obtenu ou non), la valeur courante, la cible et le pourcentage.
*/

import http from './http'

export const badgeService = {
    /**
     * @returns {Promise<object[]>} liste de BadgeProgressResponse
     * { badge, earned, currentValue, targetValue, percent, earnedAt }
     */
    async getMyProgress() {
        const envelope = await http.get('/badges/me/progress')
        return envelope.data
    },

    /**
     * Liste tous les badges, actifs et inactifs (ADMIN).
     * @returns {Promise<object[]>} liste de BadgeResponse
     */
    async getAllBadges() {
        const envelope = await http.get('/badges/all')
        return envelope.data
    },

    /**
     * Met à jour un badge par son code (ADMIN).
     * @param {string} code BadgeCode (ex : STREAK_7)
     * @param {object} payload { name, description, icon, xpReward, thresholdValue, active }
     * @returns {Promise<object>} BadgeResponse mis à jour
     */
    async updateBadge(code, payload) {
        const envelope = await http.put(`/badges/${code}`, payload)
        return envelope.data
    },

    /**
     * Recalcule les badges d'un apprenant (ADMIN).
     * @returns {Promise<object>} Map des badges réévalués
     */
    async recompute(userId) {
        const envelope = await http.post(`/badges/recompute/${userId}`)
        return envelope.data
    }
}
