/*
  Stockage des jetons JWT.

  On centralise ici la lecture et l'écriture des jetons partagée par
  l'intercepteur Axios (http.js) et par le store d'authentification (stores/auth.js).
  Ce découplage évite les imports circulaires entre Axios et Pinia.

  Les jetons vivent toujours dans le localStorage partagé par tous les onglets. Un lien
  ouvert depuis un e-mail arrive dans un nouvel onglet : il retrouve ainsi la session.
  Le verrou de http.js (navigator.locks) empêche deux onglets de faire tourner le même
  refresh token en même temps.

  "Se souvenir de moi" décochée : la session doit disparaître à la fermeture du
  navigateur. On pose alors un cookie de session sans date d'expiration que le
  navigateur efface à sa fermeture. À la lecture suivante, si la session était de ce
  type et que le cookie a disparu, les jetons sont effacés avant tout usage.

  Ce cookie ne contient aucun secret : il ne sert que de témoin. Il n'est jamais envoyé
  à l'API qui passe par l'en-tête Authorization.
*/

const ACCESS_KEY = 'butterfly.accessToken'
const REFRESH_KEY = 'butterfly.refreshToken'
const SESSION_ID_KEY = 'butterfly.sessionId'

// Présent quand "Se souvenir de moi" était décochée à la connexion.
const BROWSER_SESSION_ONLY_KEY = 'butterfly.browserSessionOnly'

// Cookie témoin de la session du navigateur.
const BROWSER_SESSION_COOKIE = 'butterfly_browser_session'

function hasBrowserSessionCookie() {
    const cookies = globalThis.document?.cookie ?? ''
    return cookies.split(';').some((cookie) => cookie.trim() === `${BROWSER_SESSION_COOKIE}=1`)
}

function setBrowserSessionCookie() {
    if (!globalThis.document) {
        return
    }
    const secure = globalThis.location?.protocol === 'https:' ? '; Secure' : ''
    // Sans Max-Age ni Expires : cookie de session, effacé à la fermeture du navigateur.
    globalThis.document.cookie = `${BROWSER_SESSION_COOKIE}=1; Path=/; SameSite=Strict${secure}`
}

function clearAll() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(SESSION_ID_KEY)
    localStorage.removeItem(BROWSER_SESSION_ONLY_KEY)
}

/*
  Efface une session "sans se souvenir" dont le navigateur a été fermé depuis.
  Appelé avant chaque lecture : la première lecture après le redémarrage du navigateur
  ne rend donc jamais un jeton qui aurait dû disparaître.
*/
function discardIfBrowserWasClosed() {
    if (localStorage.getItem(BROWSER_SESSION_ONLY_KEY) !== null && !hasBrowserSessionCookie()) {
        clearAll()
    }
}

export const tokenStorage = {
    getAccess() {
        discardIfBrowserWasClosed()
        return localStorage.getItem(ACCESS_KEY)
    },

    getRefresh() {
        discardIfBrowserWasClosed()
        return localStorage.getItem(REFRESH_KEY)
    },

    /**
     * Identifiant de la session courante (celle de cet appareil), utile pour la
     * distinguer dans la liste des sessions actives et pour la préserver lors d'une
     * déconnexion des autres appareils. Renvoie un nombre ou null si absent.
     */
    getSessionId() {
        discardIfBrowserWasClosed()
        const raw = localStorage.getItem(SESSION_ID_KEY)
        return raw === null ? null : Number(raw)
    },

    /**
     * Enregistre le couple de jetons.
     * @param {string} accessToken
     * @param {string} refreshToken
     * @param {boolean|undefined} remember
     *   true : la session survit à la fermeture du navigateur ;
     *   false : la session s'efface à la fermeture du navigateur ;
     *   undefined : on conserve le choix fait à la connexion (cas d'une rotation de refresh).
     * @param {number|undefined} sessionId
     *   identifiant de la session courante, renvoyé par le back à la connexion,
     *   à l'inscription et à chaque rotation de refresh token. S'il est omis,
     *   l'identifiant déjà mémorisé est conservé.
     */
    set(accessToken, refreshToken, remember, sessionId) {
        const browserSessionOnly = remember === undefined
            ? localStorage.getItem(BROWSER_SESSION_ONLY_KEY) !== null
            : !remember
        // Si l'appelant omet le sessionId, on conserve celui déjà
        // mémorisé plutôt que de perdre l'identité de la session courante. Tous les
        // appelants doivent cependant transmettre celui renvoyé par le back, sous peine
        // de garder un identifiant périmé après une rotation.
        const preservedSessionId = sessionId ?? this.getSessionId()
        clearAll()
        localStorage.setItem(ACCESS_KEY, accessToken)
        localStorage.setItem(REFRESH_KEY, refreshToken)
        if (preservedSessionId !== null && preservedSessionId !== undefined) {
            localStorage.setItem(SESSION_ID_KEY, String(preservedSessionId))
        }
        if (browserSessionOnly) {
            localStorage.setItem(BROWSER_SESSION_ONLY_KEY, '1')
            setBrowserSessionCookie()
        }
    },

    /**
     * Efface les jetons. Appelé à la déconnexion ou lorsque le refresh échoue.
     */
    clear() {
        clearAll()
    }
}
