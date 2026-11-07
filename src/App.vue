<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import {useAuthStore} from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

// On choisit le layout en fonction de la meta "layout" définie sur chaque route.
// Une page publique vue par un visiteur (la 404) prend aussi le layout épuré : le layout
// par défaut affiche la navigation et le menu d'un utilisateur connecté.
// Le garde du routeur restaure la session avant tout affichage : isAuthenticated est
// donc déjà fiable ici.
const layout = computed(() => {
  const isPublicPageForVisitor = !route.meta.requiresAuth && !auth.isAuthenticated
  return route.meta.layout === 'auth' || isPublicPageForVisitor ? AuthLayout : DefaultLayout
})
</script>

<template>
  <component :is="layout">
    <!--
      La clé sur le chemin force un nouveau composant à chaque changement d'adresse.
      Sans elle, Vue Router réutilise l'instance quand seul un paramètre change :
      passer de /cours/1 à /cours/2 laissait le premier cours affiché, onMounted
      ne se déclenchant qu'une fois. Le chemin et non l'adresse complète : un simple
      changement de filtre dans la chaîne de requête ne recharge pas la page.
    -->
    <RouterView v-slot="{ Component, route: current }">
      <component :is="Component" :key="current.path"/>
    </RouterView>
  </component>
</template>
