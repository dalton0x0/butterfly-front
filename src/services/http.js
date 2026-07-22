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
import {tokenStorage} from './tokenStorage'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

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

function flushQueue(error, token = null) {
    pendingQueue.forEach((promise) => {
        if (error) {
            promise.reject(error)
        } else {
            promise.resolve(token)
        }
    })
    pendingQueue = []
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
            return Promise.reject(normalizeError(error))
        }

        // Un refresh est déjà en cours : on patiente puis on rejoue la requête.
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingQueue.push({resolve, reject})
            }).then((newToken) => {
                original._retry = true
                original.headers.Authorization = `Bearer ${newToken}`
                return http(original)
            })
        }

        original._retry = true
        isRefreshing = true

        try {
            const {data: envelope} = await refreshClient.post('/auth/refresh', {refreshToken})
            const payload = envelope.data

            // Rotation : on enregistre bien le nouveau couple (access + refresh).
            tokenStorage.set(payload.accessToken, payload.refreshToken)

            flushQueue(null, payload.accessToken)
            original.headers.Authorization = `Bearer ${payload.accessToken}`
            return http(original)
        } catch (refreshError) {
            // Le refresh a échoué : la session est définitivement expirée.
            flushQueue(refreshError, null)
            tokenStorage.clear()
            // Redirection vers la page de connexion (rechargement complet volontaire
            // pour repartir d'un état propre). Le motif transmis dans l'URL permet à la
            // vue de connexion d'expliquer la situation : session expirée naturellement
            // ou révoquée par mesure de sécurité (rotation, détection de réutilisation).
            if (window.location.pathname !== '/connexion') {
                window.location.href = '/connexion?motif=session-invalide'
            }
            return Promise.reject(normalizeError(refreshError))
        } finally {
            isRefreshing = false
        }
    }
)

/**
 * Normalise une erreur Axios en un objet simple et prévisible pour l'UI.
 * Récupère le message et les erreurs de validation renvoyés par le back
 * (ErrorResponse) avec un repli générique.
 */
function normalizeError(error) {
    const body = error.response?.data
    return {
        status: error.response?.status ?? 0,
        message: body?.message || 'Une erreur est survenue. Veuillez réessayer.',
        validationErrors: body?.validationErrors || null,
        raw: error
    }
}

export default http
