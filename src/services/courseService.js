/*
  Service des cours.

  Correspondance avec le back :
  - GET /api/courses/{id} vers CourseResponse
  - POST /api/progress/courses/{courseId}/complete vers CourseProgressResponse

  Seul un USER possède une progression : marquer un cours comme terminé est
  réservé à ce rôle côté back.
*/

import http from './http'

export const courseService = {
    /**
     * Récupère un cours.
     * @returns {Promise<object>} CourseResponse { id, name, description, videoUrl, content, completed, moduleId, moduleName }
     */
    async getCourse(id) {
        const envelope = await http.get(`/courses/${id}`)
        return envelope.data
    },

    /**
     * Marque le cours comme terminé pour l'utilisateur connecté.
     * @returns {Promise<object>} CourseProgressResponse
     */
    async markCompleted(courseId) {
        const envelope = await http.post(`/progress/courses/${courseId}/complete`)
        return envelope.data
    },

    /**
     * Crée un cours (ADMIN/TEACHER assigné au bloc du module).
     * @param {{ name: string, description?: string, videoUrl?: string, content: string, moduleId: number }} payload
     */
    async createCourse(payload) {
        const envelope = await http.post('/courses', payload)
        return envelope.data
    },

    /**
     * Met à jour un cours.
     */
    async updateCourse(id, payload) {
        const envelope = await http.put(`/courses/${id}`, payload)
        return envelope.data
    },

    /**
     * Supprime un cours.
     */
    async deleteCourse(id) {
        await http.delete(`/courses/${id}`)
    }
}
