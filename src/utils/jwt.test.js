import {describe, expect, it} from 'vitest'
import {isAccessTokenExpiring} from './jwt'

// Construit un jeton factice : seule la partie centrale (payload) est lue.
function tokenExpiringAt(expSeconds) {
    const payload = btoa(JSON.stringify({sub: 'léa@test.local', exp: expSeconds}))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `header.${payload}.signature`
}

const NOW = 1_800_000_000_000

describe('isAccessTokenExpiring', () => {
    it('renvoie false pour un jeton encore valide plusieurs minutes', () => {
        expect(isAccessTokenExpiring(tokenExpiringAt(NOW / 1000 + 600), NOW)).toBe(false)
    })

    it('renvoie true pour un jeton expiré', () => {
        expect(isAccessTokenExpiring(tokenExpiringAt(NOW / 1000 - 3600), NOW)).toBe(true)
    })

    it('renvoie true dans la marge de 30 secondes avant expiration', () => {
        expect(isAccessTokenExpiring(tokenExpiringAt(NOW / 1000 + 10), NOW)).toBe(true)
    })

    it('laisse passer un jeton illisible, le back tranchera', () => {
        expect(isAccessTokenExpiring('pas-un-jwt', NOW)).toBe(false)
    })
})
