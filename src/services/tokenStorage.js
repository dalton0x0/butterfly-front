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

  Limite connue du mode sessionStorage : « Dupliquer l'onglet » copie le stockage dans
  le nouvel onglet. Les deux onglets détiennent alors le même refresh token dans deux
  stockages séparés. Le verrou de http.js les empêche de rafraîchir en même temps, mais
  le second ne voit pas le jeton renouvelé par le premier : son rafraîchissement présente
  un jeton déjà consommé que le serveur traite comme une réutilisation en fermant toutes
  les sessions. Le cas est rare et sans risque pour la sécurité, il est donc accepté.
*/

const ACCESS_KEY = 'butterfly.accessToken'
const REFRESH_KEY = 'butterfly.refreshToken'
const SESSION_ID_KEY = 'butterfly.sessionId'

// Détermine le support où vivent actuellement les jetons (utile lors d'un
// refresh, où le choix initial "Se souvenir de moi" doit être conservé).
function currentStore() {
    return sessionStorage.getItem(REFRESH_KEY) !== null ? sessionStorage : localStorage
}

// Efface les jetons des deux supports pour éviter tout doublon.
function clearBoth() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(SESSION_ID_KEY)
    sessionStorage.removeItem(ACCESS_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
    sessionStorage.removeItem(SESSION_ID_KEY)
}

export const tokenStorage = {
    getAccess() {
        return localStorage.getItem(ACCESS_KEY) ?? sessionStorage.getItem(ACCESS_KEY)
    },

    getRefresh() {
        return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY)
    },

    /**
     * Identifiant de la session courante (celle de cet appareil), utile pour la
     * distinguer dans la liste des sessions actives et pour la préserver lors d'une
     * déconnexion des autres appareils. Renvoie un nombre ou null si absent.
     */
    getSessionId() {
        const raw = localStorage.getItem(SESSION_ID_KEY) ?? sessionStorage.getItem(SESSION_ID_KEY)
        return raw === null ? null : Number(raw)
    },

    /**
     * Enregistre le couple de jetons.
     * @param {string} accessToken
     * @param {string} refreshToken
     * @param {boolean|undefined} remember
     *   true : persistance longue (localStorage) ;
     *   false : persistance de session (sessionStorage) ;
     *   undefined : on conserve le support actuel (cas d'une rotation de refresh).
     * @param {number|undefined} sessionId
     *   identifiant de la session courante, renvoyé par le back à la connexion,
     *   à l'inscription et à chaque rotation de refresh token. S'il est omis,
     *   l'identifiant déjà mémorisé est conservé.
     */
    set(accessToken, refreshToken, remember, sessionId) {
        let store
        if (remember === undefined) {
            store = currentStore()
        } else {
            store = remember ? localStorage : sessionStorage
        }
        // Si l'appelant omet le sessionId, on conserve celui déjà
        // mémorisé plutôt que de perdre l'identité de la session courante. Tous les
        // appelants doivent cependant transmettre celui renvoyé par le back, sous peine
        // de garder un identifiant périmé après une rotation.
        const preservedSessionId = sessionId ?? this.getSessionId()
        clearBoth()
        store.setItem(ACCESS_KEY, accessToken)
        store.setItem(REFRESH_KEY, refreshToken)
        if (preservedSessionId !== null && preservedSessionId !== undefined) {
            store.setItem(SESSION_ID_KEY, String(preservedSessionId))
        }
    },

    /**
     * Efface les jetons. Appelé à la déconnexion ou lorsque le refresh échoue.
     */
    clear() {
        clearBoth()
    }
}
