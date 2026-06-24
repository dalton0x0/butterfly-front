import {createRouter, createWebHistory} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {ROLES} from '@/utils/roles'

/*
  Routes de l'application.

  Meta utilisées :
  - layout: 'auth' : pages de connexion / inscription (layout épuré)
  - requiresAuth: true : page accessible uniquement si l'utilisateur est connecté
  - guestOnly: true : page réservée aux visiteurs non connectés
  - roles: [...] : rôles autorisés à accéder à la page

  Le chargement des vues est différé (lazy import) pour alléger le bundle initial.
*/
const routes = [

    // Apprenant (toute personne connectée)
    {
        path: '/',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/blocs',
        name: 'blocks',
        component: () => import('@/views/BlocksView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/blocs/:id',
        name: 'block-detail',
        component: () => import('@/views/BlockDetailView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/modules/:id',
        name: 'module-detail',
        component: () => import('@/views/ModuleDetailView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/cours/:id',
        name: 'course',
        component: () => import('@/views/CourseView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/exercices',
        name: 'exercises',
        component: () => import('@/views/ExercisesView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/exercices/:id',
        name: 'exercise-detail',
        component: () => import('@/views/ExerciseDetailView.vue'),
        meta: {requiresAuth: true}
    },

    // Quiz : liste, historique (chemin statique avant le chemin dynamique), puis passage
    {
        path: '/quiz',
        name: 'quizzes',
        component: () => import('@/views/QuizzesView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/quiz/resultats',
        name: 'quiz-result',
        component: () => import('@/views/QuizResultView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/quiz/:id',
        name: 'quiz',
        component: () => import('@/views/QuizView.vue'),
        meta: {requiresAuth: true}
    },

    {
        path: '/badges',
        name: 'badges',
        component: () => import('@/views/BadgesView.vue'),
        meta: {requiresAuth: true}
    },
    {
        path: '/profil',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: {requiresAuth: true}
    },

    // Formateur (TEACHER ou ADMIN)
    {
        path: '/formateur/contenus',
        alias: '/admin/contenus',
        name: 'content-blocks',
        component: () => import('@/views/ContentBlocksView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/contenus/blocs/:id',
        name: 'content-modules',
        component: () => import('@/views/ContentModulesView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/contenus/modules/:id',
        name: 'content-module',
        component: () => import('@/views/ContentModuleView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/contenus/quiz/:id',
        name: 'content-quiz-questions',
        component: () => import('@/views/ContentQuizQuestionsView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/contenus/modules/:moduleId/cours/nouveau',
        name: 'content-course-new',
        component: () => import('@/views/ContentCourseEditView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/contenus/cours/:id',
        name: 'content-course-edit',
        component: () => import('@/views/ContentCourseEditView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/contenus/modules/:moduleId/exercices/nouveau',
        name: 'content-exercise-new',
        component: () => import('@/views/ContentExerciseEditView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/contenus/exercices/:id',
        name: 'content-exercise-edit',
        component: () => import('@/views/ContentExerciseEditView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/corrections',
        name: 'corrections',
        component: () => import('@/views/CorrectionsView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/apprenants',
        name: 'learners',
        component: () => import('@/views/ApprenantsView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },
    {
        path: '/formateur/apprenants/:id',
        name: 'learner-detail',
        component: () => import('@/views/ApprenantDetailView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.TEACHER, ROLES.ADMIN]}
    },

    // Admin
    {
        path: '/admin/utilisateurs',
        name: 'users',
        component: () => import('@/views/UsersView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.ADMIN]}
    },
    {
        path: '/admin/utilisateurs/nouveau',
        name: 'user-create',
        component: () => import('@/views/UserCreateView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.ADMIN]}
    },
    {
        path: '/admin/utilisateurs/:id',
        name: 'user-detail',
        component: () => import('@/views/UserDetailView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.ADMIN]}
    },
    {
        path: '/admin/promotions',
        name: 'promotions',
        component: () => import('@/views/PromotionsView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.ADMIN]}
    },
    {
        path: '/admin/badges',
        name: 'admin-badges',
        component: () => import('@/views/BadgesAdminView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.ADMIN]}
    },

    // Authentification
    {
        path: '/connexion',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: {layout: 'auth', guestOnly: true}
    },
    {
        path: '/inscription',
        name: 'register',
        component: () => import('@/views/RegisterView.vue'),
        meta: {layout: 'auth', guestOnly: true}
    },

    // Redirections pour les liens de la navbar formateur/admin
    {
        path: '/formateur',
        redirect: '/formateur/corrections'
    },
    {
        path: '/admin',
        name: 'admin-dashboard',
        component: () => import('@/views/AdminDashboardView.vue'),
        meta: {requiresAuth: true, roles: [ROLES.ADMIN]}
    },

    // 404
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior() {
        return {top: 0}
    }
})

/*
  Garde de navigation globale.

  1. Restaure la session au premier passage (utile après un rechargement de page).
  2. Empêche un visiteur connecté de revenir sur les pages de connexion/inscription.
  3. Renvoie vers la connexion toute tentative d'accès à une page protégée sans session.
  4. Bloque l'accès aux pages dont le rôle requis n'est pas détenu.
  5. Redirige le staff hors du tableau de bord apprenant vers son propre espace.
*/
router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (!auth.initialized) {
        await auth.init()
    }

    // Pages réservées aux visiteurs : on renvoie l'utilisateur connecté à l'accueil.
    if (to.meta.guestOnly && auth.isAuthenticated) {
        return {name: 'dashboard'}
    }

    // Pages protégées : connexion obligatoire avec mémorisation de la destination.
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        return {name: 'login', query: {redirect: to.fullPath}}
    }

    // Contrôle de rôle : si la route exige des rôles précis, on les vérifie.
    if (to.meta.roles && !to.meta.roles.includes(auth.role)) {
        return {name: 'dashboard'}
    }

    // Le tableau de bord '/' est l'espace apprenant : le staff est redirigé vers le sien.
    if (to.name === 'dashboard' && auth.isAuthenticated) {
        if (auth.isTeacher) {
            return {name: 'corrections'}
        }
        if (auth.isAdmin) {
            return '/admin'
        }
    }

    return true
})

export default router
