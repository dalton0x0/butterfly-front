/*
  Service de la recherche globale.

  Correspondance avec le back :
  - GET /api/v1/search?q=...&limit=... vers SearchResponse
    { blocks, modules, courses, exercises, quizzes, users }, chaque entrée portant
    { type, id, title, context, locked }.

  Le périmètre est appliqué côté serveur : un apprenant ne voit que ses blocs et aucun
  utilisateur, un formateur ses blocs et ses apprenants, l'administrateur tout.
*/

import http from './http'

/** Longueur minimale du terme, alignée sur le serveur. */
export const MIN_SEARCH_LENGTH = 2

export const searchService = {
    /**
     * @param {string} term le terme saisi
     * @param {{limit?: number}} [options] nombre de résultats par nature (5 par défaut)
     * @returns {Promise<object>} les résultats regroupés par nature
     */
    async search(term, {limit = 5} = {}) {
        const envelope = await http.get('/search', {params: {q: term, limit}})
        return envelope.data
    }
}
