<script setup>
// Navbar horizontale, identique sur toutes les pages (sauf authentification).
import {computed, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import Icon from './Icon.vue'
import Avatar from './Avatar.vue'
import config from "../utils/config.js";

const auth = useAuthStore()
const router = useRouter()

const homeLink = computed(() => {
  if (auth.isAdmin) {
    return '/admin'
  }
  if (auth.isTeacher) {
    return '/formateur'
  }
  return '/'
})

const menuOpen = ref(false)
const userMenuOpen = ref(false)
const searchOpen = ref(false)
const searchInput = ref(null)

const links = computed(() => {
  if (auth.isAdmin) {
    return [
      {label: 'Tableau de bord', to: '/admin', icon: 'dashboard'},
      {label: 'Utilisateurs', to: '/admin/utilisateurs', icon: 'group'},
      {label: 'Promotions', to: '/admin/promotions', icon: 'school'},
      {label: 'Contenus', to: '/admin/contenus', icon: 'category'},
      {label: 'Badges', to: '/admin/badges', icon: 'military_tech'}
    ]
  }
  if (auth.isTeacher) {
    return [
      {label: 'Contenus', to: '/formateur/contenus', icon: 'category'},
      {label: 'Corrections', to: '/formateur/corrections', icon: 'rate_review'},
      {label: 'Apprenants', to: '/formateur/apprenants', icon: 'group'}
    ]
  }
  return [
    {label: 'Tableau de bord', to: '/', icon: 'dashboard'},
    {label: 'Mes blocs', to: '/blocs', icon: 'view_module'},
    {label: 'Mes exercices', to: '/exercices', icon: 'terminal'},
    {label: 'Mes quiz', to: '/quiz', icon: 'quiz'},
    //{ label: 'Mes badges', to: '/badges', icon: 'military_tech' }
  ]
})

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    requestAnimationFrame(() => searchInput.value && searchInput.value.focus())
  }
}

async function logout() {
  userMenuOpen.value = false
  await auth.logout()
  router.push('/connexion')
}
</script>

<template>
  <header class="fixed top-0 left-0 w-full z-50 bg-primary-dark shadow-sm h-16">
    <div class="flex items-center justify-between px-6 max-w-[1200px] mx-auto w-full h-full">
      <RouterLink :to="homeLink" class="flex items-center gap-2 text-white font-bold text-[17px] tracking-tight">
        <Icon name="verified" filled/>
        {{ config.appName }}
      </RouterLink>

      <!-- Liens (desktop) -->
      <nav class="hidden md:flex items-center gap-6 h-full">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link text-white/80 hover:text-white text-sm h-full flex items-center gap-1.5 transition-colors"
        >
          <Icon :name="link.icon" :size="20"/>
          {{ link.label }}
        </RouterLink>
      </nav>

      <!-- Actions à droite -->
      <div class="flex items-center gap-2">
        <!-- Recherche dépliable -->
        <div class="hidden sm:flex items-center">
          <transition name="search">
            <div
              v-if="searchOpen"
              class="flex items-center gap-2 h-9 px-3 mr-1 rounded-full bg-white/15 backdrop-blur-sm"
            >
              <Icon name="search" :size="20" class="text-white/80"/>
              <input
                ref="searchInput"
                type="text"
                placeholder="Rechercher..."
                class="bg-transparent outline-none text-sm text-white placeholder:text-white/60 w-44"
                @keyup.esc="searchOpen = false"
              />
              <button class="text-white/70 hover:text-white" @click="searchOpen = false">
                <Icon name="close" :size="18"/>
              </button>
            </div>
          </transition>
          <button
            v-if="!searchOpen"
            class="text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Rechercher"
            @click="toggleSearch"
          >
            <Icon name="search" :size="22"/>
          </button>
        </div>

        <button class="text-white p-2 rounded-full hover:bg-white/10 transition-colors hidden sm:block"
                aria-label="Notifications">
          <Icon name="notifications" :size="22"/>
        </button>

        <!-- Menu utilisateur -->
        <div class="relative">
          <button
            class="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-white/10 transition-colors text-white ml-1"
            aria-label="Menu utilisateur"
            @click="userMenuOpen = !userMenuOpen"
          >
            <span class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-white/30">
              <Avatar :src="auth.user?.avatar" :name="auth.fullName" :size="32"/>
            </span>
            <Icon name="expand_more" :size="18" class="hidden sm:block transition-transform"
                  :class="{ 'rotate-180': userMenuOpen }"/>
          </button>

          <!-- Dropdown -->
          <transition name="dropdown">
            <div
              v-if="userMenuOpen"
              class="absolute right-0 mt-2 w-60 bg-surface rounded-2xl shadow-lg border border-line overflow-hidden z-50"
            >
              <!-- En-tete -->
              <div class="px-4 py-3 border-b border-line-soft flex items-center gap-3">
                <Avatar :src="auth.user?.avatar" :name="auth.fullName" :size="40"/>
                <div class="min-w-0">
                  <p class="text-[15px] font-semibold text-ink truncate">{{ auth.fullName }}</p>
                  <p class="text-[13px] text-muted truncate">{{ auth.user?.email }}</p>
                </div>
              </div>
              <!-- Liens -->
              <RouterLink
                to="/profil"
                class="flex items-center gap-3 px-4 py-2.5 text-[14px] text-ink hover:bg-surface-tint transition-colors"
                @click="userMenuOpen = false"
              >
                <Icon name="person" :size="20" class="text-muted"/>
                Mon profil
              </RouterLink>
              <RouterLink
                v-if="!auth.isTeacher && !auth.isAdmin"
                to="/badges"
                class="flex items-center gap-3 px-4 py-2.5 text-[14px] text-ink hover:bg-surface-tint transition-colors"
                @click="userMenuOpen = false"
              >
                <Icon name="military_tech" :size="20" class="text-muted"/>
                Mes badges
              </RouterLink>
              <div class="border-t border-line-soft">
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#ba1a1a] hover:bg-[#ba1a1a]/8 transition-colors"
                  @click="logout"
                >
                  <Icon name="logout" :size="20"/>
                  Déconnexion
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Bouton menu mobile -->
        <button class="md:hidden text-white p-2" aria-label="Menu" @click="menuOpen = !menuOpen">
          <Icon :name="menuOpen ? 'close' : 'menu'"/>
        </button>
      </div>
    </div>

    <!-- Menu mobile déroulant -->
    <nav v-if="menuOpen" class="md:hidden bg-primary-dark border-t border-white/10 px-6 py-3 flex flex-col gap-1">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav-link text-white/80 hover:text-white text-sm py-2 flex items-center gap-2"
        @click="menuOpen = false"
      >
        <Icon :name="link.icon" :size="20"/>
        {{ link.label }}
      </RouterLink>
    </nav>
  </header>

  <!-- Couche transparente : ferme les menus au clic extérieur -->
  <div
    v-if="userMenuOpen || searchOpen"
    class="fixed inset-0 z-40"
    @click="userMenuOpen = false; searchOpen = false"
  ></div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.search-enter-active,
.search-leave-active {
  transition: opacity 0.2s ease, width 0.2s ease;
}

.search-enter-from,
.search-leave-to {
  opacity: 0;
}
</style>
