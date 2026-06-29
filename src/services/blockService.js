/*
  Service des blocs de compétences.

  Correspondance avec le back :
  - GET /api/blocks vers Page<BlockResponse> (id, name, description, cover)
  - GET /api/blocks/{id} vers BlockResponse (avec ses modules)
  - POST /api/blocks vers BlockResponse (création, ADMIN/TEACHER)
  - PUT /api/blocks/{id} vers BlockResponse (modification, ADMIN/TEACHER)
  - DELETE /api/blocks/{id} (suppression, refusée si le bloc contient des modules)
  - GET /api/blocks/{id}/prerequisites vers List<BlockPrerequisiteResponse>
  - PUT /api/blocks/{id}/prerequisites vers List<BlockPrerequisiteResponse> (graphe vérifié sans cycle)

  Pour un USER, l'API ne renvoie que les blocs qui lui sont assignés.
  Pour un TEACHER, la liste ne contient que ses blocs assignés.
*/

import http from './http'
import {buildPageParams, normalizePage} from '@/utils/pagination.js'

export const blockService = {
    /**
     * Récupère la liste paginée des blocs.
     */
    async getBlocks(pageable = {size: 100}) {
        const envelope = await http.get('/blocks', {params: buildPageParams(pageable)})
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
    }
}
