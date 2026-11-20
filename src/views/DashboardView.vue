<script setup>
// Tableau de bord apprenant : en-tête, KPIs, blocs assignés, activité récente,
// derniers gains d'XP et derniers badges. Tout vient d'un seul appel :
// GET /api/users/me/dashboard, sauf l'historique d'XP chargé par sa carte.
//
// La mise en page suit celle des autres rôles : un en-tête, quatre indicateurs, puis des
// rangées de deux cartes de même largeur.
import {computed, onMounted, ref} from 'vue'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {formatDate} from '@/utils/date'
import {buildRecentActivity} from '@/utils/activity'
import {useAuthStore} from '@/stores/auth'
import {dashboardService} from '@/services/dashboardService'
import {mediaUrl} from '@/utils/media'
import Icon from '@/components/Icon.vue'
import {badgeIcon, badgeLevelColor as levelColor} from '@/utils/badgeIcons'
import ProgressBar from '@/components/ProgressBar.vue'
import BlockCover from '@/components/BlockCover.vue'
import XpHistoryCard from '@/components/XpHistoryCard.vue'
import KpiCard from '@/components/KpiCard.vue'
import DashboardSection from '@/components/DashboardSection.vue'

// Le tableau de bord donne un aperçu : la liste complète des blocs a sa propre page.
const MAX_DASHBOARD_BLOCKS = 4

// Date courte (jour et mois) pour le fil d'activité et les badges récents.
function formatShortDate(value) {
  return formatDate(value, {options: {day: '2-digit', month: 'short'}})
}

const auth = useAuthStore()

const {loading, error, run} = useAsyncTask('Impossible de charger le tableau de bord.', {loadingFromStart: true})
const dashboard = ref(null)

const overview = computed(() => dashboard.value?.overview || {})
const streak = computed(() => dashboard.value?.streak || {})
const assignedBlocks = computed(() => dashboard.value?.assignedBlocks || [])
const shownBlocks = computed(() => assignedBlocks.value.slice(0, MAX_DASHBOARD_BLOCKS))
const latestBadges = computed(() => dashboard.value?.latestBadges || [])

const kpis = computed(() => [
  {label: 'Cours terminés', value: overview.value.totalCoursesCompleted ?? 0, icon: 'menu_book'},
  {label: 'Exercices validés', value: overview.value.totalExercisesValidated ?? 0, icon: 'terminal'},
  {label: 'Quiz réussis', value: overview.value.totalQuizzesPassed ?? 0, icon: 'quiz'},
  {label: 'XP total', value: overview.value.totalXp ?? 0, icon: 'bolt'}
])

// Activité récente : on fusionne les trois flux de l'overview.
const recentActivity = computed(() => buildRecentActivity(overview.value, 6))

function load() {
  return run(async () => {
    dashboard.value = await dashboardService.getDashboard()
  })
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du tableau de bord...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <!-- En-tête de bienvenue -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-[30px] font-semibold text-navy">Bonjour {{ auth.user?.firstName }}</h1>
        <p class="text-ink-soft mt-1">Continuez votre progression.</p>
      </div>
      <!-- La série n'est pas un indicateur cumulé : elle reste à part, près du nom. -->
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-tint text-primary text-sm font-medium self-start">
        <Icon name="local_fire_department" :size="18"/> Série : {{ streak.currentStreak ?? 0 }} jours
      </span>
    </div>

    <!-- Indicateurs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      <KpiCard v-for="kpi in kpis" :key="kpi.label" v-bind="kpi"/>
    </div>

    <!-- Blocs assignés -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-[22px] font-semibold text-navy">Mes blocs de compétences</h2>
      <RouterLink v-if="assignedBlocks.length > MAX_DASHBOARD_BLOCKS" to="/blocs"
                  class="text-[13px] font-semibold text-primary hover:underline">
        Tous mes blocs ({{ assignedBlocks.length }})
      </RouterLink>
    </div>
    <div v-if="assignedBlocks.length === 0" class="text-[15px] text-muted mb-8">Aucun bloc assigné pour le moment.
    </div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      <RouterLink
        v-for="block in shownBlocks"
        :key="block.blockId"
        :to="`/blocs/${block.blockId}`"
        class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
      >
        <div class="w-30 h-16 rounded-xl overflow-hidden shrink-0 relative">
          <img v-if="block.cover" :src="mediaUrl(block.cover)" loading="lazy" :alt="block.blockName"
               class="w-30 h-16 object-cover" :class="{ 'opacity-60': block.locked }"/>
          <BlockCover v-else :height="64"/>
          <div v-if="block.locked" class="absolute inset-0 flex items-center justify-center bg-navy/30">
            <Icon name="lock" :size="20" class="text-white"/>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-[17px] font-semibold text-ink truncate">{{ block.blockName }}</h3>
            <span v-if="block.locked"
                  class="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-surface-tint text-ink-soft text-[12px] font-semibold">
              <Icon name="lock" :size="13"/> Verrouillé
            </span>
          </div>
          <p class="text-[13px] text-ink-soft mb-2">{{ block.completedCourses }}/{{ block.totalCourses }} cours
            terminés</p>
          <ProgressBar :value="Math.round(block.overallPercent || 0)" show-label/>
        </div>
        <span
          class="shrink-0 h-10 px-4 rounded-[10px] text-white text-sm font-semibold items-center hidden sm:inline-flex"
          :class="block.locked ? 'bg-muted' : 'bg-primary'">
          {{ block.locked ? 'Verrouillé' : 'Continuer' }}
        </span>
      </RouterLink>
    </div>

    <!-- Rangée de deux cartes, puis les badges sur toute la largeur. -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <DashboardSection title="Activité récente">
        <p v-if="recentActivity.length === 0" class="text-[14px] text-muted">Aucune activité récente.</p>
        <ul v-else class="flex flex-col divide-y divide-line-soft">
          <li v-for="(item, i) in recentActivity" :key="i" class="flex items-center gap-3 py-2.5">
            <div class="w-8 h-8 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
              <Icon :name="item.icon" :size="18"/>
            </div>
            <span class="text-[14px] text-ink flex-1">{{ item.text }}</span>
            <span class="text-[12px] text-ink-soft shrink-0">{{ formatShortDate(item.at) }}</span>
          </li>
        </ul>
      </DashboardSection>

      <XpHistoryCard/>
    </div>

    <DashboardSection title="Derniers badges">
      <template #action>
        <RouterLink to="/badges" class="text-primary hover:underline">Voir tous mes badges</RouterLink>
      </template>
      <p v-if="latestBadges.length === 0" class="text-[14px] text-muted">Aucun badge obtenu pour le moment.</p>
      <div v-else class="flex flex-wrap gap-8">
        <div v-for="ub in latestBadges" :key="ub.id" class="flex flex-col items-center text-center gap-2 w-24">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center"
            :style="{ border: `3px solid ${levelColor(ub.badge?.level)}`, background: 'var(--color-surface-tint)' }"
          >
            <Icon :name="badgeIcon(ub.badge?.icon)" :size="28" class="text-primary"/>
          </div>
          <span class="text-[13px] font-medium text-ink">{{ ub.badge?.name }}</span>
          <span class="text-[12px] text-muted">{{ formatShortDate(ub.earnedAt) }}</span>
        </div>
      </div>
    </DashboardSection>
  </template>
</template>
