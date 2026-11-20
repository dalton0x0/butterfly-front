<script setup>
// Correcteurs d'un exercice : les formateurs prévenus de ses soumissions.
//
// L'administration (administrateur et gestionnaire) choisit parmi les formateurs du bloc.
// Un formateur voit la liste sans la modifier. Sans correcteur, tous les formateurs du
// bloc sont prévenus : l'écran le dit pour que l'absence de choix ne soit pas prise pour
// un oubli.
import {computed, onMounted, ref} from 'vue'
import {exerciseService} from '@/services/exerciseService'
import {blockService} from '@/services/blockService'
import {ROLES} from '@/utils/roles'
import {MAX_PAGE_SIZE} from '@/utils/pagination'
import {mapBackendError} from '@/utils/validators'
import Avatar from './Avatar.vue'

const props = defineProps({
  exerciseId: {type: Number, required: true},
  blockId: {type: Number, required: true},
  // Administrateur ou gestionnaire : seuls eux désignent les correcteurs.
  editable: {type: Boolean, default: false}
})

const correctors = ref([])
const teachers = ref([])
const selected = ref(new Set())
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const fullName = (u) => `${u.firstName} ${u.lastName}`

// Ne propose l'enregistrement que si la sélection diffère de la liste enregistrée.
const changed = computed(() => {
  const current = new Set(correctors.value.map((u) => u.id))
  return current.size !== selected.value.size || [...selected.value].some((id) => !current.has(id))
})

function resetSelection() {
  selected.value = new Set(correctors.value.map((u) => u.id))
}

function toggle(teacher) {
  const next = new Set(selected.value)
  if (next.has(teacher.id)) {
    next.delete(teacher.id)
  } else {
    next.add(teacher.id)
  }
  selected.value = next
  saved.value = false
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [current, members] = await Promise.all([
      exerciseService.getCorrectors(props.exerciseId),
      props.editable
        ? blockService.getMembers(props.blockId, {role: ROLES.TEACHER}, {size: MAX_PAGE_SIZE})
        : Promise.resolve({items: []})
    ])
    correctors.value = current
    teachers.value = members.items
    resetSelection()
  } catch (err) {
    error.value = mapBackendError(err).globalError
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    correctors.value = await exerciseService.updateCorrectors(props.exerciseId, [...selected.value])
    resetSelection()
    saved.value = true
  } catch (err) {
    error.value = mapBackendError(err).globalError
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="text-[15px] font-semibold text-ink">Correcteurs</h2>
    <p class="text-[13px] text-muted mb-3">
      Les correcteurs sont prévenus de chaque rendu. Sans correcteur, tous les formateurs du bloc le sont.
    </p>

    <p v-if="loading" class="text-[14px] text-muted">Chargement des correcteurs...</p>

    <!-- Lecture seule : formateur -->
    <template v-else-if="!editable">
      <p v-if="correctors.length === 0" class="text-[14px] text-ink-soft">
        Aucun correcteur désigné : tous les formateurs du bloc sont prévenus.
      </p>
      <ul v-else class="flex flex-wrap gap-2">
        <li v-for="u in correctors" :key="u.id"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-tint text-[14px] text-ink">
          <Avatar :name="fullName(u)" :size="24"/>
          {{ fullName(u) }}
        </li>
      </ul>
    </template>

    <!-- Choix parmi les formateurs du bloc : administration -->
    <template v-else>
      <p v-if="teachers.length === 0" class="text-[14px] text-ink-soft">
        Aucun formateur n'est rattaché à ce bloc. Ajoutez-en depuis la gestion des membres du bloc.
      </p>
      <fieldset v-else>
        <legend class="sr-only">Formateurs du bloc</legend>
        <label v-for="t in teachers" :key="t.id" :for="`corrector-${t.id}`"
               class="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors"
               :class="selected.has(t.id) ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-surface-tint'">
          <input :id="`corrector-${t.id}`" type="checkbox" class="w-4 h-4 rounded accent-[#0047ab] shrink-0"
                 :checked="selected.has(t.id)" @change="toggle(t)"/>
          <Avatar :src="t.avatar" :name="fullName(t)" :size="32"/>
          <span class="min-w-0 flex-1">
            <span class="text-[14px] text-ink block truncate">{{ fullName(t) }}</span>
            <span class="text-[12px] text-muted block truncate">{{ t.email }}</span>
          </span>
        </label>
      </fieldset>

      <div v-if="teachers.length > 0" class="flex items-center justify-end gap-3 mt-3">
        <span v-if="saved" class="text-[12px] text-success">Enregistré</span>
        <button
          type="button"
          :disabled="saving || !changed"
          class="h-9 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          @click="save"
        >
          {{ saving ? 'Enregistrement...' : 'Enregistrer les correcteurs' }}
        </button>
      </div>
    </template>

    <p v-if="error" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mt-2">{{ error }}</p>
  </div>
</template>
