import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {tokenStorage} from '@/services/tokenStorage.js'

/*
  Le module lit localStorage et document.cookie comme des variables globales au
  moment de l'appel et non à l'import. Des implantations en mémoire suffisent
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

// Imite document.cookie : l'écriture ajoute un cookie, la lecture les rend tous.
function createDocument() {
    const cookies = new Map()
    return {
        get cookie() {
            return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
        },
        set cookie(text) {
            const [name, value] = text.split(';')[0].split('=')
            cookies.set(name.trim(), value)
        }
    }
}

// Simule la fermeture puis la réouverture du navigateur : les cookies de session disparaissent.
function restartBrowser() {
    globalThis.document = createDocument()
}

const ACCESS_KEY = 'butterfly.accessToken'
const REFRESH_KEY = 'butterfly.refreshToken'
const SESSION_ID_KEY = 'butterfly.sessionId'

beforeEach(() => {
    globalThis.localStorage = createStorage()
    globalThis.document = createDocument()
})

afterEach(() => {
    delete globalThis.document
})

describe('"Se souvenir de moi" cochée', () => {
    it('écrit les jetons dans le localStorage sans cookie témoin', () => {
        tokenStorage.set('acces', 'refresh', true, 7)

        expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh')
        expect(document.cookie).toBe('')
    })

    it('garde la session après la fermeture du navigateur', () => {
        tokenStorage.set('acces', 'refresh', true, 7)
        restartBrowser()

        expect(tokenStorage.getRefresh()).toBe('refresh')
    })
})

describe('"Se souvenir de moi" décochée', () => {
    it('écrit aussi les jetons dans le localStorage, partagé entre onglets', () => {
        tokenStorage.set('acces', 'refresh', false, 7)

        expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh')
        expect(document.cookie).toContain('butterfly_browser_session=1')
    })

    it('garde la session tant que le navigateur reste ouvert', () => {
        tokenStorage.set('acces', 'refresh', false, 7)

        expect(tokenStorage.getAccess()).toBe('acces')
    })

    it('efface la session après la fermeture du navigateur', () => {
        tokenStorage.set('acces', 'refresh', false, 7)
        restartBrowser()

        expect(tokenStorage.getAccess()).toBeNull()
        expect(tokenStorage.getRefresh()).toBeNull()
        expect(tokenStorage.getSessionId()).toBeNull()
        expect(localStorage.size).toBe(0)
    })

    it('ne garde pas le mode précédent quand on se reconnecte en cochant la case', () => {
        tokenStorage.set('acces1', 'refresh1', false, 7)
        tokenStorage.set('acces2', 'refresh2', true, 8)
        restartBrowser()

        expect(tokenStorage.getRefresh()).toBe('refresh2')
    })
})

describe('rotation du refresh token', () => {
    it('conserve le mode "sans se souvenir" choisi à la connexion', () => {
        tokenStorage.set('acces1', 'refresh1', false, 7)
        tokenStorage.set('acces2', 'refresh2', undefined, 7)
        restartBrowser()

        expect(tokenStorage.getAccess()).toBeNull()
    })

    it('conserve le mode "se souvenir" choisi à la connexion', () => {
        tokenStorage.set('acces1', 'refresh1', true, 7)
        tokenStorage.set('acces2', 'refresh2', undefined, 7)
        restartBrowser()

        expect(tokenStorage.getAccess()).toBe('acces2')
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
    it('vide le stockage, y compris le mode de session', () => {
        tokenStorage.set('acces', 'refresh', false, 7)
        localStorage.setItem(SESSION_ID_KEY, '7')

        tokenStorage.clear()

        expect(localStorage.size).toBe(0)
        expect(localStorage.getItem(ACCESS_KEY)).toBeNull()
    })
})
