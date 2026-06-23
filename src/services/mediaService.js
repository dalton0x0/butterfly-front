/*
  Service d'upload des médias.

  - POST /api/media/images vers MediaUploadResponse { url, filename, contentType, sizeBytes }
  - POST /api/media/videos vers MediaUploadResponse

  Axios détecte le FormData et pose lui-même l'en-tête multipart.
  La réponse contient l'URL relative à stocker (cover, avatar, videoUrl).
*/

import http from './http'

export const mediaService = {
    /**
     * Envoie une image et renvoie sa réponse (dont l'URL relative).
     * @returns {Promise<object>} MediaUploadResponse
     */
    async uploadImage(file) {
        const formData = new FormData()
        formData.append('file', file)
        const envelope = await http.post('/media/images', formData)
        return envelope.data
    },

    /**
     * Envoie une vidéo et renvoie sa réponse (dont l'URL relative).
     * @returns {Promise<object>} MediaUploadResponse
     */
    async uploadVideo(file) {
        const formData = new FormData()
        formData.append('file', file)
        const envelope = await http.post('/media/videos', formData)
        return envelope.data
    }
}
