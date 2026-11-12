<script setup>
// Liste paginée de comptes avec recherche, filtres et sélection multiple.
// Sert deux fois sur l'écran des membres d'un bloc : les membres actuels et les comptes
// qu'on peut encore ajouter. Le parent fournit le chargement et l'action à appliquer.
//
// La sélection survit au changement de page : on peut cocher des comptes sur la page 1
// puis sur la page 2 avant d'appliquer l'action. Elle est vidée quand un filtre change,
// pour ne jamais agir sur des comptes qui ne sont plus affichés.
import {computed, onMounted, ref, watch} from 'vue'
import {usePagedList} from '@/composables/usePagedList'
import {useDebouncedRef} from '@/composables/useDebouncedRef'
import {roleChip, ROLES} from '@/utils/roles'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'
import Pagination from '@/components/Pagination.vue'

const props = defineProps({
  // Identifiant unique, préfixe des id des champs du formulaire.
  listId: {type: String, required: true},
  title: {type: String, required: true},
  emptyText: {type: String, required: true},
  // (page, filtres) => Promise<page normalisée>
  fetcher: {type: Function, required: true},
  actionLabel: {type: String, required: true},
  actionIcon: {type: String, default: 'check'},
  // Style du bouton d'action : 'primary' ou 'danger'.
  actionVariant: {type: String, default: 'primary'},
  // Promotions proposées dans le filtre. Liste vide : pas de filtre de promotion.
  promotions: {type: Array, default: () => []},
  // Action en cours chez le parent : boutons désactivés.
  busy: {type: Boolean, default: false}
})

// action : identifiants sélectionnés. filters : filtres courants, pour le parent.
const emit = defineEmits(['action', 'filters'])

const ROLE_OPTIONS = [ROLES.USER, ROLES.TEACHER]

const search = ref('')
const debouncedSearch = useDebouncedRef(search)
const role = ref('')
const promotionId = ref('')

const filters = computed(() => ({
  search: debouncedSearch.value.trim() || undefined,
  role: role.value || undefined,
  promotionId: promotionId.value ? Number(promotionId.value) : undefined
}))

const {items, page, totalPages, totalElements, loading, error, load, goToPage, refresh} = usePagedList(
  ({page: current, ...activeFilters}) => props.fetcher(current, activeFilters),
  {filters: () => filters.value, errorMessage: 'Impossible de charger les comptes.'}
)

// Identifiant vers compte : le compte reste connu même quand sa page n'est plus affichée.
const selected = ref(new Map())

const selectedCount = computed(() => selected.value.size)
const allPageSelected = computed(() =>
  items.value.length > 0 && items.value.every((u) => selected.value.has(u.id))
)

function toggle(user) {
  const next = new Map(selected.value)
  if (next.has(user.id)) {
    next.delete(user.id)
  } else {
    next.set(user.id, user)
  }
  selected.value = next
}

function togglePage() {
  const next = new Map(selected.value)
  if (allPageSelected.value) {
    items.value.forEach((u) => next.delete(u.id))
  } else {
    items.value.forEach((u) => next.set(u.id, u))
  }
  selected.value = next
}

function clearSelection() {
  selected.value = new Map()
}

watch(filters, (value) => {
  clearSelection()
  emit('filters', value)
}, {deep: true})

function fullName(user) {
  return `${user.firstName} ${user.lastName}`
}

const actionClass = computed(() =>
  props.actionVariant === 'danger'
    ? 'bg-danger text-white hover:opacity-90'
    : 'bg-primary text-white hover:opacity-90'
)

/**
 * Recharge la liste et vide la sélection. Appelé par le parent après une action.
 */
async function reset() {
  clearSelection()
  await refresh()
}

defineExpose({reset})

onMounted(load)
</script>

<template>
  <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex flex-col gap-4 min-w-0">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-[17px] font-semibold text-ink">{{ title }}</h2>
      <span class="text-[13px] text-ink-soft">{{ totalElements }} compte{{ totalElements > 1 ? 's' : '' }}</span>
    </div>

    <!-- Filtres -->
    <div class="flex flex-wrap gap-2">
      <div class="flex items-center gap-2 flex-1 min-w-[180px] h-10 px-3 border border-input rounded-[10px] bg-white">
        <Icon name="search" :size="18" class="text-muted"/>
        <label :for="`${listId}-search`" class="sr-only">Rechercher un compte</label>
        <input :id="`${listId}-search`" v-model="search" placeholder="Nom ou e-mail"
               class="flex-1 outline-none text-[14px] bg-transparent"/>
      </div>
      <label :for="`${listId}-role`" class="sr-only">Filtrer par rôle</label>
      <select :id="`${listId}-role`" v-model="role"
              class="h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white">
        <option value="">Rôle : tous</option>
        <option v-for="r in ROLE_OPTIONS" :key="r" :value="r">{{ roleChip(r).label }}</option>
      </select>
      <template v-if="promotions.length">
        <label :for="`${listId}-promotion`" class="sr-only">Filtrer par promotion</label>
        <select :id="`${listId}-promotion`" v-model="promotionId"
                class="h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white max-w-[220px]">
          <option value="">Promotion : toutes</option>
          <option v-for="p in promotions" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </template>
    </div>

    <!-- Barre de sélection -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <label :for="`${listId}-select-page`" class="flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer">
        <input :id="`${listId}-select-page`" type="checkbox" class="w-4 h-4 rounded accent-[#0047ab]"
               :checked="allPageSelected" :disabled="items.length === 0"
               @change="togglePage"/>
        Toute la page
      </label>
      <div class="flex items-center gap-2">
        <slot name="extra-actions" :filters="filters" :busy="busy"/>
        <button type="button"
                class="h-9 px-3 rounded-[10px] text-sm font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                :class="actionClass"
                :disabled="selectedCount === 0 || busy"
                @click="emit('action', [...selected.keys()])">
          <Icon :name="actionIcon" :size="16"/>
          {{ actionLabel }}{{ selectedCount ? ` (${selectedCount})` : '' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-[14px] text-muted py-6 text-center">Chargement...</div>
    <div v-else-if="error" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>
    <p v-else-if="items.length === 0" class="text-[14px] text-muted py-6 text-center">
      {{ filters.search || filters.role || filters.promotionId ? 'Aucun résultat pour ces filtres.' : emptyText }}
    </p>

    <ul v-else class="flex flex-col divide-y divide-line-soft">
      <li v-for="u in items" :key="u.id">
        <label :for="`${listId}-user-${u.id}`"
               class="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors"
               :class="selected.has(u.id) ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-surface-tint'">
          <input :id="`${listId}-user-${u.id}`" type="checkbox" class="w-4 h-4 rounded accent-[#0047ab] shrink-0"
                 :checked="selected.has(u.id)" @change="toggle(u)"/>
          <Avatar :src="u.avatar" :name="fullName(u)" :size="32"/>
          <span class="min-w-0 flex-1">
            <span class="text-[14px] text-ink block truncate">{{ fullName(u) }}</span>
            <span class="text-[12px] text-muted block truncate">{{ u.email }}</span>
          </span>
          <span class="hidden sm:block text-[12px] text-ink-soft truncate max-w-[120px]">{{ u.promotionName || '' }}</span>
          <StatusChip v-bind="roleChip(u.role)"/>
        </label>
      </li>
    </ul>

    <Pagination v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total-elements="totalElements"
                item-label="comptes" @change="goToPage"/>
  </section>
</template>
