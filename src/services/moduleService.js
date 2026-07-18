/*
  Service des modules.

  Correspondance avec le back :
  - GET /api/modules/{id} vers ModuleResponse (avec courses, exercises, quiz)
  - GET /api/modules/block/{blockId} vers Page<ModuleResponse> (triée par position)
  - POST /api/modules vers ModuleResponse (ADMIN/TEACHER assigné au bloc)
  - PUT /api/modules/{id} vers ModuleResponse
  - DELETE /api/modules/{id} (refusée si le module contient des cours ou exercices)
  - GET /api/modules/{id}/prerequisites vers List<ModulePrerequisiteResponse>
  - PUT /api/modules/{id}/prerequisites vers List<ModulePrerequisiteResponse> (graphe vérifié sans cycle)

  Les écritures vérifient côté back que le formateur est assigné au bloc du module.
*/

import http from './http'

export const moduleService = {
    /**
     * Récupère un module et son contenu détaillé (cours, exercices, quiz).
     */
    async getModule(id) {
        const envelope = await http.get(`/modules/${id}`)
        return envelope.data
    },

    /**
     * Crée un module.
     * @param {{ name: string, description?: string, blockId: number, position?: number }} payload
     */
    async createModule(payload) {
        const envelope = await http.post('/modules', payload)
        return envelope.data
    },

    /**
     * Met à jour un module.
     */
    async updateModule(id, payload) {
        const envelope = await http.put(`/modules/${id}`, payload)
        return envelope.data
    },

    /**
     * Supprime un module. Le back refuse si le module contient des cours ou exercices.
     */
    async deleteModule(id) {
        await http.delete(`/modules/${id}`)
    },

    /**
     * Liste les prérequis actuels d'un module.
     * @returns {Promise<object[]>} List<ModulePrerequisiteResponse> { id, name, position, blockId, blockName }
     */
    async getPrerequisites(id) {
        const envelope = await http.get(`/modules/${id}/prerequisites`)
        return envelope.data
    },

    /**
     * Remplace la liste des prérequis d'un module.
     * @param id
     * @param {number[]} prerequisiteIds liste (éventuellement vide) des identifiants de modules prérequis
     */
    async updatePrerequisites(id, prerequisiteIds) {
        const envelope = await http.put(`/modules/${id}/prerequisites`, {prerequisiteIds})
        return envelope.data
    },

    /**
     * Réordonne les cours et exercices d'un module.
     * @param {number} id identifiant du module
     * @param {Array<{type: 'COURSE'|'EXERCISE', id: number}>} items ordre souhaité (la position suit l'index)
     */
    async reorderContent(id, items) {
        await http.put(`/modules/${id}/content-order`, {items})
    }
}
