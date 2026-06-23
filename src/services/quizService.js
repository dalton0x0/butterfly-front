/*
  Service des quiz.

  Correspondance avec le back :
  - GET /api/users/me/quizzes vers Page<MyQuizResponse>
  - GET /api/quizzes/{id}/play vers QuizPlayResponse (sans les bonnes réponses)
  - POST /api/progress/quizzes/{id}/submit vers QuizSubmissionResultResponse
  - GET /api/progress/me/quizzes vers Page<QuizAttemptResponse>

  Le score et la réussite sont calculés côté serveur : le front n'envoie que les
  options sélectionnées par question.
*/

import http from './http'
import {normalizePage, buildPageParams} from '@/utils/pagination'

export const quizService = {
    /**
     * Liste des quiz visibles par l'utilisateur, avec son état (tenté, réussi, meilleur score).
     */
    async getMyQuizzes(filters = {}, pageable = {size: 100}) {
        const params = {...buildPageParams(pageable)}
        if (filters.moduleId) params.moduleId = filters.moduleId
        if (filters.blockId) params.blockId = filters.blockId
        if (filters.attempted != null) params.attempted = filters.attempted
        const envelope = await http.get('/users/me/quizzes', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Récupère un quiz à passer (sans les bonnes réponses).
     * @returns {Promise<object>} QuizPlayResponse { id, name, content, questions }
     */
    async getPlay(id) {
        const envelope = await http.get(`/quizzes/${id}/play`)
        return envelope.data
    },

    /**
     * soumet les réponses et récupère le résultat corrigé.
     * @param {number} quizId
     * @param {Array<{ questionId: number, selectedOptionIds: number[] }>} answers
     * @returns {Promise<object>} QuizSubmissionResultResponse { attemptId, score, maxScore, passed, results }
     */
    async submit(quizId, answers) {
        const envelope = await http.post(`/progress/quizzes/${quizId}/submit`, {answers})
        return envelope.data
    },

    /**
     * Historique des tentatives de l'utilisateur, tous quiz confondus.
     */
    async getMyAttempts(pageable = {size: 50}) {
        const envelope = await http.get('/progress/me/quizzes', {params: buildPageParams(pageable)})
        return normalizePage(envelope.data)
    },

    /**
     * Récupère un quiz (métadonnées : nom, contenu, module).
     * @returns {Promise<object>} QuizResponse
     */
    async getQuiz(id) {
        const envelope = await http.get(`/quizzes/${id}`)
        return envelope.data
    },

    /**
     * Crée un quiz (ADMIN/TEACHER assigné au bloc du module).
     * @param {{ name: string, content: string, moduleId: number }} payload
     */
    async createQuiz(payload) {
        const envelope = await http.post('/quizzes', payload)
        return envelope.data
    },

    /**
     * Met à jour les métadonnées d'un quiz.
     */
    async updateQuiz(id, payload) {
        const envelope = await http.put(`/quizzes/${id}`, payload)
        return envelope.data
    },

    /**
     * Supprime un quiz.
     */
    async deleteQuiz(id) {
        await http.delete(`/quizzes/${id}`)
    },

    /**
     * Récupère les questions d'un quiz avec les bonnes réponses (vue formateur).
     * @returns {Promise<object[]>} List<QuestionResponse> { id, statement, type, position, points, options:[{ id, text, correct, position }] }
     */
    async getQuestions(id) {
        const envelope = await http.get(`/quizzes/${id}/questions`)
        return envelope.data
    },

    /**
     * Remplace l'intégralité des questions d'un quiz.
     * @param id
     * @param {Array<{ statement: string, type: string, points: number, options: Array<{ text: string, correct: boolean }> }>} questions
     */
    async updateQuestions(id, questions) {
        const envelope = await http.put(`/quizzes/${id}/questions`, {questions})
        return envelope.data
    }
}
