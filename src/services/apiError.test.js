import {describe, it, expect} from 'vitest'
import {ApiError} from '@/services/apiError.js'

describe('ApiError', () => {
    it('reste une vraie Error, donc reconnaissable par instanceof', () => {
        const error = new ApiError({status: 500, message: 'Panne serveur.'})
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(ApiError)
        expect(error.name).toBe('ApiError')
    })

    it('expose une pile d\'appels, contrairement à un objet littéral', () => {
        expect(new ApiError({status: 0, message: 'Réseau indisponible.'}).stack).toBeTruthy()
    })

    it('conserve l\'erreur d\'origine', () => {
        const cause = new TypeError('inattendu')
        expect(new ApiError({status: 500, message: 'Panne.', cause}).cause).toBe(cause)
    })

    it('laisse validationErrors à null par défaut', () => {
        expect(new ApiError({status: 404, message: 'Introuvable.'}).validationErrors).toBeNull()
    })

    describe('isValidationError', () => {
        it('est vrai sur un 400 détaillé par champ', () => {
            const error = new ApiError({
                status: 400,
                message: 'Saisie invalide.',
                validationErrors: {email: 'Adresse invalide.'}
            })
            expect(error.isValidationError).toBe(true)
        })

        it('est faux sur un 400 sans détail', () => {
            expect(new ApiError({status: 400, message: 'Requête invalide.'}).isValidationError).toBe(false)
        })

        it('est faux sur un autre code, même avec des détails', () => {
            const error = new ApiError({
                status: 422,
                message: 'Non traitable.',
                validationErrors: {email: 'Adresse invalide.'}
            })
            expect(error.isValidationError).toBe(false)
        })
    })

    describe('isForbidden', () => {
        it('distingue le 403 du 401', () => {
            expect(new ApiError({status: 403, message: 'Accès refusé.'}).isForbidden).toBe(true)
            expect(new ApiError({status: 401, message: 'Non authentifié.'}).isForbidden).toBe(false)
        })
    })
})
