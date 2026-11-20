/*
  Service de progression (lecture, espace de l'utilisateur connecté).

  Correspondance avec le back :
  - GET /api/users/me/blocks vers List<BlockProgressSummaryResponse>
  - GET /api/progress/blocks/{id}/summary vers BlockProgressSummaryResponse
  - GET /api/progress/xp vers Page<XpTransactionResponse> { id, source, sourceId, amount, earnedAt }

  BlockProgressSummaryResponse :
  { blockId, blockName, totalCourses, completedCourses, totalExercises,
    validatedExercises, totalQuizzes, passedQuizzes, overallPercent }
*/

import http from './http'
import {buildPageParams, normalizePage} from '@/utils/pagination'

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
    },

    /**
     * Historique des gains d'XP de l'utilisateur connecté, les plus récents d'abord.
     * @returns {Promise<object>} page normalisée de XpTransactionResponse
     */
    async getMyXpHistory({page = 0, size = 5} = {}) {
        const envelope = await http.get('/progress/xp', {params: buildPageParams({page, size})})
        return normalizePage(envelope.data)
    }
}
