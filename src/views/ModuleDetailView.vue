<script setup>
// Détail d'un module : en-tête + onglets Cours / Exercices / Quiz.
// GET /api/modules/{id} renvoie en un seul appel les cours, exercices et le quiz,
// chacun avec un booléen "completed". La progression de l'en-tête est dérivée de
// ces éléments réels.
import {computed, onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import {moduleService} from '@/services/moduleService'
import Icon from '@/components/Icon.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import StatusChip from '@/components/StatusChip.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const module = ref(null)
const tab = ref('all')

const courses = computed(() => module.value?.courses || [])
const exercises = computed(() => module.value?.exercises || [])
const quiz = computed(() => module.value?.quiz || null)

// Liste unifiée pour l'onglet "Tous" : cours et exercices triés par position, quiz à la fin.
const combined = computed(() => {
  const items = [
    ...courses.value.map((c) => ({...c, _type: 'course'})),
    ...exercises.value.map((e) => ({...e, _type: 'exercise'}))
  ].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  if (quiz.value) {
    items.push({...quiz.value, _type: 'quiz'})
  }
  return items
})

function itemRoute(item) {
  if (item._type === 'course') return `/cours/${item.id}`
  if (item._type === 'exercise') return `/exercices/${item.id}`
  return `/quiz/${item.id}`
}

function itemKindLabel(item) {
  if (item._type === 'course') return 'Cours'
  if (item._type === 'exercise') return 'Exercice'
  return 'Quiz'
}

const tabs = computed(() => [
  {key: 'all', label: `Tous (${combined.value.length})`},
  {key: 'courses', label: `Cours (${courses.value.length})`},
  {key: 'exercises', label: `Exercices (${exercises.value.length})`},
  {key: 'quiz', label: `Quiz (${quiz.value ? 1 : 0})`}
])

// Progression dérivée des éléments réellement terminés.
const derived = computed(() => {
  const total = courses.value.length + exercises.value.length + (quiz.value ? 1 : 0)
  const done =
    courses.value.filter((c) => c.completed).length +
    exercises.value.filter((e) => e.completed).length +
    (quiz.value?.completed ? 1 : 0)
  return {total, done, percent: total ? Math.round((done / total) * 100) : 0}
})

const headerChip = computed(() => {
  if (module.value?.completed) {
    return {label: 'Terminé', variant: 'success', icon: 'check_circle'}
  }
  if (module.value?.locked) {
    return {label: 'Verrouillé', variant: 'neutral', icon: 'lock'}
  }
  return {label: 'En cours', variant: 'primary', icon: 'schedule'}
})

const breadcrumb = computed(() => {
  const items = [{label: 'Mes blocs', to: '/blocs'}]
  if (module.value?.blockId) {
    items.push({label: module.value.blockName || 'Bloc', to: `/blocs/${module.value.blockId}`})
  }
  items.push({label: module.value?.name || 'Module'})
  return items
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    module.value = await moduleService.getModule(Number(route.params.id))
  } catch (err) {
    error.value = err.message || 'Impossible de charger le module.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du module...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="module">
    <Breadcrumb :items="breadcrumb"/>

    <!-- En-tête module -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 mb-6">
      <div class="flex items-start justify-between gap-4 mb-3">
        <div>
          <h1 class="text-[30px] font-semibold text-navy">{{ module.name }}</h1>
          <p class="text-ink-soft mt-1">{{ module.description }}</p>
        </div>
        <StatusChip v-bind="headerChip"/>
      </div>
      <div class="flex flex-wrap gap-2 mb-4">
        <StatusChip :label="`${module.courseCount} cours`" variant="primary"/>
        <StatusChip :label="`${module.exerciseCount} exercices`" variant="primary"/>
        <StatusChip v-if="module.hasQuiz" label="1 quiz" variant="primary"/>
      </div>
      <ProgressBar :value="derived.percent" show-label/>
    </div>

    <!-- Onglets -->
    <div class="flex gap-6 border-b border-line mb-5">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="pb-3 text-sm font-semibold transition-colors -mb-px"
        :class="tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-ink-soft hover:text-ink'"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Tous -->
    <div v-if="tab === 'all'" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <p v-if="combined.length === 0" class="px-5 py-6 text-[15px] text-muted">Ce module ne contient encore aucun contenu.</p>
      <component
        :is="item.locked ? 'div' : 'RouterLink'"
        v-for="(item, i) in combined"
        :key="`${item._type}-${item.id}`"
        :to="item.locked ? undefined : itemRoute(item)"
        class="flex items-center gap-3 px-5 py-4 transition-colors"
        :class="[
          i > 0 ? 'border-t border-line-soft' : '',
          item.locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-surface-hover'
        ]"
      >
        <div class="w-9 h-9 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
          <Icon
            :name="item.locked ? 'lock' : (item._type === 'course' ? 'menu_book' : item._type === 'exercise' ? 'terminal' : 'quiz')"
            :size="18"/>
        </div>
        <div class="flex-1 min-w-0">
          <span class="text-[15px] block truncate" :class="item.completed ? 'text-muted' : 'text-ink'">{{ item.name }}</span>
          <span class="text-[12px] text-muted">{{ itemKindLabel(item) }}</span>
        </div>
        <StatusChip
          v-if="item.locked"
          label="Verrouillé"
          variant="neutral"
        />
        <StatusChip
          v-else
          :label="item.completed ? 'Terminé' : 'À faire'"
          :variant="item.completed ? 'success' : 'neutral'"
        />
        <Icon v-if="!item.locked" name="chevron_right" :size="20" class="text-muted"/>
      </component>
    </div>

    <!-- Cours -->
    <div v-else-if="tab === 'courses'" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <p v-if="courses.length === 0" class="px-5 py-6 text-[15px] text-muted">Aucun cours dans ce module.</p>
      <RouterLink
        v-for="(c, i) in courses"
        :key="c.id"
        :to="`/cours/${c.id}`"
        class="flex items-center gap-3 px-5 py-4 hover:bg-surface-hover transition-colors"
        :class="{ 'border-t border-line-soft': i > 0 }"
      >
        <div class="w-9 h-9 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
          <Icon name="menu_book" :size="18"/>
        </div>
        <span class="flex-1 text-[15px]" :class="c.completed ? 'text-muted' : 'text-ink'">{{ c.name }}</span>
        <span class="flex items-center gap-1 text-[13px]" :class="c.completed ? 'text-[#16a34a]' : 'text-muted'">
          <Icon :name="c.completed ? 'check_circle' : 'radio_button_unchecked'" :size="18"/>
          {{ c.completed ? 'Terminé' : 'À commencer' }}
        </span>
        <Icon name="chevron_right" :size="20" class="text-muted"/>
      </RouterLink>
    </div>

    <!-- Exercices -->
    <div v-else-if="tab === 'exercises'" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <p v-if="exercises.length === 0" class="px-5 py-6 text-[15px] text-muted">Aucun exercice dans ce module.</p>
      <component
        :is="e.locked ? 'div' : 'RouterLink'"
        v-for="(e, i) in exercises"
        :key="e.id"
        :to="e.locked ? undefined : `/exercices/${e.id}`"
        class="flex items-center gap-3 px-5 py-4 transition-colors"
        :class="[
          i > 0 ? 'border-t border-line-soft' : '',
          e.locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-surface-hover'
        ]"
      >
        <div class="w-9 h-9 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
          <Icon :name="e.locked ? 'lock' : 'terminal'" :size="18"/>
        </div>
        <span class="flex-1 text-[15px] text-ink">{{ e.name }}</span>
        <StatusChip
          v-if="e.locked"
          label="Verrouillé"
          variant="neutral"
        />
        <StatusChip
          v-else
          :label="e.completed ? 'Terminé' : 'À faire'"
          :variant="e.completed ? 'success' : 'neutral'"
        />
        <Icon v-if="!e.locked" name="chevron_right" :size="20" class="text-muted"/>
      </component>
    </div>

    <!-- Quiz -->
    <div v-else class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <p v-if="!quiz" class="px-5 py-6 text-[15px] text-muted">Aucun quiz dans ce module.</p>
      <div v-else-if="quiz.locked"
           class="flex items-center gap-3 px-5 py-4 opacity-60 cursor-not-allowed">
        <div class="w-9 h-9 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
          <Icon name="lock" :size="18"/>
        </div>
        <div class="flex-1">
          <span class="text-[15px] text-ink block">{{ quiz.name }}</span>
          <span class="text-[13px] text-muted">Terminez d'abord tous les cours du module</span>
        </div>
        <StatusChip label="Verrouillé" variant="neutral"/>
      </div>
      <RouterLink v-else :to="`/quiz/${quiz.id}`"
                  class="flex items-center gap-3 px-5 py-4 hover:bg-surface-hover transition-colors">
        <div class="w-9 h-9 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
          <Icon name="quiz" :size="18"/>
        </div>
        <div class="flex-1">
          <span class="text-[15px] text-ink block">{{ quiz.name }}</span>
          <span class="text-[13px] text-muted">{{ quiz.completed ? 'Déjà réussi' : 'Non tenté' }}</span>
        </div>
        <span class="h-9 px-4 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center">
          {{ quiz.completed ? 'Rejouer' : 'Commencer' }}
        </span>
      </RouterLink>
    </div>
  </template>
</template>
