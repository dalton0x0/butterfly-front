/*
  Service des utilisateurs (lecture, ADMIN/TEACHER).

  Correspondance avec le back :
  - GET /api/users vers Page<UserResponse>
  - GET /api/progress/users/{userId}/overview vers UserProgressOverviewResponse

  Utilisé par l'espace formateur pour lister les apprenants, résoudre les noms
  dans la file de corrections et afficher l'aperçu de progression d'un apprenant.
*/

import http from './http'
import {buildPageParams, DEFAULT_PAGE_SIZE, normalizePage} from '@/utils/pagination'

export const userService = {
    /**
     * Liste paginée des utilisateurs, triée par nom côté back.
     *
     * Les filtres sont transmis au serveur et non appliqués sur la page reçue : une
     * recherche côté client ne verrait que les vingt lignes affichées.
     *
     * @param {object} [params]
     * @param {number} [params.page] index de page, commençant à 0
     * @param {number} [params.size] taille de page
     * @param {string} [params.sort] champ de tri
     * @param {string} [params.search] terme recherché dans le prénom, le nom ou l'e-mail
     * @param {string} [params.role] rôle attendu
     * @param {boolean} [params.enabled] état d'activation attendu
     */
    async getUsers({page = 0, size = DEFAULT_PAGE_SIZE, sort = 'lastName', search, role, enabled} = {}) {
        const params = buildPageParams({page, size, sort})

        // Les filtres absents ne sont pas transmis : envoyer search vide reviendrait à
        // demander au serveur un filtre qui ne filtre rien.
        if (search) {
            params.search = search
        }
        if (role) {
            params.role = role
        }
        if (enabled !== undefined && enabled !== null) {
            params.enabled = enabled
        }

        const envelope = await http.get('/users', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Récupère un utilisateur par son identifiant (lecture, ADMIN/TEACHER).
     * @returns {Promise<object>} UserResponse
     */
    async getUser(userId) {
        const envelope = await http.get(`/users/${userId}`)
        return envelope.data
    },

    /**
     * Liste paginée des utilisateurs supprimés logiquement (ADMIN).
     *
     * Pas de filtre enabled ici : un compte de la corbeille est désactivé par
     * construction, filtrer sur son état n'aurait pas de sens.
     *
     * @param {object} [params]
     * @param {number} [params.page] index de page, commençant à 0
     * @param {number} [params.size] taille de page
     * @param {string} [params.sort] champ de tri
     * @param {string} [params.search] terme recherché dans le prénom, le nom ou l'e-mail
     * @param {string} [params.role] rôle attendu
     */
    async getDeletedUsers({page = 0, size = DEFAULT_PAGE_SIZE, sort, search, role} = {}) {
        const params = buildPageParams({page, size, sort})

        if (search) {
            params.search = search
        }
        if (role) {
            params.role = role
        }

        const envelope = await http.get('/users/deleted', {params})
        return normalizePage(envelope.data)
    },

    /**
     * Bascule l'état actif/inactif d'un utilisateur (ADMIN).
     * @returns {Promise<object>} UserResponse mis à jour
     */
    async toggleEnabled(userId) {
        const envelope = await http.patch(`/users/${userId}/enabled`)
        return envelope.data
    },

    /**
     * Supprime logiquement un utilisateur (ADMIN).
     */
    async deleteUser(userId) {
        await http.delete(`/users/${userId}`)
    },

    /**
     * Restaure un utilisateur précédemment supprimé (ADMIN).
     * @returns {Promise<object>} UserResponse restauré
     */
    async restoreUser(userId) {
        const envelope = await http.post(`/users/${userId}/restore`)
        return envelope.data
    },

    /**
     * Crée un utilisateur (ADMIN). payload : { firstName, lastName, email, password, role, promotionId? }.
     */
    async createUser(payload) {
        const envelope = await http.post('/users', payload)
        return envelope.data
    },

    /**
     * Met à jour l'identité d'un utilisateur (ADMIN). payload : { firstName, lastName, email }.
     */
    async updateUser(userId, payload) {
        const envelope = await http.put(`/users/${userId}`, payload)
        return envelope.data
    },

    /**
     * Change le rôle d'un utilisateur (ADMIN). L'admin ne peut pas changer son propre rôle.
     */
    async updateRole(userId, role) {
        const envelope = await http.patch(`/users/${userId}/role`, {role})
        return envelope.data
    },

    /**
     * Assigne une promotion à un utilisateur (ADMIN).
     */
    async assignPromotion(userId, promotionId) {
        const envelope = await http.patch(`/users/${userId}/promotion/${promotionId}`)
        return envelope.data
    },

    /**
     * Retire la promotion d'un utilisateur (ADMIN).
     */
    async removePromotion(userId) {
        await http.delete(`/users/${userId}/promotion`)
    },

    /**
     * Remplace la liste des blocs assignés à un utilisateur (ADMIN).
     */
    async assignBlocks(userId, blockIds) {
        const envelope = await http.put(`/users/${userId}/blocks`, {blockIds})
        return envelope.data
    },

    /**
     * Aperçu de progression d'un apprenant (réservé au staff).
     * @returns {Promise<object>} UserProgressOverviewResponse
     */
    async getUserOverview(userId) {
        const envelope = await http.get(`/progress/users/${userId}/overview`)
        return envelope.data
    },

    /**
     * Historique complet des tentatives de quiz d'un apprenant (réservé au staff).
     * L'aperçu ne porte que les dernières activités, cet appel donne tout l'historique.
     * @returns {Promise<object>} page normalisée de QuizAttemptResponse
     */
    async getUserQuizAttempts(userId, {page = 0, size = 50, sort} = {}) {
        const envelope = await http.get(`/progress/users/${userId}/quizzes`, {
            params: buildPageParams({page, size, sort})
        })
        return normalizePage(envelope.data)
    },

    /**
     * Progressions de cours d'un apprenant (réservé au staff).
     * @param {number} userId
     * @param {{ status?: string, page?: number, size?: number, sort?: string }} options
     *        status : NOT_STARTED, IN_PROGRESS ou COMPLETED
     * @returns {Promise<object>} page normalisée de CourseProgressResponse
     */
    async getUserCourseProgress(userId, {status, page = 0, size = 50, sort} = {}) {
        const params = {...buildPageParams({page, size, sort})}
        if (status) {
            params.status = status
        }
        const envelope = await http.get(`/progress/users/${userId}/courses`, {params})
        return normalizePage(envelope.data)
    }
}
