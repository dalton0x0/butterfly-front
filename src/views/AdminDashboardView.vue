<script setup>
// Espace admin : tableau de bord. Indicateurs, derniers inscrits, rendus à corriger et
// apprenants à relancer.
//
// Tout vient d'un seul appel : GET /api/users/me/admin-dashboard. Chaque indicateur y est
// un comptage serveur et non le décompte d'une liste reçue. L'écran faisait auparavant dix
// requêtes de comptage. Pour un gestionnaire, le serveur omet les comptes administrateurs
// et gestionnaires et la corbeille : les cartes correspondantes disparaissent.
import {computed, onMounted, ref} from 'vue'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {roleChip} from '@/utils/roles'
import {formatDate} from '@/utils/date'
import {useAuthStore} from '@/stores/auth'
import {dashboardService} from '@/services/dashboardService'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'
import PlatformSettingsCard from '@/components/PlatformSettingsCard.vue'

const auth = useAuthStore()

const {loading, error, run} = useAsyncTask('Impossible de charger le tableau de bord.', {loadingFromStart: true})

const dashboard = ref(null)

const recentLearners = computed(() => dashboard.value?.recentLearners || [])
const oldestPending = computed(() => dashboard.value?.oldestPending || [])
const inactiveLearners = computed(() => dashboard.value?.inactiveLearners || [])
const inactivityDays = computed(() => dashboard.value?.inactivityDays ?? 7)

// Une carte par indicateur reçu. Un champ absent de la réponse (gestionnaire) n'a pas de carte.
const cards = computed(() => {
  const d = dashboard.value
  if (!d) {
    return []
  }
  const accent = 'bg-accent/15 text-primary'
  const muted = 'bg-surface-tint text-ink-soft'
  return [
    {label: 'Apprenants', value: d.learners, icon: 'school', tint: accent},
    {label: 'Formateurs', value: d.teachers, icon: 'co_present', tint: accent},
    {label: 'Gestionnaires', value: d.managers, icon: 'account_circle', tint: accent},
    {label: 'Administrateurs', value: d.admins, icon: 'shield_person', tint: accent},
    {label: 'Blocs', value: d.blocks, icon: 'category', tint: accent},
    {label: 'Promotions actives', value: `${d.activePromotions} / ${d.promotions}`, icon: 'workspaces', tint: accent},
    {label: 'À corriger', value: d.pendingCount, icon: 'rate_review', tint: accent},
    {label: 'Comptes désactivés', value: d.disabledAccounts, icon: 'block', tint: muted},
    {label: 'Corbeille', value: d.deletedAccounts, icon: 'delete', tint: muted}
  ].filter((card) => card.value !== undefined && card.value !== null)
})

const quickLinks = [
  {label: 'Gérer les utilisateurs', to: '/admin/utilisateurs', icon: 'group'},
  {label: 'Gérer les promotions', to: '/admin/promotions', icon: 'workspaces'},
  {label: 'Gérer les contenus', to: '/admin/contenus', icon: 'category'}
]

// Apprenants non affichés dans la carte, signalés par un lien vers la liste complète.
const otherInactive = computed(() => (dashboard.value?.inactiveLearnerCount ?? 0) - inactiveLearners.value.length)

function fullName(person) {
  return `${person.firstName || person.userFirstName || ''} ${person.lastName || person.userLastName || ''}`.trim()
}

function lastActivity(learner) {
  return learner.lastActivityDate
    ? `Dernière activité le ${formatDate(learner.lastActivityDate)}`
    : 'Aucune activité pour le moment'
}

onMounted(() => run(async () => {
  dashboard.value = await dashboardService.getAdminDashboard()
}))
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

    <!-- items-start : sans lui, la grille étire chaque colonne à la hauteur de la plus
         haute, et la carte des derniers inscrits grandissait avec les réglages à droite. -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
      <div class="lg:col-span-2 flex flex-col gap-6">
        <!-- Derniers inscrits -->
        <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
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
              <Avatar :src="u.avatar" :name="fullName(u)" :size="36"/>
              <div class="flex-1 min-w-0">
                <span class="text-[15px] text-ink block truncate">{{ fullName(u) }}</span>
                <span class="text-[12px] text-muted">{{ u.email }}</span>
              </div>
              <StatusChip v-bind="roleChip(u.role)"/>
              <span class="text-[13px] text-muted shrink-0 w-20 text-right">{{ formatDate(u.createdAt) }}</span>
            </li>
          </ul>
        </section>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-start">
          <!-- Rendus en attente, les plus anciens d'abord -->
          <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-[17px] font-semibold text-ink">À corriger</h2>
              <RouterLink v-if="auth.canReview" to="/formateur/corrections"
                          class="text-[13px] text-primary font-semibold hover:underline">
                Corrections
              </RouterLink>
            </div>
            <p v-if="oldestPending.length === 0" class="text-[14px] text-muted">Aucun rendu en attente.</p>
            <ul v-else class="flex flex-col divide-y divide-line-soft">
              <li v-for="item in oldestPending" :key="item.id" class="py-2.5">
                <p class="text-[14px] text-ink truncate">{{ fullName(item) }}</p>
                <p class="text-[12px] text-muted truncate">
                  {{ item.exerciseName }} · rendu le {{ formatDate(item.submittedAt) }}
                </p>
              </li>
            </ul>
          </section>

          <!-- Apprenants à relancer -->
          <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
            <div class="flex items-center justify-between mb-1">
              <h2 class="text-[17px] font-semibold text-ink">À relancer</h2>
              <RouterLink v-if="otherInactive > 0" to="/admin/utilisateurs"
                          class="text-[13px] font-semibold text-primary hover:underline">
                Et {{ otherInactive }} autre{{ otherInactive > 1 ? 's' : '' }}
              </RouterLink>
            </div>
            <p class="text-[13px] text-ink-soft mb-3">Aucune activité depuis au moins {{ inactivityDays }} jours</p>
            <p v-if="inactiveLearners.length === 0" class="text-[14px] text-muted">Personne à relancer.</p>
            <ul v-else class="flex flex-col divide-y divide-line-soft">
              <li v-for="learner in inactiveLearners" :key="learner.userId">
                <RouterLink :to="`/admin/utilisateurs/${learner.userId}/apercu`"
                            class="py-2.5 flex items-center gap-3 hover:bg-surface-tint rounded-lg px-1 transition-colors">
                  <Avatar :src="learner.avatar" :name="fullName(learner)" :size="32"/>
                  <div class="min-w-0 flex-1">
                    <p class="text-[14px] text-ink truncate">{{ fullName(learner) }}</p>
                    <p class="text-[12px] text-muted">{{ lastActivity(learner) }}</p>
                  </div>
                  <Icon name="chevron_right" :size="18" class="text-muted shrink-0"/>
                </RouterLink>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div class="flex flex-col gap-6">
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

        <PlatformSettingsCard/>
      </div>
    </div>
  </template>
</template>
