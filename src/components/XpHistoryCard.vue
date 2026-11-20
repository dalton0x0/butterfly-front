<script setup>
// Derniers gains d'XP de l'apprenant connecté.
//
// Le tableau de bord affiche le total d'XP sans dire d'où il vient : cette carte montre
// les derniers gains, avec leur source et leur date.
import {onMounted, ref} from 'vue'
import {progressService} from '@/services/progressService'
import {xpSourceLabel} from '@/utils/xp'
import {formatDate} from '@/utils/date'
import Icon from './Icon.vue'
import DashboardSection from './DashboardSection.vue'

const ENTRIES = 5

const entries = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    entries.value = (await progressService.getMyXpHistory({size: ENTRIES})).items
  } catch (err) {
    error.value = err.message || "Impossible de charger l'historique d'XP."
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DashboardSection title="Derniers gains d'XP">
    <p v-if="loading" class="text-[14px] text-muted">Chargement...</p>
    <p v-else-if="error" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">{{ error }}</p>
    <p v-else-if="entries.length === 0" class="text-[14px] text-muted">
      Aucun XP gagné pour le moment. Terminez un cours ou faites valider un exercice pour commencer.
    </p>
    <ul v-else class="flex flex-col divide-y divide-line-soft">
      <li v-for="entry in entries" :key="entry.id" class="flex items-center gap-3 py-2.5">
        <div class="w-8 h-8 rounded-full bg-accent/15 text-primary flex items-center justify-center shrink-0">
          <Icon name="bolt" :size="18"/>
        </div>
        <span class="text-[14px] text-ink flex-1">{{ xpSourceLabel(entry.source) }}</span>
        <span class="text-[14px] font-semibold text-primary tabular-nums shrink-0">+{{ entry.amount }} XP</span>
        <span class="text-[12px] text-muted shrink-0 w-20 text-right">{{ formatDate(entry.earnedAt) }}</span>
      </li>
    </ul>
  </DashboardSection>
</template>
