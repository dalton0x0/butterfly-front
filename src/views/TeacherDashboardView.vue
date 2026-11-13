<script setup>
// Tableau de bord du formateur : ce qui demande son attention sur ses blocs.
// Tout vient d'un seul appel : GET /api/users/me/teacher-dashboard.
//
// Trois questions, une carte chacune : qu'est-ce que je dois corriger ? Où en sont mes
// blocs ? Qui décroche ?
import {computed, onMounted, ref} from 'vue'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {useAuthStore} from '@/stores/auth'
import {dashboardService} from '@/services/dashboardService'
import {formatDate} from '@/utils/date'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'

const auth = useAuthStore()

const {loading, error, run} = useAsyncTask('Impossible de charger le tableau de bord.', {loadingFromStart: true})
const dashboard = ref(null)

const blocks = computed(() => dashboard.value?.blocks || [])
const oldestPending = computed(() => dashboard.value?.oldestPending || [])
const inactiveLearners = computed(() => dashboard.value?.inactiveLearners || [])
const pendingCount = computed(() => dashboard.value?.pendingCount ?? 0)
const inactiveCount = computed(() => dashboard.value?.inactiveLearnerCount ?? 0)
const inactivityDays = computed(() => dashboard.value?.inactivityDays ?? 7)

// Apprenants non affichés dans la carte, signalés par un lien vers la liste complète.
const otherInactive = computed(() => inactiveCount.value - inactiveLearners.value.length)

const kpis = computed(() => [
  {label: 'À corriger', value: pendingCount.value, icon: 'rate_review'},
  {label: 'Blocs suivis', value: blocks.value.length, icon: 'category'},
  {label: `Inactifs depuis ${inactivityDays.value} jours`, value: inactiveCount.value, icon: 'bedtime'}
])

function fullName(person) {
  return `${person.firstName || person.userFirstName || ''} ${person.lastName || person.userLastName || ''}`.trim()
}

function lastActivity(learner) {
  return learner.lastActivityDate
    ? `Dernière activité le ${formatDate(learner.lastActivityDate)}`
    : 'Aucune activité pour le moment'
}

onMounted(() => run(async () => {
  dashboard.value = await dashboardService.getTeacherDashboard()
}))
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du tableau de bord...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-[30px] font-semibold text-navy">Bonjour {{ auth.user?.firstName }}</h1>
        <p class="text-ink-soft mt-1">
          {{ pendingCount > 0
            ? `${pendingCount} rendu${pendingCount > 1 ? 's attendent' : ' attend'} votre correction.`
            : 'Aucun rendu en attente. Tout est à jour.' }}
        </p>
      </div>
      <RouterLink
        v-if="pendingCount > 0"
        to="/formateur/corrections"
        class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity self-start"
      >
        <Icon name="rate_review" :size="18"/>
        Commencer les corrections
      </RouterLink>
    </div>

    <p v-if="blocks.length === 0" class="text-[15px] text-muted bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
      Aucun bloc ne vous est encore assigné. Un administrateur ou un gestionnaire peut vous en assigner un.
    </p>

    <template v-else>
      <!-- Indicateurs -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div v-for="kpi in kpis" :key="kpi.label"
             class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-full bg-accent/15 text-primary flex items-center justify-center shrink-0">
            <Icon :name="kpi.icon" :size="22"/>
          </div>
          <div>
            <p class="text-[26px] font-semibold text-navy leading-none">{{ kpi.value }}</p>
            <p class="text-[13px] text-ink-soft mt-1">{{ kpi.label }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Rendus en attente -->
        <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[17px] font-semibold text-ink">Rendus qui attendent le plus</h2>
            <RouterLink v-if="pendingCount > 0" to="/formateur/corrections"
                        class="text-[13px] font-semibold text-primary hover:underline">Tout voir</RouterLink>
          </div>
          <p v-if="oldestPending.length === 0" class="text-[14px] text-muted">Aucun rendu en attente.</p>
          <ul v-else class="flex flex-col divide-y divide-line-soft">
            <li v-for="item in oldestPending" :key="item.id" class="py-2.5 flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-[14px] text-ink truncate">{{ fullName(item) }}</p>
                <p class="text-[12px] text-muted truncate">{{ item.exerciseName }}</p>
              </div>
              <span class="text-[12px] text-ink-soft shrink-0">Rendu le {{ formatDate(item.submittedAt) }}</span>
            </li>
          </ul>
        </section>

        <!-- Apprenants inactifs -->
        <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[17px] font-semibold text-ink">Sans activité depuis {{ inactivityDays }} jours</h2>
            <RouterLink v-if="otherInactive > 0" to="/formateur/apprenants"
                        class="text-[13px] font-semibold text-primary hover:underline">
              Et {{ otherInactive }} autre{{ otherInactive > 1 ? 's' : '' }}
            </RouterLink>
          </div>
          <p v-if="inactiveLearners.length === 0" class="text-[14px] text-muted">
            Tous vos apprenants ont été actifs récemment.
          </p>
          <ul v-else class="flex flex-col divide-y divide-line-soft">
            <li v-for="learner in inactiveLearners" :key="learner.userId">
              <RouterLink :to="`/formateur/apprenants/${learner.userId}`"
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

      <!-- Mes blocs -->
      <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <h2 class="text-[17px] font-semibold text-ink px-5 pt-5 pb-3">Mes blocs</h2>
        <table class="w-full text-[14px]">
          <thead>
          <tr class="bg-surface-tint text-[13px] text-ink-soft text-left">
            <th class="px-5 py-3 font-medium">Bloc</th>
            <th class="px-5 py-3 font-medium">Apprenants</th>
            <th class="px-5 py-3 font-medium">À corriger</th>
            <th class="px-5 py-3 font-medium text-right">Action</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="block in blocks" :key="block.blockId" class="border-t border-line-soft">
            <td class="px-5 py-3 text-ink">{{ block.blockName }}</td>
            <td class="px-5 py-3 text-ink-soft">{{ block.learnerCount }}</td>
            <td class="px-5 py-3">
              <span :class="block.pendingCount > 0 ? 'text-primary font-semibold' : 'text-ink-soft'">
                {{ block.pendingCount }}
              </span>
            </td>
            <td class="px-5 py-3 text-right">
              <RouterLink v-if="block.pendingCount > 0"
                          :to="{path: '/formateur/corrections', query: {blockId: block.blockId}}"
                          class="text-[13px] font-semibold text-primary hover:underline">
                Corriger ce bloc
              </RouterLink>
              <RouterLink v-else :to="`/formateur/contenus/blocs/${block.blockId}`"
                          class="text-[13px] font-semibold text-ink-soft hover:underline">
                Voir le contenu
              </RouterLink>
            </td>
          </tr>
          </tbody>
        </table>
      </section>
    </template>
  </template>
</template>
