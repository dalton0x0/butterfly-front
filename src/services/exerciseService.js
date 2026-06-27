/*
  Service des exercices.

  Correspondance avec le back :
  - GET /api/exercises/{id} vers ExerciseResponse
  - GET /api/users/me/exercises vers Page<MyExerciseResponse>
  - POST /api/progress/exercises/{exerciseId}/submissions vers ExerciseSubmissionResponse
  - POST /api/progress/exercises/{exerciseId}/submissions/{submissionId}/files (multipart "file")
  - GET /api/progress/me/exercises/{exerciseId}/submissions vers Page<ExerciseSubmissionResponse>
  - GET /api/progress/submissions/{submissionId}/files/{fileId} vers fichier binaire

  On crée d'abord la soumission (contenu obligatoire),
  puis on joint les éventuels fichiers à la soumission créée.
*/

import http from './http'
import {buildPageParams, normalizePage} from '@/utils/pagination'

export const exerciseService = {
    /**
     * Récupère un exercice.
     * @returns {Promise<object>} ExerciseResponse { id, name, content, completed, moduleId, moduleName }
     */
    async getExercise(id) {
        const envelope = await http.get(`/exercises/${id}`)
        return envelope.data
    },

    /**
     * Catalogue des exercices de l'utilisateur avec leur statut (incluant NOT_STARTED).
     * Filtres facultatifs : status, moduleId, blockId.
     */
    async getMyExercises(filters = {}, pageable = {size: 100}) {
        const params = {...buildPageParams(pageable)}
        if (filters.status) params.status = filters.status
        if (filters.moduleId) params.moduleId = filters.moduleId
        if (filters.blockId) params.blockId = filters.blockId
        const envelope = await http.get('/users/me/exercises', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Crée une soumission avec son contenu (obligatoire, 10000 caractères max).
     * @returns {Promise<object>} ExerciseSubmissionResponse (dont l'id de la soumission)
     */
    async submit(exerciseId, content) {
        const envelope = await http.post(`/progress/exercises/${exerciseId}/submissions`, {content})
        return envelope.data
    },

    /**
     * Joint un fichier à une soumission existante.
     * Axios détecte le FormData et pose lui-même l'en-tête multipart.
     * @returns {Promise<object>} ExerciseSubmissionResponse mise à jour
     */
    async uploadFile(exerciseId, submissionId, file) {
        const formData = new FormData()
        formData.append('file', file)
        const envelope = await http.post(
            `/progress/exercises/${exerciseId}/submissions/${submissionId}/files`,
            formData
        )
        return envelope.data
    },

    /**
     * Met à jour le contenu d'une soumission encore en attente de correction.
     * @returns {Promise<object>} ExerciseSubmissionResponse mise à jour
     */
    async updateSubmission(exerciseId, submissionId, content) {
        const envelope = await http.put(
            `/progress/exercises/${exerciseId}/submissions/${submissionId}`,
            {content}
        )
        return envelope.data
    },

    /**
     * Retire un fichier d'une soumission encore en attente de correction.
     * @returns {Promise<object>} ExerciseSubmissionResponse mise à jour
     */
    async deleteFile(exerciseId, submissionId, fileId) {
        const envelope = await http.delete(
            `/progress/exercises/${exerciseId}/submissions/${submissionId}/files/${fileId}`
        )
        return envelope.data
    },

    /**
     * Historique des soumissions de l'utilisateur pour un exercice.
     */
    async getMySubmissions(exerciseId, pageable = {size: 50}) {
        const envelope = await http.get(`/progress/me/exercises/${exerciseId}/submissions`, {
            params: buildPageParams(pageable)
        })
        return normalizePage(envelope.data)
    },

    /**
     * Télécharge un fichier de soumission.
     * Réponse binaire : l'intercepteur renvoie directement le Blob (pas d'enveloppe ApiResponse).
     * @returns {Promise<Blob>}
     */
    async downloadFile(submissionId, fileId) {
        return http.get(`/progress/submissions/${submissionId}/files/${fileId}`, {
            responseType: 'blob'
        })
    },

    /**
     * Crée un exercice (ADMIN/TEACHER assigné au bloc du module).
     * @param {{ name: string, content: string, moduleId: number }} payload
     */
    async createExercise(payload) {
        const envelope = await http.post('/exercises', payload)
        return envelope.data
    },

    /**
     * Met à jour un exercice.
     */
    async updateExercise(id, payload) {
        const envelope = await http.put(`/exercises/${id}`, payload)
        return envelope.data
    },

    /**
     * Supprime un exercice.
     */
    async deleteExercise(id) {
        await http.delete(`/exercises/${id}`)
    }
}
