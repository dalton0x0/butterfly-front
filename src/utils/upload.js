/*
  Contraintes d'upload des rendus d'exercices, alignées sur le back (StorageProperties).

  Formats autorisés : voir fileFormats.js. Taille maximale : 20 Mo par fichier.
  Le champ multipart attendu par le back s'appelle "file".
*/

import {ALLOWED_FILE_LABEL, isAllowedFile} from './fileFormats'

export {ALLOWED_FILE_ACCEPT as ALLOWED_UPLOAD_ACCEPT, ALLOWED_FILE_LABEL as ALLOWED_UPLOAD_LABEL} from './fileFormats'

// 20 Mo, comme STORAGE_MAX_FILE_SIZE_BYTES côté back.
const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024

// 50 Mo pour l'ensemble des fichiers d'une soumission, comme client_max_body_size dans
// nginx.conf.template. Au-delà, nginx refuse la requête avant qu'elle n'atteigne le back.
const MAX_SUBMISSION_SIZE_BYTES = 50 * 1024 * 1024

/**
 * Valide un fichier avant envoi.
 * @returns {string} message d'erreur, ou chaîne vide si valide.
 */
export function validateUploadFile(file) {
    if (!isAllowedFile(file.name)) {
        return `format non autorisé (${ALLOWED_FILE_LABEL}).`
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return 'le fichier dépasse la taille maximale de 20 Mo.'
    }
    return ''
}

/**
 * Indique si un ensemble de fichiers peut partir dans une seule soumission.
 * @param {File[]} files les fichiers sélectionnés
 * @returns {boolean}
 */
export function fitsInOneSubmission(files) {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    return totalSize <= MAX_SUBMISSION_SIZE_BYTES
}

/**
 * Formate une taille en octets de façon lisible.
 */
export function formatFileSize(bytes) {
    if (bytes == null) {
        return ''
    }
    if (bytes < 1024) {
        return `${bytes} o`
    }
    if (bytes < 1024 * 1024) {
        return `${Math.round(bytes / 1024)} Ko`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
