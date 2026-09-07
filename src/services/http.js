/*
  Client HTTP central de l'application.

  Toutes les requêtes métier passent par cette instance Axios.
  Elle prend en charge trois responsabilités transverses une seule fois pour toute l'appli :

  1. Ajouter automatiquement l'en-tête "Authorization: Bearer <accessToken>".
  2. Déballer l'enveloppe ApiResponse renvoyée par le back
     ({ success, message, data, timestamp }) afin que les services manipulent
     directement l'objet utile.
  3. Gérer l'expiration du jeton : sur une réponse 401, tenter un refresh puis
     rejouer la requête d'origine. Le back applique une rotation du refresh token
     donc on remplace bien le couple complet.
*/

import axios from 'axios'
import {ApiError} from './apiError'
import {tokenStorage} from './tokenStorage'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// Sans VITE_API_URL, le build produit une application qui interroge le poste de
// chaque visiteur. L'erreur ne se voit qu'une fois déployée, d'où cet avertissement
// au chargement du module.
if (!import.meta.env.VITE_API_URL) {
    console.warn(`[http] VITE_API_URL absente au build, repli sur ${baseURL}`)
}

// Instance principale utilisée par tous les services métier.
const http = axios.create({
    baseURL,
    headers: {'Content-Type': 'application/json'}
})

// Instance nue sans intercepteur dédiée uniquement à l'appel de refresh.
// Elle évite que le refresh déclenche lui-même la logique de refresh (récursion).
const refreshClient = axios.create({baseURL})

// Intercepteur de requête : injection du jeton d'accès
http.interceptors.request.use((config) => {
    const accessToken = tokenStorage.getAccess()
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    // Envoi de fichier : on retire le Content-Type application/json par défaut pour
    // laisser le navigateur poser lui-même le multipart/form-data avec sa frontière
    // (boundary). Sans cela, la requête multipart est cassée et aucun fichier n'est
    // reçu côté serveur.
    if (config.data instanceof FormData) {
        if (typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type')
        } else {
            delete config.headers['Content-Type']
        }
    }
    return config
})

// Les endpoints d'authentification ne déclenchent jamais de refresh : un 401 y est
// une réponse définitive (identifiants invalides, jeton révoqué), pas le signe d'un
// access token expiré. Sans cette exclusion, un logout présentant un jeton déjà révoqué
// relancerait un refresh avec ce même jeton, que le back interpréterait comme un rejeu
// (détection de réutilisation) et sanctionnerait en révoquant toutes les sessions.
function isAuthEndpoint(config) {
    return typeof config?.url === 'string' && config.url.startsWith('/auth/')
}

// File d'attente pendant un refresh en cours
// Si plusieurs requêtes tombent en 401 en même temps, on ne lance qu'un seul
// refresh. Les autres attendent ici puis sont rejouées avec le nouveau jeton.
let isRefreshing = false
let pendingQueue = []

function flushQueue(error) {
    pendingQueue.forEach((promise) => {
        if (error) {
            promise.reject(error)
        } else {
            promise.resolve()
        }
    })
    pendingQueue = []
}

// Nom du verrou partagé par tous les onglets de la même origine.
const REFRESH_LOCK = 'butterfly.token-refresh'

/**
 * Exécute une opération en exclusion mutuelle entre les onglets ouverts.
 *
 * isRefreshing ne protège que l'onglet courant. Sans verrou partagé, deux onglets
 * dont le jeton d'accès expire en même temps appellent /auth/refresh avec le même
 * refresh token. La rotation côté back invalide le premier jeton, le second onglet
 * présente donc un jeton déjà consommé, le back y voit une réutilisation et révoque
 * toutes les sessions. L'utilisateur est déconnecté partout sans avoir rien fait.
 *
 * L'API Web Locks n'existe pas sur les navigateurs anciens. On exécute alors
 * l'opération sans verrou : la protection dans l'onglet reste active et le
 * comportement redevient celui d'avant.
 */
function withRefreshLock(operation) {
    if (typeof navigator !== 'undefined' && navigator.locks) {
        return navigator.locks.request(REFRESH_LOCK, operation)
    }
    return operation()
}

/**
 * Renouvelle le couple de jetons et le range dans tokenStorage.
 *
 * @param {string} previousRefreshToken jeton lu avant l'attente du verrou
 */
