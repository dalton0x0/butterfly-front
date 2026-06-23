/*
  Contraintes d'upload de fichiers alignées sur le back (StorageProperties).

  Types autorisés : PDF, PNG, JPEG, TXT, ZIP. Taille maximale : 5 Mo.
  Le champ multipart attendu par le back s'appelle "file".
*/

export const ALLOWED_UPLOAD_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'application/zip'
]

// Valeur de l'attribut accept de l'input fichier.
export const ALLOWED_UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt,.zip'

// 5 Mo, comme STORAGE_MAX_FILE_SIZE_BYTES côté back.
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024

const TYPES_LABEL = 'PDF, PNG, JPEG, TXT, ZIP'

/**
 * Valide un fichier avant envoi.
 * @returns {string} message d'erreur, ou chaîne vide si valide.
 */
export function validateUploadFile(file) {
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
        return `type non autorisé (${TYPES_LABEL} uniquement).`
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return 'le fichier dépasse la taille maximale de 5 Mo.'
    }
    return ''
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
