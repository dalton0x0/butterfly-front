<script setup>
// Page des badges : grille de médaillons et pop-up de détail.
// GET /api/badges/me/progress renvoie tous les badges avec, pour l'utilisateur,
// l'état (obtenu ou non), la valeur courante, la cible et le pourcentage.
import {ref, computed, onMounted} from 'vue'
import {badgeService} from '@/services/badgeService'
import Icon from '@/components/Icon.vue'
import {badgeIcon} from '@/utils/badgeIcons'
import ProgressBar from '@/components/ProgressBar.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Modal from '@/components/Modal.vue'

const loading = ref(true)
const error = ref('')
const items = ref([]) // BadgeProgressResponse[]
const selected = ref(null)
const activeFilter = ref('all')

const LEVELS = {
  BRONZE: {color: '#b45309', label: 'Bronze'},
  SILVER: {color: '#94a3b8', label: 'Argent'},
  GOLD: {color: '#f59e0b', label: 'Or'},
  PLATINUM: {color: '#7c3aed', label: 'Platine'}
}

function levelColor(level) {
  return LEVELS[level]?.color || '#94a3b8'
}

function levelLabel(level) {
  return LEVELS[level]?.label || level
}

const CATEGORY_LABELS = {
  STARTER: 'Débuts',
  PROGRESSION: 'Progression',
  STREAK: 'Assiduité',
  EXPERIENCE: 'Expérience',
  QUIZ: 'Quiz',
  EXERCISE: 'Exercices',
  SPECIAL: 'Spécial'
}

const earnedCount = computed(() => items.value.filter((i) => i.earned).length)

// Filtres : Tous + les catégories réellement présentes.
const filters = computed(() => {
  const present = [...new Set(items.value.map((i) => i.badge?.category).filter(Boolean))]
  return [{key: 'all', label: 'Tous'}, ...present.map((c) => ({key: c, label: CATEGORY_LABELS[c] || c}))]
})
const filtered = computed(() => {
  if (activeFilter.value === 'all') {
    return items.value
  }
  return items.value.filter((i) => i.badge?.category === activeFilter.value)
})

function formatDate(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'})
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await badgeService.getMyProgress()
  } catch (err) {
    error.value = err.message || 'Impossible de charger les badges.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <Breadcrumb :items="[{ label: 'Accueil', to: '/' }, { label: 'Mes badges' }]"/>

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
    <h1 class="text-[30px] font-semibold text-navy">Mes badges</h1>
    <span
        class="inline-flex items-center px-3 py-1.5 rounded-full bg-surface-tint text-primary text-sm font-medium self-start">
      {{ earnedCount }} obtenus / {{ items.length }}
    </span>
  </div>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des badges...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <!-- Filtres -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button
          v-for="f in filters"
          :key="f.key"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          :class="activeFilter === f.key ? 'bg-primary text-white' : 'bg-surface-tint text-primary hover:bg-accent/20'"
          @click="activeFilter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Grille -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <button
          v-for="item in filtered"
          :key="item.badge.id"
          class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex flex-col items-center text-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
          @click="selected = item"
      >
        <div
            class="rounded-full flex items-center justify-center relative"
            :style="{
            width: '72px',
            height: '72px',
            border: `3px solid ${item.earned ? levelColor(item.badge.level) : '#cbd5e1'}`,
            background: 'var(--color-surface-tint)',
            opacity: item.earned ? 1 : 0.6,
            filter: item.earned ? 'none' : 'grayscale(1)'
          }"
        >
          <Icon :name="badgeIcon(item.badge.icon)" :size="30" class="text-primary"/>
          <span
              v-if="!item.earned"
              class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#6d8196] text-white flex items-center justify-center"
          >
            <Icon name="lock" :size="14"/>
          </span>
        </div>
        <span class="text-[15px] font-semibold text-ink mt-1">{{ item.badge.name }}</span>

        <template v-if="item.earned">
          <span class="text-[12px] px-2 py-0.5 rounded-full"
                :style="{ color: levelColor(item.badge.level), background: 'var(--color-surface-tint)' }">
            {{ levelLabel(item.badge.level) }}
          </span>
          <span class="text-[12px] text-muted">Obtenu le {{ formatDate(item.earnedAt) }}</span>
        </template>
        <template v-else>
          <ProgressBar :value="item.percent || 0"/>
          <span class="text-[12px] text-muted">{{ item.currentValue }}/{{ item.targetValue }}</span>
        </template>
      </button>
    </div>
  </template>

  <!-- Pop-up de détail -->
  <Modal v-if="selected" @close="selected = null">
    <div class="flex flex-col items-center text-center px-6 pt-8 pb-6">
      <div
          class="rounded-full flex items-center justify-center relative mb-4"
          :style="{
          width: '96px',
          height: '96px',
          border: `4px solid ${selected.earned ? levelColor(selected.badge.level) : '#cbd5e1'}`,
          background: 'var(--color-surface-tint)',
          filter: selected.earned ? 'none' : 'grayscale(1)'
        }"
      >
        <Icon :name="badgeIcon(selected.badge.icon)" :size="42" class="text-primary"/>
        <span
            v-if="!selected.earned"
            class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#6d8196] text-white flex items-center justify-center"
        >
          <Icon name="lock" :size="16"/>
        </span>
      </div>

      <h3 class="text-[20px] font-semibold text-navy">{{ selected.badge.name }}</h3>
      <div class="flex items-center gap-2 mt-2">
        <span class="text-[12px] px-2 py-0.5 rounded-full"
              :style="{ color: levelColor(selected.badge.level), background: 'var(--color-surface-tint)' }">
          Niveau {{ levelLabel(selected.badge.level) }}
        </span>
        <span
            class="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full"
            :class="selected.earned ? 'bg-[#16a34a]/12 text-[#16a34a]' : 'bg-[#6d8196]/12 text-[#6d8196]'"
        >
          <Icon :name="selected.earned ? 'check_circle' : 'schedule'" :size="14"/>
          {{ selected.earned ? 'Obtenu' : 'En cours' }}
        </span>
      </div>

      <p class="text-[14px] text-ink-soft mt-4">{{ selected.badge.description }}</p>

      <!-- Progression si non obtenu -->
      <div v-if="!selected.earned" class="w-full mt-4">
        <div class="flex justify-between text-[13px] text-ink-soft mb-1.5">
          <span>Progression</span>
          <span class="font-semibold text-primary">{{ selected.currentValue }}/{{ selected.targetValue }}</span>
        </div>
        <ProgressBar :value="selected.percent || 0"/>
      </div>

      <!-- Pied : date ou récompense XP -->
      <div class="w-full flex items-center justify-between mt-5 pt-4 border-t border-line-soft text-[13px]">
        <span class="text-muted">
          {{ selected.earned ? `Obtenu le ${formatDate(selected.earnedAt)}` : 'Pas encore obtenu' }}
        </span>
        <span class="inline-flex items-center gap-1 text-primary font-semibold">
          <Icon name="bolt" :size="16"/> +{{ selected.badge.xpReward }} XP
        </span>
      </div>
    </div>
  </Modal>
</template>
