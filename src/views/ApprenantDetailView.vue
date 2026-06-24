<script setup>
// Espace formateur : page détail d'un apprenant. En-tête (identité, promotion,
// statut), indicateurs de progression, note moyenne et activité récente.
// GET /api/users/{id} pour l'identité, GET /api/progress/users/{id}/overview
// pour la progression (lecture seule, accessible à tout le staff).
import {computed, onMounted, ref} from 'vue'
import {formatDate} from '@/utils/date'
import {useRoute} from 'vue-router'
import {userService} from '@/services/userService'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const learner = ref(null)
const overview = ref(null)

const userId = computed(() => Number(route.params.id))

const fullName = computed(() =>
  learner.value ? `${learner.value.firstName} ${learner.value.lastName}` : ''
)

const kpis = computed(() => {
  const ov = overview.value || {}
  return [
    {label: 'Cours terminés', value: ov.totalCoursesCompleted ?? 0, icon: 'menu_book'},
    {label: 'Exercices validés', value: ov.totalExercisesValidated ?? 0, icon: 'terminal'},
    {label: 'Quiz réussis', value: ov.totalQuizzesPassed ?? 0, icon: 'quiz'},
    {label: 'XP total', value: ov.totalXp ?? 0, icon: 'bolt'}
  ]
})

const averageGrade = computed(() => {
  const value = overview.value?.averageGrade
  return value != null ? `${value.toFixed(1)} / 20` : '-'
})

// Activité récente : on fusionne les trois flux de l'aperçu, comme le dashboard apprenant.
const recentActivity = computed(() => {
  const ov = overview.value || {}
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
    .slice(0, 12)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [user, ov] = await Promise.all([
      userService.getUser(userId.value),
      userService.getUserOverview(userId.value)
    ])
    learner.value = user
    overview.value = ov
  } catch (err) {
    error.value = err.message || "Impossible de charger l'apprenant."
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <Breadcrumb :items="[{ label: 'Apprenants', to: '/formateur/apprenants' }, { label: fullName || 'Apprenant' }]"/>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement de l'apprenant...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="learner">
    <!-- En-tête identité -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar :src="learner.avatar" :name="fullName" :size="80"/>
        <div class="flex-1 min-w-0">
          <h1 class="text-[26px] font-semibold text-navy truncate">{{ fullName }}</h1>
          <p class="text-ink-soft truncate">{{ learner.email }}</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <StatusChip
              :label="learner.enabled ? 'Actif' : 'Désactivé'"
              :variant="learner.enabled ? 'success' : 'neutral'"
            />
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-tint text-[13px] text-ink-soft">
              <Icon name="school" :size="16"/> {{ learner.promotionName || 'Sans promotion' }}
            </span>
          </div>
        </div>
        <div class="rounded-xl bg-surface-tint px-5 py-3 text-center shrink-0">
          <p class="text-[13px] text-ink-soft mb-1">Note moyenne</p>
          <p class="text-xl font-semibold text-ink tabular-nums">{{ averageGrade }}</p>
        </div>
      </div>
    </div>

    <!-- Indicateurs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

    <!-- Activité récente -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
      <h2 class="text-[17px] font-semibold text-ink mb-4">Activité récente</h2>
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
          <span class="text-[13px] text-muted shrink-0">{{ formatDate(item.at) }}</span>
        </li>
      </ul>
    </div>
  </template>
</template>
