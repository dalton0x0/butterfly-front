/*
  Service des utilisateurs (lecture, ADMIN/TEACHER).

  Correspondance avec le back :
  - GET /api/users vers Page<UserResponse>
  - GET /api/progress/users/{userId}/overview vers UserProgressOverviewResponse

  Utilisé par l'espace formateur pour lister les apprenants, résoudre les noms
  dans la file de corrections et afficher l'aperçu de progression d'un apprenant.
*/

import http from './http'
import {normalizePage, buildPageParams} from '@/utils/pagination'

export const userService = {
    /**
     * Liste paginée des utilisateurs (triée par nom côté back).
     */
    async getUsers(pageable = {size: 200, sort: 'lastName'}) {
        const envelope = await http.get('/users', {params: buildPageParams(pageable)})
        return normalizePage(envelope.data)
    },

    /**
     * Récupère un utilisateur par son identifiant (lecture, ADMIN/TEACHER).
     * @returns {Promise<object>} UserResponse
     */
    async getUser(userId) {
        const envelope = await http.get(`/users/${userId}`)
        return envelope.data
    },

    /**
     * Liste paginée des utilisateurs supprimés logiquement (ADMIN).
     */
    async getDeletedUsers(pageable = {size: 200}) {
        const envelope = await http.get('/users/deleted', {params: buildPageParams(pageable)})
        return normalizePage(envelope.data)
    },

    /**
     * Bascule l'état actif/inactif d'un utilisateur (ADMIN).
     * @returns {Promise<object>} UserResponse mis à jour
     */
    async toggleEnabled(userId) {
        const envelope = await http.patch(`/users/${userId}/enabled`)
        return envelope.data
    },

    /**
     * Supprime logiquement un utilisateur (ADMIN).
     */
    async deleteUser(userId) {
        await http.delete(`/users/${userId}`)
    },

    /**
     * Restaure un utilisateur précédemment supprimé (ADMIN).
     * @returns {Promise<object>} UserResponse restauré
     */
    async restoreUser(userId) {
        const envelope = await http.post(`/users/${userId}/restore`)
        return envelope.data
    },

    /**
     * Crée un utilisateur (ADMIN). payload : { firstName, lastName, email, password, role, promotionId? }.
     */
    async createUser(payload) {
        const envelope = await http.post('/users', payload)
        return envelope.data
    },

    /**
     * Met à jour l'identité d'un utilisateur (ADMIN). payload : { firstName, lastName, email }.
     */
    async updateUser(userId, payload) {
        const envelope = await http.put(`/users/${userId}`, payload)
        return envelope.data
    },

    /**
     * Change le rôle d'un utilisateur (ADMIN). L'admin ne peut pas changer son propre rôle.
     */
    async updateRole(userId, role) {
        const envelope = await http.patch(`/users/${userId}/role`, {role})
        return envelope.data
    },

    /**
     * Assigne une promotion à un utilisateur (ADMIN).
     */
    async assignPromotion(userId, promotionId) {
        const envelope = await http.patch(`/users/${userId}/promotion/${promotionId}`)
        return envelope.data
    },

    /**
     * Retire la promotion d'un utilisateur (ADMIN).
     */
    async removePromotion(userId) {
        await http.delete(`/users/${userId}/promotion`)
    },

    /**
     * Remplace la liste des blocs assignés à un utilisateur (ADMIN).
     */
    async assignBlocks(userId, blockIds) {
        const envelope = await http.put(`/users/${userId}/blocks`, {blockIds})
        return envelope.data
    },

    /**
     * Aperçu de progression d'un apprenant (réservé au staff).
     * @returns {Promise<object>} UserProgressOverviewResponse
     */
    async getUserOverview(userId) {
        const envelope = await http.get(`/progress/users/${userId}/overview`)
        return envelope.data
    }
}
