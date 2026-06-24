<script setup>
// Tableau de bord apprenant : en-tête, KPIs, blocs assignés, activité récente,
// derniers badges. Tout vient d'un seul appel : GET /api/users/me/dashboard.
import {ref, computed, onMounted} from 'vue'
import {formatDate} from '@/utils/date'
import {useAuthStore} from '@/stores/auth'
import {dashboardService} from '@/services/dashboardService'
import {mediaUrl} from '@/utils/media'
import Icon from '@/components/Icon.vue'
import {badgeIcon} from '@/utils/badgeIcons'
import ProgressBar from '@/components/ProgressBar.vue'
import BlockCover from '@/components/BlockCover.vue'

// Date courte (jour et mois) pour le fil d'activité et les badges récents.
function formatShortDate(value) {
  return formatDate(value, {options: {day: '2-digit', month: 'short'}})
}

const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const dashboard = ref(null)

const overview = computed(() => dashboard.value?.overview || {})
const streak = computed(() => dashboard.value?.streak || {})
const assignedBlocks = computed(() => dashboard.value?.assignedBlocks || [])
const latestBadges = computed(() => (dashboard.value?.latestBadges || []).slice(0, 3))

const COVER_THEMES = ['system', 'network', 'cloud']

function coverTheme(id) {
  return COVER_THEMES[((id || 1) - 1) % COVER_THEMES.length]
}

// Niveaux de badge : couleur de l'anneau.
const LEVEL_COLORS = {BRONZE: '#b45309', SILVER: '#94a3b8', GOLD: '#f59e0b', PLATINUM: '#7c3aed'}

function levelColor(level) {
  return LEVEL_COLORS[level] || '#94a3b8'
}

const kpis = computed(() => [
  {label: 'Cours terminés', value: overview.value.totalCoursesCompleted ?? 0, icon: 'menu_book'},
  {label: 'Exercices validés', value: overview.value.totalExercisesValidated ?? 0, icon: 'terminal'},
  {label: 'Quiz réussis', value: overview.value.totalQuizzesPassed ?? 0, icon: 'quiz'},
  {label: 'XP total', value: overview.value.totalXp ?? 0, icon: 'bolt'}
])

// Activité récente : on fusionne les trois flux de l'overview.
const recentActivity = computed(() => {
  const ov = overview.value
  const items = []
  for (const c of ov.recentCourseProgress || []) {
    items.push({
      icon: 'menu_book',
      text: c.status === 'COMPLETED' ? `Cours terminé : ${c.courseName}` : `Cours en cours : ${c.courseName}`,
      at: c.completedAt || c.updatedAt || c.startedAt
    })
  }
  for (const e of ov.recentExerciseProgress || []) {
    const label = {
      VALIDATED: 'Exercice validé',
      SUBMITTED: 'Exercice soumis',
      REJECTED: 'Exercice rejeté'
    }[e.status] || 'Exercice'
    items.push({
      icon: 'terminal',
      text: `${label} : ${e.exerciseName}`,
      at: e.validatedAt || e.submittedAt || e.updatedAt
    })
  }
  for (const q of ov.recentQuizAttempts || []) {
    items.push({
      icon: 'quiz',
      text: `${q.passed ? 'Quiz réussi' : 'Quiz tenté'} : ${q.quizName} (${q.score}/${q.maxScore})`,
      at: q.finishedAt || q.startedAt
    })
  }
  return items
      .filter((i) => i.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 6)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    dashboard.value = await dashboardService.getDashboard()
  } catch (err) {
    error.value = err.message || 'Impossible de charger le tableau de bord.'
  } finally {
    loading.value = false
  }
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
      <div class="flex flex-wrap gap-2">
        <span
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-tint text-primary text-sm font-medium">
          <Icon name="bolt" :size="18"/> {{ overview.totalXp ?? 0 }} XP
        </span>
        <span
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-tint text-primary text-sm font-medium">
          <Icon name="local_fire_department" :size="18"/> Série : {{ streak.currentStreak ?? 0 }} jours
        </span>
        <span
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-tint text-primary text-sm font-medium">
          <Icon name="quiz" :size="18"/> {{ overview.totalQuizzesPassed ?? 0 }} quiz réussis
        </span>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      <div v-for="kpi in kpis" :key="kpi.label"
           class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center text-primary">
            <Icon :name="kpi.icon" :size="22"/>
          </div>
          <span class="text-[13px] text-ink-soft">{{ kpi.label }}</span>
        </div>
        <div class="text-2xl font-semibold text-ink tabular-nums">{{ kpi.value }}</div>
      </div>
    </div>

    <!-- Blocs assignés -->
    <h2 class="text-[22px] font-semibold text-navy mb-4">Mes blocs de compétences</h2>
    <div v-if="assignedBlocks.length === 0" class="text-[15px] text-muted mb-10">Aucun bloc assigné pour le moment.
    </div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
      <RouterLink
          v-for="block in assignedBlocks"
          :key="block.blockId"
          :to="`/blocs/${block.blockId}`"
          class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
      >
        <div class="w-30 h-16 rounded-xl overflow-hidden shrink-0">
          <img v-if="block.cover" :src="mediaUrl(block.cover)" :alt="block.blockName" class="w-30 h-16 object-cover"/>
          <BlockCover v-else :theme="coverTheme(block.blockId)" :height="64"/>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-[17px] font-semibold text-ink truncate">{{ block.blockName }}</h3>
          <p class="text-[13px] text-ink-soft mb-2">{{ block.completedCourses }}/{{ block.totalCourses }} cours
            terminés</p>
          <ProgressBar :value="Math.round(block.overallPercent || 0)" show-label/>
        </div>
        <button
            class="shrink-0 h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity hidden sm:block">
          Continuer
        </button>
      </RouterLink>
    </div>

    <!-- Activité + badges -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
        <h3 class="text-[17px] font-semibold text-ink mb-4">Activité récente</h3>
        <p v-if="recentActivity.length === 0" class="text-[14px] text-muted">Aucune activité récente.</p>
        <ul v-else>
          <li
              v-for="(item, i) in recentActivity"
              :key="i"
              class="flex items-center gap-3 py-2.5"
              :class="{ 'border-t border-line-soft': i > 0 }"
          >
            <div class="w-8 h-8 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
              <Icon :name="item.icon" :size="18"/>
            </div>
            <span class="text-[15px] text-ink flex-1">{{ item.text }}</span>
            <span class="text-[13px] text-muted shrink-0">{{ formatShortDate(item.at) }}</span>
          </li>
        </ul>
      </div>

      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
        <h3 class="text-[17px] font-semibold text-ink mb-4">Derniers badges</h3>
        <p v-if="latestBadges.length === 0" class="text-[14px] text-muted mb-4">Aucun badge obtenu pour le moment.</p>
        <div v-else class="flex justify-around mb-4">
          <div v-for="ub in latestBadges" :key="ub.id" class="flex flex-col items-center text-center gap-2">
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
        <RouterLink to="/badges" class="text-sm text-primary font-semibold hover:underline">Voir tous mes badges
        </RouterLink>
      </div>
    </div>
  </template>
</template>
