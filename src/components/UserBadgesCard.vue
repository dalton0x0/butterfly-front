<script setup>
// Badges obtenus par un apprenant, vus par l'équipe depuis son aperçu.
//
// Un refus de portée (formateur hors des blocs de l'apprenant) efface la carte : la vue
// parente explique déjà pourquoi la progression n'est pas consultable.
import {onMounted, ref} from 'vue'
import {badgeService} from '@/services/badgeService'
import {badgeIcon, badgeLevelColor} from '@/utils/badgeIcons'
import {formatDate} from '@/utils/date'
import Icon from './Icon.vue'

const props = defineProps({
  userId: {type: Number, required: true}
})

const badges = ref([])
const loading = ref(true)
const error = ref('')
const forbidden = ref(false)

onMounted(async () => {
  try {
    badges.value = await badgeService.getUserBadges(props.userId)
  } catch (err) {
    if (err?.isForbidden) {
      forbidden.value = true
    } else {
      error.value = err.message || 'Impossible de charger les badges.'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section v-if="!forbidden" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 mb-6">
    <h2 class="text-[17px] font-semibold text-ink mb-4">
      Badges
      <span v-if="!loading && !error" class="text-ink-soft font-normal tabular-nums">({{ badges.length }})</span>
    </h2>
    <p v-if="loading" class="text-[14px] text-muted">Chargement des badges...</p>
    <p v-else-if="error" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">{{ error }}</p>
    <p v-else-if="badges.length === 0" class="text-[14px] text-muted">Aucun badge obtenu pour le moment.</p>
    <ul v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <li v-for="ub in badges" :key="ub.id" class="flex flex-col items-center text-center gap-1.5">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center"
          :style="{ border: `3px solid ${badgeLevelColor(ub.badge?.level)}`, background: 'var(--color-surface-tint)' }"
        >
          <Icon :name="badgeIcon(ub.badge?.icon)" :size="24" class="text-primary"/>
        </div>
        <span class="text-[13px] font-medium text-ink">{{ ub.badge?.name }}</span>
        <span class="text-[12px] text-muted">{{ formatDate(ub.earnedAt) }}</span>
      </li>
    </ul>
  </section>
</template>
