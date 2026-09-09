<script setup>
// Espace formateur : liste des apprenants. Chaque ligne mène à la page détail
// complète de l'apprenant (progression, activité). GET /api/users (filtré USER).
import {computed, onMounted, ref} from 'vue'
import {ROLES} from '@/utils/roles'
import {useRouter} from 'vue-router'
import {userService} from '@/services/userService'
import {usePagedList} from '@/composables/usePagedList'
import {useDebouncedRef} from '@/composables/useDebouncedRef'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Avatar from '@/components/Avatar.vue'
import Pagination from '@/components/Pagination.vue'

const router = useRouter()

const search = ref('')
const debouncedSearch = useDebouncedRef(search)

/*
  Le filtre de rôle passe au serveur.

  La page était auparavant filtrée après réception : sur une page contenant surtout des
  formateurs, la liste des apprenants affichée était arbitrairement courte et le compte
  affiché n'avait aucun rapport avec le nombre réel d'apprenants.
*/
const filters = computed(() => ({
  search: debouncedSearch.value.trim() || undefined
}))

const {items: learners, page, totalPages, totalElements, loading, error, load, goToPage} = usePagedList(
  ({page: current, search: term}) =>
    userService.getUsers({page: current, role: ROLES.USER, search: term}),
  {filters: () => filters.value, errorMessage: 'Impossible de charger les apprenants.'}
)

const hasActiveFilter = computed(() => Boolean(filters.value.search))

function openDetail(userId) {
  router.push(`/formateur/apprenants/${userId}`)
}

onMounted(load)
</script>

<template>
  <h1 class="text-[30px] font-semibold text-navy mb-6">Apprenants</h1>

  <!-- La barre de recherche reste montée pendant le chargement.
       Chaque frappe déclenche désormais une requête : si le champ était retiré du DOM à
       ce moment, il perdrait le focus et la saisie deviendrait impossible. -->
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex mb-6">
    <div class="flex items-center gap-2 flex-1 h-10 px-3 border border-input rounded-[10px] bg-white">
      <Icon name="search" :size="20" class="text-muted"/>
      <label for="learners-search" class="sr-only">Rechercher un apprenant</label>
      <input id="learners-search" v-model="search" placeholder="Rechercher un apprenant"
             class="flex-1 outline-none text-[14px] bg-transparent"/>
    </div>
  </div>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des apprenants...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <!-- Table -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <p v-if="learners.length === 0" class="px-5 py-8 text-[15px] text-muted text-center">
        {{ hasActiveFilter ? 'Aucun résultat pour cette recherche.' : 'Aucun apprenant à afficher.' }}
      </p>
      <table v-else class="w-full text-[14px]">
        <thead>
        <tr class="bg-surface-tint text-[13px] text-ink-soft text-left">
          <th class="px-5 py-3 font-medium">Apprenant</th>
          <th class="px-5 py-3 font-medium">E-mail</th>
          <th class="px-5 py-3 font-medium">Promotion</th>
          <th class="px-5 py-3 font-medium">Statut</th>
          <th class="px-5 py-3 font-medium text-right">Action</th>
        </tr>
        </thead>
        <tbody>
        <tr
          v-for="u in learners"
          :key="u.id"
          class="border-t border-line-soft hover:bg-surface-hover transition-colors cursor-pointer"
          @click="openDetail(u.id)"
        >
          <td class="px-5 py-3">
            <div class="flex items-center gap-2.5">
              <Avatar :src="u.avatar" :name="`${u.firstName} ${u.lastName}`" :size="46"/>
              <span class="text-ink">{{ u.firstName }} {{ u.lastName }}</span>
            </div>
          </td>
          <td class="px-5 py-3 text-ink-soft">{{ u.email }}</td>
          <td class="px-5 py-3 text-ink-soft">{{ u.promotionName || '-' }}</td>
          <td class="px-5 py-3">
            <StatusChip
              :label="u.enabled ? 'Actif' : 'Désactivé'"
              :variant="u.enabled ? 'success' : 'neutral'"
            />
          </td>
          <td class="px-5 py-3 text-right">
            <button class="text-primary hover:bg-surface-tint p-2 rounded-full transition-colors"
                    @click.stop="openDetail(u.id)">
              <Icon name="visibility" :size="20"/>
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <Pagination
        :page="page"
        :total-pages="totalPages"
        :total-elements="totalElements"
        item-label="apprenants"
        @change="goToPage"
      />
    </div>
  </template>
</template>
