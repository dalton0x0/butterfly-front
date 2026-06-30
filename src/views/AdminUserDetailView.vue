<script setup>
// Espace admin : page d'aperçu d'un utilisateur (apprenant ou formateur).
import {computed, onMounted, ref} from 'vue'
import {formatDate} from '@/utils/date'
import {useRoute} from 'vue-router'
import {userService} from '@/services/userService'
import {useAuthStore} from '@/stores/auth'
import {roleChip, ROLES} from '@/utils/roles'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'

const route = useRoute()
const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const user = ref(null)
const overview = ref(null)

const togglingStatus = ref(false)
const actionMessage = ref('')

const userId = computed(() => Number(route.params.id))
const isSelf = computed(() => auth.user && auth.user.id === userId.value)

const fullName = computed(() =>
  user.value ? `${user.value.firstName} ${user.value.lastName}` : ''
)

const role = computed(() => roleChip(user.value?.role))

const isLearner = computed(() => user.value?.role === ROLES.USER)
const isTeacher = computed(() => user.value?.role === ROLES.TEACHER)

// Blocs constituant le périmètre pédagogique d'un formateur.
const scopeBlocks = computed(() => user.value?.blocks || [])

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
    const loadedUser = await userService.getUser(userId.value)
    user.value = loadedUser
    if (loadedUser.role === ROLES.USER) {
      overview.value = await userService.getUserOverview(userId.value)
    }
  } catch (err) {
    error.value = err.message || "Impossible de charger l'utilisateur."
  } finally {
    loading.value = false
  }
}

async function toggleStatus() {
  if (isSelf.value || togglingStatus.value) {
    return
  }
  togglingStatus.value = true
  actionMessage.value = ''
  try {
    const updated = await userService.toggleEnabled(userId.value)
    user.value = {...user.value, enabled: updated.enabled}
    actionMessage.value = updated.enabled ? 'Utilisateur activé.' : 'Utilisateur désactivé.'
  } catch (err) {
    actionMessage.value = err.message || "L'action a échoué."
  } finally {
    togglingStatus.value = false
  }
}

onMounted(load)
</script>

<template>
  <Breadcrumb :items="[{ label: 'Utilisateurs', to: '/admin/utilisateurs' }, { label: fullName || 'Utilisateur' }]"/>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement de l'utilisateur...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="user">
    <!-- En-tête identité -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar :src="user.avatar" :name="fullName" :size="80"/>
        <div class="flex-1 min-w-0">
          <h1 class="text-[26px] font-semibold text-navy truncate">{{ fullName }}</h1>
          <p class="text-ink-soft truncate">{{ user.email }}</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <StatusChip :label="role.label" :variant="role.variant"/>
            <StatusChip
              :label="user.enabled ? 'Actif' : 'Désactivé'"
              :variant="user.enabled ? 'success' : 'neutral'"
            />
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-tint text-[13px] text-ink-soft">
              <Icon name="school" :size="16"/> {{ user.promotionName || 'Sans promotion' }}
            </span>
          </div>
        </div>
        <div v-if="isLearner" class="rounded-xl bg-surface-tint px-5 py-3 text-center shrink-0">
          <p class="text-[13px] text-ink-soft mb-1">Note moyenne</p>
          <p class="text-xl font-semibold text-ink tabular-nums">{{ averageGrade }}</p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-[17px] font-semibold text-ink">Actions</h2>
          <p class="text-[13px] text-muted">Modifier les informations ou changer le statut du compte.</p>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink
            :to="`/admin/utilisateurs/${userId}`"
            class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Icon name="edit" :size="16"/>
            Modifier l'utilisateur
          </RouterLink>
          <button
            type="button"
            :disabled="isSelf || togglingStatus"
            class="h-10 px-4 rounded-[10px] border border-input text-ink-soft text-sm font-semibold inline-flex items-center gap-2 hover:bg-surface-tint transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            :title="isSelf ? 'Vous ne pouvez pas désactiver votre propre compte' : ''"
            @click="toggleStatus"
          >
            <Icon name="power_settings_new" :size="16"/>
            {{ user.enabled ? 'Désactiver' : 'Activer' }}
          </button>
        </div>
      </div>
      <p v-if="actionMessage" class="text-[13px] text-success bg-success/10 rounded-[10px] px-3 py-2 mt-3">
        {{ actionMessage }}</p>
    </div>

    <!-- Apprenant : progression complète -->
    <template v-if="isLearner">
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

    <!-- Formateur : périmètre pédagogique (pas de progression ni de tableau de bord apprenant) -->
    <template v-else-if="isTeacher">
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
        <h2 class="text-[17px] font-semibold text-ink mb-1">Périmètre pédagogique</h2>
        <p class="text-[13px] text-muted mb-4">
          Blocs sur lesquels ce formateur peut intervenir. Un formateur n'a pas de progression
          d'apprenant ni de tableau de bord élève.
        </p>
        <p v-if="scopeBlocks.length === 0" class="text-[14px] text-muted">
          Aucun bloc assigné. Utilisez « Modifier l'utilisateur » pour définir son périmètre.
        </p>
        <div v-else class="flex flex-wrap gap-2">
          <span v-for="b in scopeBlocks" :key="b.id"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-tint text-[13px] text-ink">
            <Icon name="layers" :size="16"/> {{ b.name }}
          </span>
        </div>
      </div>
    </template>

    <!-- Administrateur : pas de parcours d'apprentissage -->
    <template v-else>
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
        <h2 class="text-[17px] font-semibold text-ink mb-1">Compte administrateur</h2>
        <p class="text-[13px] text-muted">
          Ce compte gère la plateforme et ne suit pas de parcours d'apprentissage : il n'a donc
          ni progression ni activité d'apprenant.
        </p>
      </div>
    </template>
  </template>
</template>
