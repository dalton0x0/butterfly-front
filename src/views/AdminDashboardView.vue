<script setup>
// Espace admin : tableau de bord de l'administrateur et du gestionnaire.
//
// Tout vient d'un seul appel : GET /api/users/me/admin-dashboard. Chaque indicateur y est
// un comptage serveur et non le décompte d'une liste reçue. Pour un gestionnaire, le
// serveur omet les comptes administrateurs et gestionnaires et la corbeille : ces lignes
// disparaissent de la carte Plateforme.
//
// La mise en page suit celle du formateur et de l'apprenant : un en-tête, quatre
// indicateurs, puis des rangées de deux cartes de même largeur.
import {computed, onMounted, ref} from 'vue'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {roleChip} from '@/utils/roles'
import {formatDate} from '@/utils/date'
import {useAuthStore} from '@/stores/auth'
import {dashboardService} from '@/services/dashboardService'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'
import KpiCard from '@/components/KpiCard.vue'
import DashboardSection from '@/components/DashboardSection.vue'
import PlatformSettingsCard from '@/components/PlatformSettingsCard.vue'

const auth = useAuthStore()

const {loading, error, run} = useAsyncTask('Impossible de charger le tableau de bord.', {loadingFromStart: true})

const dashboard = ref(null)

const recentLearners = computed(() => dashboard.value?.recentLearners || [])
const oldestPending = computed(() => dashboard.value?.oldestPending || [])
const inactiveLearners = computed(() => dashboard.value?.inactiveLearners || [])
const inactivityDays = computed(() => dashboard.value?.inactivityDays ?? 7)
const pendingCount = computed(() => dashboard.value?.pendingCount ?? 0)
const inactiveCount = computed(() => dashboard.value?.inactiveLearnerCount ?? 0)

// Apprenants non affichés dans la carte, signalés par un lien vers la liste complète.
const otherInactive = computed(() => inactiveCount.value - inactiveLearners.value.length)

// Les quatre questions du quotidien. Le reste des chiffres va dans la carte Plateforme.
const kpis = computed(() => [
  {label: 'Apprenants', value: dashboard.value?.learners ?? 0, icon: 'school'},
  {label: 'Formateurs', value: dashboard.value?.teachers ?? 0, icon: 'co_present'},
  {label: 'À corriger', value: pendingCount.value, icon: 'rate_review'},
  {label: 'À relancer', value: inactiveCount.value, icon: 'bedtime'}
])

// Une ligne par chiffre reçu. Un champ absent de la réponse (gestionnaire) n'a pas de ligne.
const platformRows = computed(() => {
  const d = dashboard.value
  if (!d) {
    return []
  }
  return [
    {label: 'Administrateurs', value: d.admins, icon: 'shield_person'},
    {label: 'Gestionnaires', value: d.managers, icon: 'account_circle'},
    {label: 'Blocs', value: d.blocks, icon: 'category'},
    {label: 'Promotions actives', value: `${d.activePromotions} / ${d.promotions}`, icon: 'workspaces'},
    {label: 'Comptes désactivés', value: d.disabledAccounts, icon: 'block'},
    {label: 'Corbeille', value: d.deletedAccounts, icon: 'delete'}
  ].filter((row) => row.value !== undefined && row.value !== null)
})

const quickLinks = [
  {label: 'Gérer les utilisateurs', to: '/admin/utilisateurs', icon: 'group'},
  {label: 'Gérer les promotions', to: '/admin/promotions', icon: 'workspaces'},
  {label: 'Gérer les contenus', to: '/admin/contenus', icon: 'category'}
]

