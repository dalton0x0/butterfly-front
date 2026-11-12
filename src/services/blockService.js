/*
  Service des blocs de compétences.

  Correspondance avec le back :
  - GET /api/blocks vers Page<BlockResponse> (id, name, description, cover), ?search= filtre le nom
  - GET /api/blocks/{id} vers BlockResponse (avec ses modules)
  - POST /api/blocks vers BlockResponse (création, ADMIN/TEACHER)
  - PUT /api/blocks/{id} vers BlockResponse (modification, ADMIN/TEACHER)
  - DELETE /api/blocks/{id} (suppression, refusée si le bloc contient des modules)
  - GET /api/blocks/{id}/prerequisites vers List<BlockPrerequisiteResponse>
  - PUT /api/blocks/{id}/prerequisites vers List<BlockPrerequisiteResponse> (graphe vérifié sans cycle)
  - GET /api/blocks/{id}/members vers Page<UserResponse> (comptes assignés, ADMIN/MANAGER)
  - GET /api/blocks/{id}/members/candidates vers Page<UserResponse> (comptes ajoutables)
  - POST /api/blocks/{id}/members et /members/promotions/{promotionId} vers {updated, unchanged}
  - DELETE /api/blocks/{id}/members?userIds=1,2 vers {updated, unchanged}

  Pour un USER, l'API ne renvoie que les blocs qui lui sont assignés.
  Pour un TEACHER, la liste ne contient que ses blocs assignés.
*/

import http from './http'
import {buildPageParams, DEFAULT_PAGE_SIZE, normalizePage} from '@/utils/pagination.js'

export const blockService = {
    /**
     * Récupère la liste paginée des blocs filtrée par nom si un terme est fourni.
     */
    async getBlocks({page = 0, size = 100, sort, search} = {}) {
        const params = buildPageParams({page, size, sort})
        if (search) {
            params.search = search
        }
        const envelope = await http.get('/blocks', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Récupère un bloc et ses modules.
     */
    async getBlock(id) {
        const envelope = await http.get(`/blocks/${id}`)
        return envelope.data
    },

    /**
     * Crée un bloc.
     * @param {{ name: string, description?: string, cover?: string }} payload
     * @returns {Promise<object>} BlockResponse
     */
    async createBlock(payload) {
        const envelope = await http.post('/blocks', payload)
        return envelope.data
    },

    /**
     * Met à jour un bloc.
     * @returns {Promise<object>} BlockResponse
     */
    async updateBlock(id, payload) {
        const envelope = await http.put(`/blocks/${id}`, payload)
        return envelope.data
    },

    /**
     * Supprime un bloc. Le back refuse la suppression si le bloc contient des modules.
     */
    async deleteBlock(id) {
        await http.delete(`/blocks/${id}`)
    },

    /**
     * Récupère les blocs prérequis d'un bloc.
     * @returns {Promise<object[]>} List<BlockPrerequisiteResponse> { id, name }
     */
    async getPrerequisites(id) {
        const envelope = await http.get(`/blocks/${id}/prerequisites`)
        return envelope.data
    },

    /**
     * Remplace l'ensemble des blocs prérequis d'un bloc.
     * @param id
     * @param {number[]} prerequisiteIds liste (éventuellement vide) des identifiants de blocs prérequis
     * @returns {Promise<object[]>} List<BlockPrerequisiteResponse>
     */
    async updatePrerequisites(id, prerequisiteIds) {
        const envelope = await http.put(`/blocks/${id}/prerequisites`, {prerequisiteIds})
        return envelope.data
    },

    /**
     * Comptes assignés au bloc (ADMIN/MANAGER).
     * @param id
     * @param {{search?: string, role?: string}} filters
     */
    async getMembers(id, {search, role} = {}, {page = 0, size = DEFAULT_PAGE_SIZE, sort = 'lastName'} = {}) {
        const params = {...buildPageParams({page, size, sort}), ...memberFilters({search, role})}
        const envelope = await http.get(`/blocks/${id}/members`, {params})
        return normalizePage(envelope.data)
    },

    /**
     * Comptes qu'on peut encore ajouter au bloc (ADMIN/MANAGER).
     * @param id
     * @param {{search?: string, role?: string, promotionId?: number}} filters
     */
    async getMemberCandidates(id, {search, role, promotionId} = {},
                              {page = 0, size = DEFAULT_PAGE_SIZE, sort = 'lastName'} = {}) {
        const params = {...buildPageParams({page, size, sort}), ...memberFilters({search, role})}
        if (promotionId) {
            params.promotionId = promotionId
        }
        const envelope = await http.get(`/blocks/${id}/members/candidates`, {params})
        return normalizePage(envelope.data)
    },

    /**
     * Ajoute des comptes au bloc. Un compte déjà membre est ignoré.
     * @returns {Promise<{updated: number, unchanged: number}>}
     */
    async addMembers(id, userIds) {
        const envelope = await http.post(`/blocks/${id}/members`, {userIds})
        return envelope.data
    },

    /**
     * Ajoute au bloc tous les apprenants d'une promotion.
     * @returns {Promise<{updated: number, unchanged: number}>}
     */
    async addPromotion(id, promotionId) {
        const envelope = await http.post(`/blocks/${id}/members/promotions/${promotionId}`)
        return envelope.data
    },

    /**
     * Retire des comptes du bloc.
     * Les identifiants sont joints par des virgules : axios écrirait sinon userIds[]=1,
     * que Spring ne sait pas lire.
     * @returns {Promise<{updated: number, unchanged: number}>}
     */
    async removeMembers(id, userIds) {
        const envelope = await http.delete(`/blocks/${id}/members`, {params: {userIds: userIds.join(',')}})
        return envelope.data
    }
}

// Filtres communs aux deux listes : une valeur vide n'est pas transmise.
function memberFilters({search, role}) {
    const params = {}
    if (search) {
        params.search = search
    }
    if (role) {
        params.role = role
    }
    return params
}
