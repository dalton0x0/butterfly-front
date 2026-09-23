/*
  Service des quiz.

  Correspondance avec le back :
  - GET /api/users/me/quizzes vers Page<MyQuizResponse>
  - GET /api/progress/quizzes/{id}/intro vers QuizIntroResponse (aucune question)
  - POST /api/progress/quizzes/{id}/start vers QuizAttemptStartResponse (première question)
  - GET /api/progress/attempts/{id}/current vers QuizAttemptStateResponse (reprise)
  - POST /api/progress/attempts/{id}/answers vers QuizAttemptStateResponse (question suivante)
  - POST /api/progress/attempts/{id}/finish vers QuizSubmissionResultResponse
  - POST /api/progress/quizzes/{id}/abandon sans corps de réponse
  - POST /api/progress/quizzes/{id}/submit vers QuizSubmissionResultResponse
  - GET /api/progress/me/quizzes vers Page<QuizAttemptResponse>

  Le score et la réussite sont calculés côté serveur : le front n'envoie que les
  options sélectionnées par question.
*/

import http from './http'
import {buildPageParams, normalizePage} from '@/utils/pagination'

export const quizService = {
    /**
     * Liste des quiz visibles par l'utilisateur, avec son état (tenté, réussi, meilleur score).
     */
    async getMyQuizzes(filters = {}, {page = 0, size = 100, sort} = {}) {
        const params = {...buildPageParams({page, size, sort})}
        if (filters.moduleId) params.moduleId = filters.moduleId
        if (filters.blockId) params.blockId = filters.blockId
        if (filters.attempted != null) params.attempted = filters.attempted
        const envelope = await http.get('/users/me/quizzes', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Écran d'introduction d'un quiz : consigne, durée, seuil et bilan des tentatives.
     * Ne contient aucune question et n'ouvre aucune tentative : les questions ne sont
     * livrées qu'au démarrage, quand le chronomètre part.
     * @returns {Promise<object>} QuizIntroResponse
     */
    async getIntro(quizId) {
        const envelope = await http.get(`/progress/quizzes/${quizId}/intro`)
        return envelope.data
    },

    /**
     * Ouvre une tentative sur un quiz. À appeler avant la première question.
     * La tentative existe en base dès cet appel : la quitter sans soumettre la compte
     * comme un échec sauf pendant le délai de grâce renvoyé par le serveur.
     * @param {number} quizId
     * @returns {Promise<object>} QuizAttemptStartResponse { attemptId, startedAt, graceSeconds, previousAttemptCounted }
     */
    async startAttempt(quizId) {
        const envelope = await http.post(`/progress/quizzes/${quizId}/start`)
        return envelope.data
    },

    /**
     * Clôture la tentative en cours sans la corriger.
     * Sans effet si aucune tentative n'est ouverte sur ce quiz.
     * @param {number} quizId
     */
    async abandonAttempt(quizId) {
        await http.post(`/progress/quizzes/${quizId}/abandon`)
    },

    /**
     * Question en cours d'une tentative, pour reprendre après un rechargement.
     * Le temps restant est celui calculé par le serveur, absence comprise.
     * @returns {Promise<object>} QuizAttemptStateResponse
     */
    async getCurrentState(attemptId) {
        const envelope = await http.get(`/progress/attempts/${attemptId}/current`)
        return envelope.data
    },

    /**
     * Répond à la question en cours et reçoit la suivante.
     * La réponse est verrouillée côté serveur : la renvoyer ne la modifiera pas.
     * @returns {Promise<object>} QuizAttemptStateResponse
     */
    async answer(attemptId, questionId, selectedOptionIds) {
        const envelope = await http.post(`/progress/attempts/${attemptId}/answers`, {questionId, selectedOptionIds})
        return envelope.data
    },

    /**
     * Termine la tentative. Le serveur la note à partir des réponses qu'il a enregistrées.
     * Le contenu du résultat dépend des réglages du quiz.
     * @returns {Promise<object>} QuizSubmissionResultResponse
     */
    async finish(attemptId) {
        const envelope = await http.post(`/progress/attempts/${attemptId}/finish`)
        return envelope.data
    },

    /**
     * Historique des tentatives de l'utilisateur, tous quiz confondus.
     */
    async getMyAttempts({page = 0, size = 50, sort} = {}) {
        const envelope = await http.get('/progress/me/quizzes', {params: buildPageParams({page, size, sort})})
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
     * Les drapeaux de mélange sont facultatifs, absents ils valent false côté serveur.
     * La consigne est facultative : envoyer null quand l'auteur n'en saisit pas.
     * @param {{ name: string, content: ?string, moduleId: number,
     *           shuffleQuestions?: boolean, shuffleOptions?: boolean }} payload
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
     * @param {Array<{ statement: string, type: string, points: number, timeLimitSeconds: ?number, options: Array<{ text: string, correct: boolean }> }>} questions
     */
    async updateQuestions(id, questions) {
        const envelope = await http.put(`/quizzes/${id}/questions`, {questions})
        return envelope.data
    }
}
