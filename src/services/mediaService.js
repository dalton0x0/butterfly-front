/*
  Service d'upload des médias.

  - POST /api/media/images vers MediaUploadResponse { url, filename, contentType, sizeBytes }
  - POST /api/media/videos vers MediaUploadResponse

  Axios détecte le FormData et pose lui-même l'en-tête multipart.
  La réponse contient l'URL relative à stocker (cover, avatar, videoUrl).

  L'usage d'une image (avatar, couverture, image de contenu) est transmis au back
  qui range le fichier dans le sous-dossier correspondant. Les valeurs doivent
  correspondre exactement à l'enum MediaUsage côté back (en majuscules).
*/

import http from './http'

// Usages d'image alignés sur l'enum MediaUsage du back.
export const MEDIA_USAGE = {
    AVATAR: 'AVATAR',
    COVER: 'COVER',
    CONTENT: 'CONTENT'
}

export const mediaService = {
    /**
     * Envoie une image et renvoie sa réponse (dont l'URL relative).
     * @param {File} file le fichier image à envoyer
     * @param {string} [usage] usage de l'image (AVATAR, COVER ou CONTENT), CONTENT par défaut
     * @returns {Promise<object>} MediaUploadResponse
     */
    async uploadImage(file, usage = MEDIA_USAGE.CONTENT) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('usage', String(usage).toUpperCase())
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
