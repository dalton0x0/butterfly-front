<script setup>
// Espace admin : tableau de bord. Indicateurs agrégés côté client à partir des
// listes existantes (pas d'endpoint de stats dédié) : utilisateurs par rôle,
// comptes désactivés, corbeille, blocs, promotions. Plus les derniers inscrits
// et des raccourcis vers les écrans de gestion.
import {computed, onMounted, ref} from 'vue'
import {roleChip, ROLES} from '@/utils/roles'
import {formatDate} from '@/utils/date'
import {userService} from '@/services/userService'
import {promotionService} from '@/services/promotionService'
import {blockService} from '@/services/blockService'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'

const loading = ref(true)
const error = ref('')

const activeUsers = ref([])
const deletedCount = ref(0)
const blocksCount = ref(0)
const promotions = ref([])

const stats = computed(() => {
  const users = activeUsers.value
  return {
    total: users.length,
    learners: users.filter((u) => u.role === ROLES.USER).length,
    teachers: users.filter((u) => u.role === ROLES.TEACHER).length,
    admins: users.filter((u) => u.role === ROLES.ADMIN).length,
    disabled: users.filter((u) => !u.enabled).length,
    deleted: deletedCount.value,
    blocks: blocksCount.value,
    promotions: promotions.value.length,
    activePromotions: promotions.value.filter((p) => p.active).length
  }
})

const cards = computed(() => [
  {label: 'Apprenants', value: stats.value.learners, icon: 'school', tint: 'bg-accent/15 text-primary'},
  {label: 'Formateurs', value: stats.value.teachers, icon: 'co_present', tint: 'bg-accent/15 text-primary'},
  {label: 'Administrateurs', value: stats.value.admins, icon: 'shield_person', tint: 'bg-accent/15 text-primary'},
  {label: 'Blocs', value: stats.value.blocks, icon: 'category', tint: 'bg-accent/15 text-primary'},
  {
    label: 'Promotions actives',
    value: `${stats.value.activePromotions} / ${stats.value.promotions}`,
    icon: 'workspaces',
    tint: 'bg-accent/15 text-primary'
  },
  {label: 'Comptes désactivés', value: stats.value.disabled, icon: 'block', tint: 'bg-surface-tint text-ink-soft'},
  {label: 'Corbeille', value: stats.value.deleted, icon: 'delete', tint: 'bg-surface-tint text-ink-soft'}
])

const recentUsers = computed(() =>
  [...activeUsers.value]
    .filter((u) => u.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
)

const quickLinks = [
  {label: 'Gérer les utilisateurs', to: '/admin/utilisateurs', icon: 'group'},
  {label: 'Gérer les promotions', to: '/admin/promotions', icon: 'workspaces'},
  {label: 'Gérer les contenus', to: '/admin/contenus', icon: 'category'}
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [users, deleted, blocks, promos] = await Promise.all([
      userService.getUsers(),
      userService.getDeletedUsers().catch(() => ({items: []})),
      blockService.getBlocks().catch(() => ({items: []})),
      promotionService.getPromotions().catch(() => ({items: []}))
    ])
    activeUsers.value = users.items
    deletedCount.value = deleted.items.length
    blocksCount.value = blocks.items.length
    promotions.value = promos.items
  } catch (err) {
    error.value = err.message || 'Impossible de charger le tableau de bord.'
  } finally {
    loading.value = false
  }
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
        <p v-if="recentUsers.length === 0" class="text-[14px] text-muted">Aucun utilisateur.</p>
        <ul v-else>
          <li
            v-for="(u, i) in recentUsers"
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
