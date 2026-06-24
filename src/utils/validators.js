/*
  Utilitaires de validation des formulaires.

  Les regex sont volontairement identiques à celles du back afin que la
  validation côté client reflète exactement les contraintes serveur :
  - EMAIL_PATTERN reprend l'annotation @StrictEmail ;
  - PASSWORD_PATTERN reprend l'annotation @StrongPassword.
*/

// Email : partie locale, arobase, domaine d'au moins 2 caractères, point, extension d'au moins 2 lettres.
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]{2,}\.[a-zA-Z]{2,}$/

// Mot de passe : 10 caractères minimum, 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial, sans espace.
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{10,}$/

const PASSWORD_MESSAGE =
    'Le mot de passe doit contenir au minimum 10 caractères avec au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.'

/**
 * Vérifie qu'un champ texte est renseigné.
 * @returns {string} message d'erreur, ou chaîne vide si valide.
 */
export function validateRequired(value, message = 'Ce champ est obligatoire.') {
    return value && value.trim() ? '' : message
}

/**
 * Valide une adresse e-mail selon la même règle que le back.
 */
export function validateEmail(value) {
    if (!value || !value.trim()) {
        return "L'adresse e-mail est obligatoire."
    }
    return EMAIL_PATTERN.test(value.trim()) ? '' : "L'adresse e-mail n'est pas valide."
}

/**
 * Valide un mot de passe selon la même règle que le back.
 */
export function validatePassword(value) {
    if (!value) {
        return 'Le mot de passe est obligatoire.'
    }
    return PASSWORD_PATTERN.test(value) ? '' : PASSWORD_MESSAGE
}

/**
 * Vérifie que deux mots de passe sont identiques.
 */
export function validateMatch(password, confirmation) {
    if (!confirmation) {
        return 'Veuillez confirmer le mot de passe.'
    }
    return password === confirmation ? '' : 'Les deux mots de passe ne correspondent pas.'
}

/**
 * Calcule une force de mot de passe entre 0 et 4, pour alimenter la jauge.
 * Chaque critère rempli ajoute un point.
 */
export function passwordStrength(value) {
    if (!value) {
        return 0
    }
    let score = 0
    if (value.length >= 10) score++
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
    if (/\d/.test(value)) score++
    if (/[^A-Za-z0-9]/.test(value)) score++
    return score
}

/**
 * Traduit une erreur normalisée du back en erreurs exploitables par le formulaire.
 *
 * - Sur un 400 avec validationErrors (Map<champ, message>), chaque message est
 *   dirigé vers le champ correspondant s'il fait partie des champs connus.
 * - Sur un 409, l'email est déjà utilisé.
 * - Sur un 401 : si unauthorizedField est fourni, le message précis du back est
 *   placé sous ce champ (cas du mot de passe actuel incorrect). Sinon, on affiche
 *   un message global neutre (cas de la connexion, sans révéler quel champ est faux).
 * - Sinon, on retombe sur le message du back (cas des 400 sans validationErrors,
 *   comme la confirmation invalide ou le mot de passe identique).
 *
 * @returns {{ fieldErrors: Object, globalError: string }}
 */
export function mapBackendError(
    err,
    {knownFields = [], unauthorizedField = null, unauthorizedMessage = 'E-mail ou mot de passe incorrect.'} = {}
) {
    const fieldErrors = {}
    let globalError = ''

    if (err?.validationErrors) {
        Object.entries(err.validationErrors).forEach(([field, message]) => {
            if (knownFields.includes(field)) {
                fieldErrors[field] = message
            } else {
                globalError = message
            }
        })
    } else if (err?.status === 409) {
        fieldErrors.email = err.message || 'Cette adresse e-mail est déjà utilisée.'
    } else if (err?.status === 401) {
        if (unauthorizedField) {
            fieldErrors[unauthorizedField] = err.message || 'Information invalide.'
        } else {
            globalError = unauthorizedMessage
        }
    } else {
        globalError = err?.message || 'Une erreur est survenue. Veuillez réessayer.'
    }

    return {fieldErrors, globalError}
}