async function refreshTokens(previousRefreshToken) {
    const currentRefreshToken = tokenStorage.getRefresh()

    // Un autre onglet a pu faire tourner le jeton pendant l'attente du verrou.
    // Le travail est déjà fait, refaire l'appel déclencherait la détection de
    // réutilisation que ce verrou sert précisément à éviter.
    if (currentRefreshToken && currentRefreshToken !== previousRefreshToken) {
        return
    }

    // Un autre onglet a échoué et nettoyé le stockage : la session est perdue.
    if (!currentRefreshToken) {
        throw new ApiError({
            status: 401,
            message: 'Votre session a expiré. Veuillez vous reconnecter.'
        })
    }

    const {data: envelope} = await refreshClient.post('/auth/refresh', {
        refreshToken: currentRefreshToken
    })
    const payload = envelope.data

    // Rotation : on enregistre le nouveau couple (access + refresh) ainsi que le
    // nouvel identifiant de session. La rotation révoque l'ancien refresh token et
    // en crée un nouveau : l'identifiant renvoyé ici remplace donc le précédent,
    // qui ne correspond plus à aucune session active. Sans cette mise à jour, la
    // vue profil cesse de reconnaître l'appareil courant après le premier refresh,
    // et la déconnexion des autres appareils révoque aussi la session en cours.
    tokenStorage.set(
        payload.accessToken,
        payload.refreshToken,
        undefined,
        payload.sessionId
    )
}

/**
 * Renvoie l'utilisateur vers la connexion en conservant la page en cours, pour l'y
 * ramener une fois reconnecté. Le rechargement complet est volontaire : il repart
 * d'un état applicatif propre.
 */
function redirectToLogin() {
    if (window.location.pathname === '/connexion') {
        return
    }
    const target = window.location.pathname + window.location.search
    const params = new URLSearchParams({motif: 'session-invalide', redirect: target})
    window.location.href = `/connexion?${params}`
}

// Intercepteur de réponse : déballage + refresh sur 401
http.interceptors.response.use(
    // Cas nominal : on renvoie l'enveloppe ApiResponse complète.
    // Les services pourront lire envelope.data et envelope.message.
    (response) => response.data,

    async (error) => {
        const original = error.config
        const status = error.response?.status

        // On ne tente un refresh que sur un 401 une seule fois par requête,
        // seulement si on dispose encore d'un refresh token, et jamais pour les
        // endpoints d'authentification eux-mêmes.
        const refreshToken = tokenStorage.getRefresh()
        if (status !== 401 || original?._retry || !refreshToken || isAuthEndpoint(original)) {
            // throw plutôt que Promise.reject : dans une fonction async, la valeur levée
            // est déjà enveloppée dans une promesse rejetée. Le résultat est identique
            // pour l'appelant, avec une intention plus lisible.
            // L'await est nécessaire depuis que normalizeError lit les corps binaires.
            throw await normalizeError(error)
        }

        // Un refresh est déjà en cours dans cet onglet : on patiente puis on rejoue
        // la requête. Le jeton n'est pas transmis ici, l'intercepteur de requête le
        // relit dans tokenStorage au moment du rejeu.
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingQueue.push({resolve, reject})
            }).then(() => {
                original._retry = true
                original.headers.Authorization = `Bearer ${newToken}`
                return http(original)
            })
        }

        original._retry = true
        isRefreshing = true

        try {
            await withRefreshLock(() => refreshTokens(refreshToken))
            flushQueue(null)
            return http(original)
        } catch (refreshError) {
            // Le refresh a échoué : la session est définitivement expirée.
            // L'erreur est normalisée avant d'être diffusée pour que les requêtes mises
            // en attente reçoivent un ApiError, comme toutes les autres, et non l'erreur
            // brute d'Axios que leur code appelant ne sait pas lire.
            const normalized = refreshError instanceof ApiError
                ? refreshError
                : await normalizeError(refreshError)
            flushQueue(normalized)
            tokenStorage.clear()
            // Le motif transmis dans l'URL permet à la vue de connexion d'expliquer la
            // situation : session expirée naturellement ou révoquée par mesure de
            // sécurité (rotation, détection de réutilisation).
            redirectToLogin()
            throw normalized
        } finally {
            isRefreshing = false
        }
    }
)

/**
 * Normalise une erreur Axios en {@link ApiError}, forme unique et prévisible pour l'UI.
 * Récupère le message et les erreurs de validation renvoyés par le back
 * (ErrorResponse) avec un repli générique.
 */
async function normalizeError(error) {
    const body = await readErrorBody(error)
    return new ApiError({
        status: error.response?.status ?? 0,
        message: body?.message || 'Une erreur est survenue. Veuillez réessayer.',
        validationErrors: body?.validationErrors || null,
        cause: error
    })
}

/**
 * Extrait le corps d'erreur du back quel que soit le type de réponse demandé.
 *
 * Sur un téléchargement, la requête porte responseType 'blob' : Axios applique ce type
 * à la réponse d'erreur aussi, alors que le back y renvoie du JSON. Sans cette lecture,
 * le corps reste un Blob, message et validationErrors valent undefined et l'utilisateur
 * reçoit le message générique à la place de la vraie cause (403, 404).
 *
 * Un Blob illisible ou non JSON n'est pas une erreur : on rend null et l'appelant
 * retombe sur le message générique.
 */
async function readErrorBody(error) {
    const data = error.response?.data
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
        try {
            return JSON.parse(await data.text())
        } catch {
            return null
        }
    }
    return data
}

export default http
