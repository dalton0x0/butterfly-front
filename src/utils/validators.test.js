import {describe, it, expect} from 'vitest'
import {
    validateRequired,
    validateEmail,
    validatePassword,
    validateMatch,
    passwordStrength,
    mapBackendError
} from '@/utils/validators.js'

describe('validateRequired', () => {
    it('accepte une valeur renseignée', () => {
        expect(validateRequired('Chéridanh')).toBe('')
    })

    it.each([undefined, null, '', '   '])('refuse la valeur %o', (value) => {
        expect(validateRequired(value)).toBe('Ce champ est obligatoire.')
    })

    it('utilise le message fourni', () => {
        expect(validateRequired('', 'Le nom est obligatoire.')).toBe('Le nom est obligatoire.')
    })
})

describe('validateEmail', () => {
    it.each([
        'user@example.com',
        'prenom.nom@sup-de-vinci.fr',
        'a+b%c@sous.domaine.co.uk'
    ])('accepte %s', (value) => {
        expect(validateEmail(value)).toBe('')
    })

    it.each([
        ['sans arobase', 'userexample.com'],
        ['sans extension', 'user@example'],
        ['extension trop courte', 'user@example.f'],
        ['domaine trop court', 'user@e.com'],
        ['partie locale vide', '@example.com']
    ])('refuse une adresse %s', (_label, value) => {
        expect(validateEmail(value)).toBe("L'adresse e-mail n'est pas valide.")
    })

    it('accepte une adresse entourée d\'espaces', () => {
        expect(validateEmail('  user@example.com  ')).toBe('')
    })

    it('distingue le vide de l\'invalide', () => {
        expect(validateEmail('   ')).toBe("L'adresse e-mail est obligatoire.")
    })
})

describe('validatePassword', () => {
    it('accepte un mot de passe conforme', () => {
        expect(validatePassword('MotDePasse1!')).toBe('')
    })

    it.each([
        ['trop court', 'Court1!aa'],
        ['sans majuscule', 'motdepasse1!'],
        ['sans minuscule', 'MOTDEPASSE1!'],
        ['sans chiffre', 'MotDePasse!!'],
        ['sans caractère spécial', 'MotDePasse12'],
        ['avec un espace', 'Mot De Passe1!']
    ])('refuse un mot de passe %s', (_label, value) => {
        expect(validatePassword(value)).toContain('10 caractères')
    })

    it('refuse au delà de la limite BCrypt de 72 caractères', () => {
        const trop = 'A1!a'.repeat(19) // 76 caractères, par ailleurs conforme
        expect(trop.length).toBeGreaterThan(72)
        expect(validatePassword(trop)).toBe('Le mot de passe ne doit pas dépasser 72 caractères.')
    })

    it('accepte exactement 72 caractères', () => {
        const limite = 'A1!a'.repeat(18)
        expect(limite.length).toBe(72)
        expect(validatePassword(limite)).toBe('')
    })
})

describe('validateMatch', () => {
    it('accepte deux saisies identiques', () => {
        expect(validateMatch('MotDePasse1!', 'MotDePasse1!')).toBe('')
    })

    it('refuse deux saisies différentes', () => {
        expect(validateMatch('MotDePasse1!', 'MotDePasse2!'))
            .toBe('Les deux mots de passe ne correspondent pas.')
    })

    it('demande la confirmation quand elle est vide', () => {
        expect(validateMatch('MotDePasse1!', '')).toBe('Veuillez confirmer le mot de passe.')
    })
})

describe('passwordStrength', () => {
    it.each([
        ['', 0],
        ['abc', 0],
        ['abcdefghij', 1],
        ['abcdefghiJ', 2],
        ['abcdefghiJ1', 3],
        ['abcdefghiJ1!', 4]
    ])('note %s à %i', (value, expected) => {
        expect(passwordStrength(value)).toBe(expected)
    })

    it('retombe à zéro au delà de 72 caractères, comme validatePassword', () => {
        expect(passwordStrength('A1!a'.repeat(19))).toBe(0)
    })
})

describe('mapBackendError', () => {
    it('dirige chaque erreur de validation vers son champ connu', () => {
        const result = mapBackendError(
            {status: 400, validationErrors: {email: 'Adresse invalide.', password: 'Trop court.'}},
            {knownFields: ['email', 'password']}
        )
        expect(result.fieldErrors).toEqual({email: 'Adresse invalide.', password: 'Trop court.'})
        expect(result.globalError).toBe('')
    })

    it('bascule en erreur globale un champ inconnu du formulaire', () => {
        const result = mapBackendError(
            {status: 400, validationErrors: {unknown: 'Champ inattendu.'}},
            {knownFields: ['email']}
        )
        expect(result.fieldErrors).toEqual({})
        expect(result.globalError).toBe('Champ inattendu.')
    })

    it('place un 409 sous le champ email', () => {
        const result = mapBackendError({status: 409, message: 'Adresse déjà utilisée.'})
        expect(result.fieldErrors.email).toBe('Adresse déjà utilisée.')
    })

    it('reste neutre sur un 401 sans champ désigné', () => {
        const result = mapBackendError({status: 401, message: 'Mot de passe incorrect.'})
        expect(result.fieldErrors).toEqual({})
        expect(result.globalError).toBe('E-mail ou mot de passe incorrect.')
    })

    it('désigne le champ sur un 401 quand le formulaire le précise', () => {
        const result = mapBackendError(
            {status: 401, message: 'Mot de passe actuel incorrect.'},
            {unauthorizedField: 'currentPassword'}
        )
        expect(result.fieldErrors.currentPassword).toBe('Mot de passe actuel incorrect.')
        expect(result.globalError).toBe('')
    })

    it('retombe sur un message générique quand rien n\'est exploitable', () => {
        expect(mapBackendError(null).globalError)
            .toBe('Une erreur est survenue. Veuillez réessayer.')
    })
})
