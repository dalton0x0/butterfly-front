<script setup>
// Espace admin : tableau de bord. Indicateurs et derniers inscrits.
//
// Chaque indicateur est un comptage serveur et non un décompte de la liste reçue.
// La version précédente demandait une page d'utilisateurs puis filtrait dessus :
// au delà de vingt comptes, toutes les cartes mentaient sans le moindre signal et
// les "derniers inscrits" étaient en réalité les premiers par ordre alphabétique.
import {computed, onMounted, ref} from 'vue'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {roleChip, ROLES} from '@/utils/roles'
import {formatDate} from '@/utils/date'
import {userService} from '@/services/userService'
import {promotionService} from '@/services/promotionService'
import {blockService} from '@/services/blockService'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'

const {loading, error, run} = useAsyncTask('Impossible de charger le tableau de bord.', {loadingFromStart: true})

// Taille de page des requêtes qui ne servent qu'à compter. Une page vide serait
// refusée par Spring, un seul élément suffit à obtenir totalElements.
const COUNT_ONLY_SIZE = 1

// Nombre de lignes de la carte des derniers inscrits.
const RECENT_LEARNERS_SIZE = 5

// Page de repli quand une liste est indisponible : le tableau de bord affiche zéro
// plutôt que de ne rien afficher du tout.
const EMPTY_PAGE = {items: [], totalElements: 0}

const counts = ref({
  learners: 0,
  teachers: 0,
  admins: 0,
  disabled: 0,
  deleted: 0,
  blocks: 0,
  promotions: 0,
  activePromotions: 0
})

const recentLearners = ref([])

const cards = computed(() => [
  {label: 'Apprenants', value: counts.value.learners, icon: 'school', tint: 'bg-accent/15 text-primary'},
  {label: 'Formateurs', value: counts.value.teachers, icon: 'co_present', tint: 'bg-accent/15 text-primary'},
  {label: 'Administrateurs', value: counts.value.admins, icon: 'shield_person', tint: 'bg-accent/15 text-primary'},
  {label: 'Blocs', value: counts.value.blocks, icon: 'category', tint: 'bg-accent/15 text-primary'},
  {
    label: 'Promotions actives',
    value: `${counts.value.activePromotions} / ${counts.value.promotions}`,
    icon: 'workspaces',
    tint: 'bg-accent/15 text-primary'
  },
  {label: 'Comptes désactivés', value: counts.value.disabled, icon: 'block', tint: 'bg-surface-tint text-ink-soft'},
  {label: 'Corbeille', value: counts.value.deleted, icon: 'delete', tint: 'bg-surface-tint text-ink-soft'}
])

const quickLinks = [
  {label: 'Gérer les utilisateurs', to: '/admin/utilisateurs', icon: 'group'},
  {label: 'Gérer les promotions', to: '/admin/promotions', icon: 'workspaces'},
  {label: 'Gérer les contenus', to: '/admin/contenus', icon: 'category'}
]

/**
 * Renvoie une page vide plutôt qu'une erreur quand une liste facultative échoue.
 * Un indicateur indisponible ne doit pas emporter tout l'écran.
 */
function orEmptyPage(request) {
  return request.catch(() => EMPTY_PAGE)
}

function load() {
  return run(async () => {
    const [
      learners,
      teachers,
      admins,
      disabled,
      deleted,
      blocks,
      promotions,
      activePromotions,
      latestLearners
    ] = await Promise.all([
      userService.getUsers({role: ROLES.USER, size: COUNT_ONLY_SIZE}),
      userService.getUsers({role: ROLES.TEACHER, size: COUNT_ONLY_SIZE}),
      userService.getUsers({role: ROLES.ADMIN, size: COUNT_ONLY_SIZE}),
      userService.getUsers({enabled: false, size: COUNT_ONLY_SIZE}),
      orEmptyPage(userService.getDeletedUsers({size: COUNT_ONLY_SIZE})),
      orEmptyPage(blockService.getBlocks({size: COUNT_ONLY_SIZE})),
      orEmptyPage(promotionService.getPromotions({size: COUNT_ONLY_SIZE})),
      orEmptyPage(promotionService.getPromotions({active: true, size: COUNT_ONLY_SIZE})),
      // Tri et filtre appliqués par le serveur : la carte annonce des inscriptions,
      // elle doit donc montrer les comptes les plus récents et seulement des apprenants.
      userService.getUsers({
        role: ROLES.USER,
        sort: 'createdAt,desc',
        size: RECENT_LEARNERS_SIZE
      })
    ])

    counts.value = {
      learners: learners.totalElements,
      teachers: teachers.totalElements,
      admins: admins.totalElements,
      disabled: disabled.totalElements,
      deleted: deleted.totalElements,
      blocks: blocks.totalElements,
      promotions: promotions.totalElements,
      activePromotions: activePromotions.totalElements
    }

    recentLearners.value = latestLearners.items
  })
}

onMounted(load)
</script>

<template>
  <h1 class="text-[30px] font-semibold text-navy mb-6">Tableau de bord</h1>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du tableau de bord...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <!-- Indicateurs -->
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      <div v-for="card in cards" :key="card.label"
           class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" :class="card.tint">
            <Icon :name="card.icon" :size="22"/>
          </div>
          <span class="text-[13px] text-ink-soft">{{ card.label }}</span>
        </div>
        <div class="text-2xl font-semibold text-ink tabular-nums">{{ card.value }}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Derniers inscrits -->
      <div class="lg:col-span-2 bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-[17px] font-semibold text-ink">Derniers inscrits</h2>
          <RouterLink to="/admin/utilisateurs" class="text-[13px] text-primary font-semibold hover:underline">Tout
            voir
          </RouterLink>
        </div>
        <p v-if="recentLearners.length === 0" class="text-[14px] text-muted">Aucun apprenant inscrit.</p>
        <ul v-else>
          <li
            v-for="(u, i) in recentLearners"
            :key="u.id"
            class="flex items-center gap-3 py-2.5"
            :class="{ 'border-t border-line-soft': i > 0 }"
          >
            <Avatar :src="u.avatar" :name="`${u.firstName} ${u.lastName}`" :size="36"/>
            <div class="flex-1 min-w-0">
              <span class="text-[15px] text-ink block truncate">{{ u.firstName }} {{ u.lastName }}</span>
              <span class="text-[12px] text-muted">{{ u.email }}</span>
            </div>
            <StatusChip v-bind="roleChip(u.role)"/>
            <span class="text-[13px] text-muted shrink-0 w-20 text-right">{{ formatDate(u.createdAt) }}</span>
          </li>
        </ul>
      </div>

      <!-- Raccourcis -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
        <h2 class="text-[17px] font-semibold text-ink mb-4">Raccourcis</h2>
        <div class="flex flex-col gap-2">
          <RouterLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-tint hover:bg-surface-hover transition-colors"
          >
            <div class="w-9 h-9 rounded-lg bg-accent/15 text-primary flex items-center justify-center">
              <Icon :name="link.icon" :size="20"/>
            </div>
            <span class="text-[14px] font-medium text-ink flex-1">{{ link.label }}</span>
            <Icon name="chevron_right" :size="20" class="text-muted"/>
          </RouterLink>
        </div>
      </div>
    </div>
  </template>
</template>
