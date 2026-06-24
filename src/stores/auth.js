import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import {ROLES} from '@/utils/roles'
import {authService} from '@/services/authService'
import {tokenStorage} from '@/services/tokenStorage'

/*
  Store d'authentification connecté au back.

  Responsabilités :
  - déclencher la connexion / l'inscription / la déconnexion ;
  - conserver le profil de l'utilisateur courant (pour la navbar, les gardes
    de route et l'affichage) ;
  - restaurer la session au rechargement de la page à partir du refresh token
    persisté par tokenStorage.

  Les jetons eux-mêmes vivent dans tokenStorage : ils sont lus par l'intercepteur
  Axios à chaque requête. Le store lui, garde surtout le profil utilisateur
  pour la réactivité de l'interface.
*/
export const useAuthStore = defineStore('auth', () => {
    // Profil de l'utilisateur connecté (null tant qu'on n'est pas authentifié).
    const user = ref(null)

    // Indique si la tentative de restauration de session a déjà eu lieu.
    const initialized = ref(false)

    // État de chargement pour désactiver les boutons des formulaires.
    const loading = ref(false)

    // Getters
    const isAuthenticated = computed(() => user.value !== null)
    const role = computed(() => user.value?.role ?? null)
    const isAdmin = computed(() => role.value === ROLES.ADMIN)
    const isTeacher = computed(() => role.value === ROLES.TEACHER)
    const fullName = computed(() =>
        user.value ? `${user.value.firstName} ${user.value.lastName}` : ''
    )

    // Helpers de mapping
    // AuthResponse ne porte pas l'id, l'avatar ni la promotion (profil minimal).
    function mapAuthResponse(auth) {
        return {
            firstName: auth.firstName,
            lastName: auth.lastName,
            email: auth.email,
            role: auth.role
        }
    }

    // UserResponse (profil complet renvoyé par GET /api/profile).
    function mapUser(userResponse) {
        return {
            id: userResponse.id,
            firstName: userResponse.firstName,
            lastName: userResponse.lastName,
            email: userResponse.email,
            role: userResponse.role,
            avatar: userResponse.avatar,
            enabled: userResponse.enabled,
            promotionId: userResponse.promotionId,
            promotionName: userResponse.promotionName,
            promotion: userResponse.promotionName,
            lastLogin: userResponse.lastLogin,
            createdAt: userResponse.createdAt
        }
    }

    // Enregistre les jetons (selon le choix "Se souvenir de moi") puis
    // charge le profil complet.
    async function establishSession(authResponse, remember = true) {
        tokenStorage.set(authResponse.accessToken, authResponse.refreshToken, remember)
        // Profil minimal immédiat au cas où l'appel profil échouerait.
        user.value = mapAuthResponse(authResponse)
        try {
            user.value = mapUser(await authService.fetchProfile())
        } catch {
            // On garde le profil minimal : la session reste valide.
        }
        initialized.value = true
    }

    // Actions

    /**
     * Connecte l'utilisateur à partir de son email et de son mot de passe.
     * @param credentials { email, password }
     * @param remember conserve la session après fermeture du navigateur si true.
     * L'éventuelle erreur est propagée pour être affichée par la vue.
     */
    async function login(credentials, remember = true) {
        loading.value = true
        try {
            const authResponse = await authService.login(credentials)
            await establishSession(authResponse, remember)
            return user.value
        } finally {
            loading.value = false
        }
    }

    /**
     * Inscrit puis connecte l'utilisateur (le back renvoie directement les jetons).
     * On garde la session par défaut après une inscription réussie.
     */
    async function register(payload) {
        loading.value = true
        try {
            const authResponse = await authService.register(payload)
            await establishSession(authResponse, true)
            return user.value
        } finally {
            loading.value = false
        }
    }

    /**
     * Déconnecte l'utilisateur : révoque le refresh token côté back puis nettoie
     * l'état local. La déconnexion locale aboutit même si l'appel réseau échoue.
     */
    async function logout() {
        const refreshToken = tokenStorage.getRefresh()
        try {
            if (refreshToken) {
                await authService.logout(refreshToken)
            }
        } catch {
            // On nettoie quand même la session locale.
        } finally {
            tokenStorage.clear()
            user.value = null
        }
    }

    /**
     * Restaure la session au démarrage de l'application ou au rechargement.
     * Si un refresh token est présent, on recharge le profil.
     * En cas d'échec, on nettoie la session.
     */
    async function init() {
        if (initialized.value) {
            return
        }
        const refreshToken = tokenStorage.getRefresh()
        if (refreshToken) {
            try {
                user.value = mapUser(await authService.fetchProfile())
            } catch {
                tokenStorage.clear()
                user.value = null
            }
        }
        initialized.value = true
    }

    /**
     * Met à jour le profil courant en mémoire à partir d'un UserResponse.
     * Appelé après une modification réussie du profil pour rafraîchir aussitôt
     * la navbar et les écrans qui dépendent de l'utilisateur.
     */
    function setProfile(userResponse) {
        user.value = mapUser(userResponse)
    }

    /**
     * Vide les jetons locaux sans appeler le back ni effacer le profil affiché.
     * Utilisé après un changement de mot de passe : le serveur vient de révoquer
     * toutes les sessions, on cesse donc immédiatement d'utiliser celle-ci côté
     * client (un rechargement de page renverra alors vers la connexion), tout en
     * laissant l'écran courant intact jusqu'à ce que l'utilisateur se reconnecte.
     */
    function clearTokens() {
        tokenStorage.clear()
    }

    return {
        user,
        initialized,
        loading,
        isAuthenticated,
        role,
        isAdmin,
        isTeacher,
        fullName,
        login,
        register,
        logout,
        init,
        setProfile,
        clearTokens
    }
})
