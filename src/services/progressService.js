/*
  Service de progression (lecture, espace de l'utilisateur connecté).

  Correspondance avec le back :
  - GET /api/users/me/blocks vers List<BlockProgressSummaryResponse>
  - GET /api/progress/blocks/{id}/summary vers BlockProgressSummaryResponse

  BlockProgressSummaryResponse :
  { blockId, blockName, totalCourses, completedCourses, totalExercises,
    validatedExercises, totalQuizzes, passedQuizzes, overallPercent }
*/

import http from './http'

export const progressService = {
    /**
     * Résumé de progression de tous les blocs assignés à l'utilisateur.
     * @returns {Promise<object[]>} liste de BlockProgressSummaryResponse
     */
    async getMyBlocks() {
        const envelope = await http.get('/users/me/blocks')
        return envelope.data
    },

    /**
     * Résumé de progression d'un bloc précis pour l'utilisateur connecté.
     * @returns {Promise<object>} BlockProgressSummaryResponse
     */
    async getBlockSummary(blockId) {
        const envelope = await http.get(`/progress/blocks/${blockId}/summary`)
        return envelope.data
    }
}
