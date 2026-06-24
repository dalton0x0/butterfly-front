<script setup>
// Espace formateur : liste des apprenants. Chaque ligne mène à la page détail
// complète de l'apprenant (progression, activité). GET /api/users (filtré USER).
import {ref, computed, onMounted} from 'vue'
import {ROLES} from '@/utils/roles'
import {useRouter} from 'vue-router'
import {userService} from '@/services/userService'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Avatar from '@/components/Avatar.vue'

const router = useRouter()

const loading = ref(true)
const error = ref('')
const learners = ref([])
const search = ref('')

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) {
    return learners.value
  }
  return learners.value.filter(
      (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) ||
          (u.email || '').toLowerCase().includes(term)
  )
})

function openDetail(userId) {
  router.push(`/formateur/apprenants/${userId}`)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const page = await userService.getUsers()
    learners.value = page.items.filter((u) => u.role === ROLES.USER)
  } catch (err) {
    error.value = err.message || 'Impossible de charger les apprenants.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <h1 class="text-[30px] font-semibold text-navy mb-6">Apprenants</h1>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des apprenants...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <!-- Recherche -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex mb-6">
      <div class="flex items-center gap-2 flex-1 h-10 px-3 border border-input rounded-[10px] bg-white">
        <Icon name="search" :size="20" class="text-muted"/>
        <input v-model="search" placeholder="Rechercher un apprenant"
               class="flex-1 outline-none text-[14px] bg-transparent"/>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <p v-if="filtered.length === 0" class="px-5 py-8 text-[15px] text-muted text-center">Aucun apprenant à
        afficher.</p>
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
            v-for="u in filtered"
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
    </div>
  </template>
</template>
