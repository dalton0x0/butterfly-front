/*
  Aides pour les médias fournis par le back.

  Le back renvoie des chemins relatifs (ex : /api/media/images/xxx.png) plutôt que
  des URL absolues, pour rester portable d'un environnement à l'autre. Le front
  recompose l'URL absolue à partir de l'origine du back, déduite de VITE_API_URL.

  mediaUrl gère aussi les URL externes (http...) saisies à l'ancienne : elles sont
  renvoyées telles quelles.
*/

// VITE_API_URL vaut par exemple http://localhost:8080/api ; l'origine est donc
// cette valeur privée de son suffixe /api.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '')

/**
 * Transforme une valeur stockée (chemin relatif ou URL externe) en URL affichable.
 * @param {string} value chemin relatif (/api/media/...) ou URL absolue
 * @returns {string} URL prête pour un src d'image ou de vidéo
 */
export function mediaUrl(value) {
    if (!value) {
        return ''
    }
    if (/^https?:\/\//i.test(value)) {
        return value
    }
    return `${BACKEND_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`
}

// Types d'image autorisés, alignés sur le back (MediaStorageProperties).
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const ALLOWED_IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif'
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

/**
 * Valide une image avant envoi.
 * @returns {string} message d'erreur, ou chaîne vide si valide.
 */
export function validateImageFile(file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return 'Format non autorisé (PNG, JPEG, WebP ou GIF).'
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return "L'image dépasse la taille maximale de 5 Mo."
    }
    return ''
}

// Types de vidéo autorisés, alignés sur le back (MediaStorageProperties).
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
export const ALLOWED_VIDEO_ACCEPT = '.mp4,.webm'
export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024

/**
 * Valide une vidéo avant envoi.
 * @returns {string} message d'erreur, ou chaîne vide si valide.
 */
export function validateVideoFile(file) {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return 'Format non autorisé (MP4 ou WebM).'
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
        return 'La vidéo dépasse la taille maximale de 200 Mo.'
    }
    return ''
}

/**
 * Détermine comment afficher une vidéo selon sa source.
 * - YouTube et Vimeo : lecteur embarqué (iframe).
 * - Fichier téléversé ou URL directe : balise video.
 * @param {string} value chemin relatif ou URL
 * @returns {{ type: 'iframe' | 'file', src: string } | null}
 */
export function resolveVideoSource(value) {
    if (!value) {
        return null
    }
    const youtube = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
    if (youtube) {
        return {type: 'iframe', src: `https://www.youtube.com/embed/${youtube[1]}`}
    }
    const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (vimeo) {
        return {type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}`}
    }
    return {type: 'file', src: mediaUrl(value)}
}
