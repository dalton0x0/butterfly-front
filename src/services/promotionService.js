/*
  Service des promotions (ADMIN).

  Correspondance avec le back (/api/promos) :
  - GET /api/promos vers Page<PromoResponse> (paramètre facultatif active)
  - GET /api/promos/{id} vers PromoResponse
  - POST /api/promos créer
  - PUT /api/promos/{id} mettre à jour
  - DELETE /api/promos/{id} supprimer
  - PATCH /api/promos/{id}/active basculer l'état actif

  PromoResponse : { id, name, startDate, endDate, active, userCount, users[] }
  PromoRequest : { name, startDate, endDate }
*/

import http from './http'
import {buildPageParams, DEFAULT_PAGE_SIZE, normalizePage} from '@/utils/pagination'

export const promotionService = {
    /**
     * Liste paginée des promotions.
     *
     * @param {object} [params]
     * @param {number} [params.page] index de page, commençant à 0
     * @param {number} [params.size] taille de page
     * @param {string} [params.sort] champ de tri
     * @param {boolean} [params.active] restreint aux promotions actives ou inactives.
     * Le filtre est transmis au serveur : appliqué sur la page reçue, il ne verrait
     * que les promotions déjà affichées et fausserait tout comptage.
     */
    async getPromotions({page = 0, size = DEFAULT_PAGE_SIZE, sort, active} = {}) {
        const params = buildPageParams({page, size, sort})

        if (active !== undefined && active !== null) {
            params.active = active
        }

        const envelope = await http.get('/promos', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Récupère une promotion par son identifiant (avec ses membres).
     */
    async getPromotion(id) {
        const envelope = await http.get(`/promos/${id}`)
        return envelope.data
    },

    /**
     * Crée une promotion. payload : { name, startDate, endDate }.
     */
    async createPromotion(payload) {
        const envelope = await http.post('/promos', payload)
        return envelope.data
    },

    /**
     * Met à jour une promotion. payload : { name, startDate, endDate }.
     */
    async updatePromotion(id, payload) {
        const envelope = await http.put(`/promos/${id}`, payload)
        return envelope.data
    },

    /**
     * Supprime une promotion.
     */
    async deletePromotion(id) {
        await http.delete(`/promos/${id}`)
    },

    /**
     * Bascule l'état actif/inactif d'une promotion (sans corps).
     */
    async toggleActive(id) {
        const envelope = await http.patch(`/promos/${id}/active`)
        return envelope.data
    }
}
