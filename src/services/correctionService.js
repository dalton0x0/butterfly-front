/*
  Service de correction.

  Correspondance avec le back (ADMIN/TEACHER) :
  - GET /api/progress/exercises?status=SUBMITTED&search=... vers Page<ExerciseProgressResponse>
  - GET /api/progress/exercises/{exerciseId}/users/{userId}/submissions vers Page<ExerciseSubmissionResponse>
  - POST /api/progress/exercises/{exerciseId}/users/{userId}/validate vers ExerciseProgressResponse
  - POST /api/progress/exercises/{exerciseId}/users/{userId}/reject vers ExerciseProgressResponse

  Chaque ligne porte le nom de l'apprenant, il n'y a donc pas de correspondance à
  reconstituer côté client.

  Pour un TEACHER, la liste est déjà restreinte côté serveur aux apprenants de ses blocs.
  La note de validation est obligatoire et plafonnée à 20 par le back.
*/

import http from './http'
import {buildPageParams, DEFAULT_PAGE_SIZE, normalizePage} from '@/utils/pagination'

export const correctionService = {
    /**
     * File des progressions d'exercices, filtrable par statut (par défaut SUBMITTED).
     */
    async listProgress(filters = {}, {page = 0, size = DEFAULT_PAGE_SIZE, sort = 'updatedAt'} = {}) {
        const params = {...buildPageParams({page, size, sort})}
        if (filters.status) params.status = filters.status
        if (filters.userId) params.userId = filters.userId
        if (filters.promotionId) params.promotionId = filters.promotionId
        // La recherche est traitée par le serveur : sur la page reçue, elle ne trouverait
        // que ce qui est déjà affiché.
        if (filters.search) params.search = filters.search
        const envelope = await http.get('/progress/exercises', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Soumissions d'un apprenant pour un exercice donné.
     */
    async getUserSubmissions(exerciseId, userId, {page = 0, size = 50, sort} = {}) {
        const envelope = await http.get(`/progress/exercises/${exerciseId}/users/${userId}/submissions`, {
            params: buildPageParams({page, size, sort})
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
     * Demande une reprise du travail rendu et rouvre l'exercice.
     * Note et retour sont facultatifs. Une note fournie exprime « corrigé mais
     * insuffisant » ; absente, la progression repart sans note.
     * @param exerciseId
     * @param userId
     * @param {{ grade?: ?number, feedback?: ?string }} payload
     */
    async reject(exerciseId, userId, payload) {
        const envelope = await http.post(`/progress/exercises/${exerciseId}/users/${userId}/reject`, payload)
        return envelope.data
    }
}
