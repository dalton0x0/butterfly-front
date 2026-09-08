/*
  Contraintes des pièces jointes d'énoncé, alignées sur le back
  (ExerciseAttachmentProperties).

  Types autorisés : PDF, PNG, JPEG, TXT, MD, ZIP. Taille maximale : 10 Mo.
  Le champ multipart attendu par le back s'appelle "file".

  Volontairement distinct de utils/upload.js, qui vise les rendus des apprenants :
  les deux jeux de règles peuvent diverger côté serveur.
*/

const ALLOWED_ATTACHMENT_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/markdown',
    'application/zip'
])

// Valeur de l'attribut accept de l'input fichier.
export const ALLOWED_ATTACHMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt,.md,.zip'

// 10 Mo, comme EXERCISE_ATTACHMENT_MAX_FILE_SIZE_BYTES côté back.
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024

const TYPES_LABEL = 'PDF, PNG, JPEG, TXT, MD, ZIP'

/**
 * Valide une pièce jointe avant envoi.
 *
 * @param {File} file le fichier choisi
 * @returns {string} message d'erreur, ou chaîne vide si valide
 */
export function validateAttachmentFile(file) {
    // Certains systèmes ne reconnaissent pas le .md et renvoient un type vide.
    // On accepte alors le fichier sur son extension, le serveur tranchera.
    const type = file.type || guessTypeFromName(file.name)

    if (!ALLOWED_ATTACHMENT_TYPES.has(type)) {
        return `type non autorisé (${TYPES_LABEL} uniquement).`
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return 'le fichier dépasse la taille maximale de 10 Mo.'
    }
    return ''
}

/**
 * Déduit un type MIME de l'extension quand le navigateur n'en fournit aucun.
 */
function guessTypeFromName(name) {
    if (!name) {
        return ''
    }
    const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
    if (extension === 'md' || extension === 'markdown') {
        return 'text/markdown'
    }
    if (extension === 'txt') {
        return 'text/plain'
    }
    return ''
}

/**
 * Icône Material Symbols correspondant au type d'une pièce jointe.
 *
 * @param {string} contentType le type MIME du fichier
 * @returns {string} le nom de l'icône
 */
export function attachmentIcon(contentType) {
    if (!contentType) {
        return 'draft'
    }
    if (contentType.startsWith('image/')) {
        return 'image'
    }
    if (contentType === 'application/pdf') {
        return 'picture_as_pdf'
    }
    if (contentType === 'application/zip') {
        return 'folder_zip'
    }
    return 'description'
}
