import {describe, it, expect, beforeEach} from 'vitest'
import {tokenStorage} from '@/services/tokenStorage.js'

/*
  Le module lit localStorage et sessionStorage comme des variables globales, au
  moment de l'appel et non à l'import. Deux implantations en mémoire suffisent
  donc, sans avoir à charger un DOM complet.
*/
function createStorage() {
    const entries = new Map()
    return {
        getItem: (key) => (entries.has(key) ? entries.get(key) : null),
        setItem: (key, value) => entries.set(key, String(value)),
        removeItem: (key) => entries.delete(key),
        get size() {
            return entries.size
        }
    }
}

const ACCESS_KEY = 'butterfly.accessToken'
const REFRESH_KEY = 'butterfly.refreshToken'
const SESSION_ID_KEY = 'butterfly.sessionId'

beforeEach(() => {
    globalThis.localStorage = createStorage()
    globalThis.sessionStorage = createStorage()
})

describe('choix du support selon "Se souvenir de moi"', () => {
    it('écrit dans le localStorage quand la case est cochée', () => {
        tokenStorage.set('acces', 'refresh', true, 7)

        expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh')
        expect(sessionStorage.getItem(REFRESH_KEY)).toBeNull()
    })

    it('écrit dans le sessionStorage quand la case est décochée', () => {
        tokenStorage.set('acces', 'refresh', false, 7)

        expect(sessionStorage.getItem(REFRESH_KEY)).toBe('refresh')
        expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
    })

    it('ne laisse jamais les jetons dans les deux supports à la fois', () => {
        tokenStorage.set('acces1', 'refresh1', true, 7)
        tokenStorage.set('acces2', 'refresh2', false, 7)

        expect(localStorage.getItem(ACCESS_KEY)).toBeNull()
        expect(sessionStorage.getItem(ACCESS_KEY)).toBe('acces2')
    })
})

describe('rotation du refresh token', () => {
    it('reste en sessionStorage quand la session y vivait', () => {
        tokenStorage.set('acces1', 'refresh1', false, 7)
        tokenStorage.set('acces2', 'refresh2', undefined, 7)

        expect(sessionStorage.getItem(ACCESS_KEY)).toBe('acces2')
        expect(localStorage.getItem(ACCESS_KEY)).toBeNull()
    })

    it('reste en localStorage quand la session y vivait', () => {
        tokenStorage.set('acces1', 'refresh1', true, 7)
        tokenStorage.set('acces2', 'refresh2', undefined, 7)

        expect(localStorage.getItem(ACCESS_KEY)).toBe('acces2')
        expect(sessionStorage.getItem(ACCESS_KEY)).toBeNull()
    })

    it('conserve l\'identifiant de session quand l\'appelant l\'omet', () => {
        tokenStorage.set('acces1', 'refresh1', true, 7)
        tokenStorage.set('acces2', 'refresh2', undefined, undefined)

        expect(tokenStorage.getSessionId()).toBe(7)
    })

    it('remplace l\'identifiant quand le back en renvoie un nouveau', () => {
        tokenStorage.set('acces1', 'refresh1', true, 7)
        tokenStorage.set('acces2', 'refresh2', undefined, 9)

        expect(tokenStorage.getSessionId()).toBe(9)
    })
})

describe('lecture', () => {
    it('cherche d\'abord dans le localStorage', () => {
        localStorage.setItem(ACCESS_KEY, 'depuis-local')
        sessionStorage.setItem(ACCESS_KEY, 'depuis-session')

        expect(tokenStorage.getAccess()).toBe('depuis-local')
    })

    it('se rabat sur le sessionStorage', () => {
        sessionStorage.setItem(REFRESH_KEY, 'depuis-session')

        expect(tokenStorage.getRefresh()).toBe('depuis-session')
    })

    it('rend un nombre et non le texte stocké', () => {
        tokenStorage.set('acces', 'refresh', true, 42)

        expect(tokenStorage.getSessionId()).toBe(42)
    })

    it('rend null plutôt que zéro quand rien n\'est mémorisé', () => {
        expect(tokenStorage.getSessionId()).toBeNull()
    })

    it.each([
        ['getAccess', () => tokenStorage.getAccess()],
        ['getRefresh', () => tokenStorage.getRefresh()]
    ])('%s rend null sur un stockage vide', (_label, read) => {
        expect(read()).toBeNull()
    })
})

describe('clear', () => {
    it('vide les deux supports', () => {
        localStorage.setItem(ACCESS_KEY, 'a')
        localStorage.setItem(REFRESH_KEY, 'r')
        localStorage.setItem(SESSION_ID_KEY, '7')
        sessionStorage.setItem(ACCESS_KEY, 'a')

        tokenStorage.clear()

        expect(localStorage.size).toBe(0)
        expect(sessionStorage.size).toBe(0)
    })
})
