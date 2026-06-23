/*
  Stockage des jetons JWT.

  On centralise ici la lecture et l'écriture des jetons partagée par
  l'intercepteur Axios (http.js) et par le store d'authentification (stores/auth.js).
  Ce découplage évite les imports circulaires entre Axios et Pinia.

  Persistance selon "Se souvenir de moi" :
  - cochée : localStorage (la session survit à la fermeture du navigateur) ;
  - décochée : sessionStorage (la session est effacée à la fermeture de l'onglet).

  Les jetons ne vivent que dans un seul des deux supports à la fois. La lecture
  cherche d'abord dans le localStorage, puis dans le sessionStorage.
*/

const ACCESS_KEY = 'infradev.accessToken'
const REFRESH_KEY = 'infradev.refreshToken'

// Détermine le support où vivent actuellement les jetons (utile lors d'un
// refresh, où le choix initial "Se souvenir de moi" doit être conservé).
function currentStore() {
    return sessionStorage.getItem(REFRESH_KEY) !== null ? sessionStorage : localStorage
}

// Efface les jetons des deux supports pour éviter tout doublon.
function clearBoth() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    sessionStorage.removeItem(ACCESS_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
}

export const tokenStorage = {
    getAccess() {
        return localStorage.getItem(ACCESS_KEY) ?? sessionStorage.getItem(ACCESS_KEY)
    },

    getRefresh() {
        return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY)
    },

    /**
     * Enregistre le couple de jetons.
     * @param {string} accessToken
     * @param {string} refreshToken
     * @param {boolean|undefined} remember
     *   true : persistance longue (localStorage) ;
     *   false : persistance de session (sessionStorage) ;
     *   undefined : on conserve le support actuel (cas d'une rotation de refresh).
     */
    set(accessToken, refreshToken, remember) {
        let store
        if (remember === undefined) {
            store = currentStore()
        } else {
            store = remember ? localStorage : sessionStorage
        }
        clearBoth()
        store.setItem(ACCESS_KEY, accessToken)
        store.setItem(REFRESH_KEY, refreshToken)
    },

    /**
     * Efface les jetons. Appelé à la déconnexion ou lorsque le refresh échoue.
     */
    clear() {
        clearBoth()
    }
}