// Phrase d'accueil : ce qui demande une action aujourd'hui.
const summary = computed(() => {
  const parts = []
  if (pendingCount.value > 0) {
    parts.push(`${pendingCount.value} rendu${pendingCount.value > 1 ? 's attendent' : ' attend'} une correction`)
  }
  if (inactiveCount.value > 0) {
    parts.push(`${inactiveCount.value} apprenant${inactiveCount.value > 1 ? 's sont' : ' est'} à relancer`)
  }
  if (parts.length === 0) {
    return 'Rien ne demande votre attention. Tout est à jour.'
  }
  const sentence = parts.join(' et ')
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
})

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
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du tableau de bord...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-[30px] font-semibold text-navy">Bonjour {{ auth.user?.firstName }}</h1>
        <p class="text-ink-soft mt-1">{{ summary }}</p>
      </div>
      <RouterLink
        v-if="pendingCount > 0 && auth.canReview"
        to="/formateur/corrections"
        class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity self-start"
      >
        <Icon name="rate_review" :size="18"/>
        Commencer les corrections
      </RouterLink>
    </div>

    <!-- Indicateurs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      <KpiCard v-for="kpi in kpis" :key="kpi.label" v-bind="kpi"/>
    </div>

    <!-- Rangées de deux cartes. Les deux cartes d'une rangée prennent la même hauteur,
         ce qui garde le tableau symétrique. -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Rendus en attente, les plus anciens d'abord -->
      <DashboardSection title="Rendus qui attendent le plus">
        <template v-if="pendingCount > 0 && auth.canReview" #action>
          <RouterLink to="/formateur/corrections" class="text-primary hover:underline">Tout voir</RouterLink>
        </template>
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
      </DashboardSection>

      <!-- Apprenants à relancer -->
      <DashboardSection title="Apprenants à relancer"
                        :subtitle="`Aucune activité depuis au moins ${inactivityDays} jours`">
        <template v-if="otherInactive > 0" #action>
          <RouterLink to="/admin/utilisateurs" class="text-primary hover:underline">
            Et {{ otherInactive }} autre{{ otherInactive > 1 ? 's' : '' }}
          </RouterLink>
        </template>
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
      </DashboardSection>

      <!-- Derniers inscrits -->
      <DashboardSection title="Derniers inscrits">
        <template #action>
          <RouterLink to="/admin/utilisateurs" class="text-primary hover:underline">Tout voir</RouterLink>
        </template>
        <p v-if="recentLearners.length === 0" class="text-[14px] text-muted">Aucun apprenant inscrit.</p>
        <ul v-else class="flex flex-col divide-y divide-line-soft">
          <li v-for="u in recentLearners" :key="u.id" class="flex items-center gap-3 py-2.5">
            <Avatar :src="u.avatar" :name="fullName(u)" :size="32"/>
            <div class="flex-1 min-w-0">
              <p class="text-[14px] text-ink truncate">{{ fullName(u) }}</p>
              <p class="text-[12px] text-muted truncate">{{ u.email }}</p>
            </div>
            <StatusChip v-bind="roleChip(u.role)" class="hidden sm:inline-flex"/>
            <span class="text-[12px] text-ink-soft shrink-0">{{ formatDate(u.createdAt) }}</span>
          </li>
        </ul>
      </DashboardSection>

      <!-- Chiffres de la plateforme -->
      <DashboardSection title="Plateforme">
        <ul class="flex flex-col divide-y divide-line-soft">
          <li v-for="row in platformRows" :key="row.label" class="py-2.5 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-surface-tint text-primary flex items-center justify-center shrink-0">
              <Icon :name="row.icon" :size="18"/>
            </div>
            <span class="text-[14px] text-ink flex-1">{{ row.label }}</span>
            <span class="text-[15px] font-semibold text-navy tabular-nums">{{ row.value }}</span>
          </li>
        </ul>
      </DashboardSection>

      <!-- Raccourcis -->
      <DashboardSection title="Raccourcis">
        <div class="flex flex-col gap-2">
          <RouterLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-tint hover:bg-surface-hover transition-colors"
          >
            <div class="w-9 h-9 rounded-full bg-accent/15 text-primary flex items-center justify-center">
              <Icon :name="link.icon" :size="20"/>
            </div>
            <span class="text-[14px] font-medium text-ink flex-1">{{ link.label }}</span>
            <Icon name="chevron_right" :size="20" class="text-muted"/>
          </RouterLink>
        </div>
      </DashboardSection>

      <PlatformSettingsCard/>
    </div>
  </template>
</template>
