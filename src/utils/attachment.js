/*
  Contraintes des pièces jointes d'énoncé, alignées sur le back
  (ExerciseAttachmentProperties).

  Formats autorisés : voir fileFormats.js. Taille maximale : 10 Mo.
  Le champ multipart attendu par le back s'appelle "file".

  Volontairement distinct de utils/upload.js, qui vise les rendus des apprenants :
  les deux tailles maximales diffèrent côté serveur.
*/

import {ALLOWED_FILE_LABEL, isAllowedFile} from './fileFormats'

export {ALLOWED_FILE_ACCEPT as ALLOWED_ATTACHMENT_ACCEPT, fileIcon as attachmentIcon} from './fileFormats'

// 10 Mo, comme EXERCISE_ATTACHMENT_MAX_FILE_SIZE_BYTES côté back.
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024

/**
 * Valide une pièce jointe avant envoi.
 *
 * @param {File} file le fichier choisi
 * @returns {string} message d'erreur, ou chaîne vide si valide
 */
export function validateAttachmentFile(file) {
    if (!isAllowedFile(file.name)) {
        return `format non autorisé (${ALLOWED_FILE_LABEL}).`
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return 'le fichier dépasse la taille maximale de 10 Mo.'
    }
    return ''
}
