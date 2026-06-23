/*
  Service de correction.

  Correspondance avec le back (ADMIN/TEACHER) :
  - GET /api/progress/exercises?status=SUBMITTED vers Page<ExerciseProgressResponse>
  - GET /api/progress/exercises/{exerciseId}/users/{userId}/submissions vers Page<ExerciseSubmissionResponse>
  - POST /api/progress/exercises/{exerciseId}/users/{userId}/validate vers ExerciseProgressResponse
  - POST /api/progress/exercises/{exerciseId}/users/{userId}/reject vers ExerciseProgressResponse

  Pour un TEACHER, la liste est déjà restreinte côté serveur aux apprenants de ses blocs.
  La note de validation est obligatoire et plafonnée à 20 par le back.
*/

import http from './http'
import {normalizePage, buildPageParams} from '@/utils/pagination'

export const correctionService = {
    /**
     * File des progressions d'exercices, filtrable par statut (par défaut SUBMITTED).
     */
    async listProgress(filters = {}, pageable = {size: 100, sort: 'updatedAt'}) {
        const params = {...buildPageParams(pageable)}
        if (filters.status) params.status = filters.status
        if (filters.userId) params.userId = filters.userId
        if (filters.promotionId) params.promotionId = filters.promotionId
        const envelope = await http.get('/progress/exercises', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Soumissions d'un apprenant pour un exercice donné.
     */
    async getUserSubmissions(exerciseId, userId, pageable = {size: 50}) {
        const envelope = await http.get(`/progress/exercises/${exerciseId}/users/${userId}/submissions`, {
            params: buildPageParams(pageable)
        })
        return normalizePage(envelope.data)
    },

    /**
     * Valide la progression d'un apprenant sur un exercice.
     * @param exerciseId
     * @param userId
     * @param {{ grade: number, feedback?: string }} payload
     */
    async validate(exerciseId, userId, payload) {
        const envelope = await http.post(`/progress/exercises/${exerciseId}/users/${userId}/validate`, payload)
        return envelope.data
    },

    /**
     * Rejette la progression d'un apprenant sur un exercice (feedback facultatif).
     * @param exerciseId
     * @param userId
     * @param {{ feedback?: string }} payload
     */
    async reject(exerciseId, userId, payload) {
        const envelope = await http.post(`/progress/exercises/${exerciseId}/users/${userId}/reject`, payload)
        return envelope.data
    }
}
