<script setup>
// Correcteurs d'un exercice : les formateurs prévenus de ses soumissions.
//
// Les correcteurs s'affichent en pastilles. L'administration (administrateur et
// gestionnaire) en retire un d'un clic, ou ouvre une fenêtre avec une recherche pour
// choisir parmi les formateurs du bloc. La recherche évite une longue liste de cases
// quand le bloc compte beaucoup de formateurs. Un formateur voit les pastilles sans les
// modifier. Sans correcteur, tous les formateurs du bloc sont prévenus : l'écran le dit
// pour que l'absence de choix ne soit pas prise pour un oubli.
import {ref, watch} from 'vue'
import {exerciseService} from '@/services/exerciseService'
import {blockService} from '@/services/blockService'
import {useDebouncedRef} from '@/composables/useDebouncedRef'
import {ROLES} from '@/utils/roles'
import {mapBackendError} from '@/utils/validators'
import Avatar from './Avatar.vue'
import Icon from './Icon.vue'
import Modal from './Modal.vue'

// Assez pour un bloc courant. Au-delà, la recherche prend le relais.
const PICKER_PAGE_SIZE = 20

const props = defineProps({
  exerciseId: {type: Number, required: true},
  blockId: {type: Number, required: true},
  // Administrateur ou gestionnaire : seuls eux désignent les correcteurs.
  editable: {type: Boolean, default: false}
})

const correctors = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

// Fenêtre de choix
const pickerOpen = ref(false)
const search = ref('')
const debouncedSearch = useDebouncedRef(search)
const teachers = ref([])
const totalTeachers = ref(0)
const teachersLoading = ref(false)
const pickerError = ref('')
const selected = ref(new Set())

const fullName = (u) => `${u.firstName} ${u.lastName}`

async function load() {
  loading.value = true
  error.value = ''
  try {
    correctors.value = await exerciseService.getCorrectors(props.exerciseId)
  } catch (err) {
    error.value = mapBackendError(err).globalError
  } finally {
    loading.value = false
  }
}

async function save(ids) {
  saving.value = true
  error.value = ''
  try {
    correctors.value = await exerciseService.updateCorrectors(props.exerciseId, ids)
    return true
  } catch (err) {
    error.value = mapBackendError(err).globalError
    return false
  } finally {
    saving.value = false
  }
}

// Retrait direct depuis une pastille : pas besoin d'ouvrir la fenêtre pour une seule personne.
function remove(corrector) {
  return save(correctors.value.filter((u) => u.id !== corrector.id).map((u) => u.id))
}

async function loadTeachers() {
  teachersLoading.value = true
  pickerError.value = ''
  try {
    const page = await blockService.getMembers(
      props.blockId,
      {role: ROLES.TEACHER, search: debouncedSearch.value.trim() || undefined},
      {size: PICKER_PAGE_SIZE}
    )
    teachers.value = page.items
    totalTeachers.value = page.totalElements ?? page.items.length
  } catch (err) {
    pickerError.value = mapBackendError(err).globalError
  } finally {
    teachersLoading.value = false
  }
}

function openPicker() {
  selected.value = new Set(correctors.value.map((u) => u.id))
  search.value = ''
  pickerOpen.value = true
  loadTeachers()
}

function toggle(teacher) {
  const next = new Set(selected.value)
  if (next.has(teacher.id)) {
    next.delete(teacher.id)
  } else {
    next.add(teacher.id)
  }
  selected.value = next
}

// La sélection est gardée par identifiant : un formateur coché reste choisi même
// quand la recherche le masque.
async function confirmPicker() {
  if (await save([...selected.value])) {
    pickerOpen.value = false
  }
}

watch(debouncedSearch, () => {
  if (pickerOpen.value) {
    loadTeachers()
  }
})

load()
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 class="text-[15px] font-semibold text-ink">Correcteurs</h2>
        <p class="text-[13px] text-muted">
          Les correcteurs sont prévenus de chaque rendu. Sans correcteur, tous les formateurs du bloc le sont.
        </p>
      </div>
      <button
        v-if="editable && !loading"
        type="button"
        class="h-9 px-3 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-1.5 hover:bg-surface-tint transition-colors shrink-0"
        @click="openPicker"
      >
        <Icon name="person_add" :size="16"/>
        Gérer les correcteurs
      </button>
    </div>

    <p v-if="loading" class="text-[14px] text-muted">Chargement des correcteurs...</p>

    <template v-else>
      <p v-if="correctors.length === 0" class="text-[14px] text-ink-soft">
        Aucun correcteur désigné : tous les formateurs du bloc sont prévenus.
      </p>
      <ul v-else class="flex flex-wrap gap-2">
        <li v-for="u in correctors" :key="u.id"
            class="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-accent/10 text-[14px] text-ink">
          <Avatar :src="u.avatar" :name="fullName(u)" :size="24"/>
          {{ fullName(u) }}
          <button
            v-if="editable"
            type="button"
            class="-mr-1 p-0.5 rounded-full text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
            :aria-label="`Retirer ${fullName(u)} des correcteurs`"
            :disabled="saving"
            @click="remove(u)"
          >
            <Icon name="close" :size="16"/>
          </button>
        </li>
      </ul>
    </template>

    <p v-if="error && !pickerOpen" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mt-2">
      {{ error }}
    </p>

    <Modal v-if="pickerOpen" @close="pickerOpen = false">
      <div class="p-6 flex flex-col gap-4">
        <div>
          <h2 class="text-[18px] font-semibold text-ink">Correcteurs de l'exercice</h2>
          <p class="text-[13px] text-muted mt-1">Seuls les formateurs du bloc peuvent corriger.</p>
        </div>

        <div class="flex items-center gap-2 h-10 px-3 border border-input rounded-[10px] bg-white">
          <Icon name="search" :size="18" class="text-muted"/>
          <label for="corrector-search" class="sr-only">Rechercher un formateur</label>
          <input id="corrector-search" v-model="search" placeholder="Nom ou e-mail"
                 class="flex-1 outline-none text-[14px] bg-transparent"/>
        </div>

        <div class="max-h-[320px] overflow-y-auto -mx-2">
          <p v-if="teachersLoading && teachers.length === 0" class="text-[14px] text-muted px-2">
            Chargement des formateurs...
          </p>
          <p v-else-if="pickerError" class="text-[13px] text-danger px-2">{{ pickerError }}</p>
          <p v-else-if="teachers.length === 0" class="text-[14px] text-ink-soft px-2">
            {{ search ? 'Aucun formateur ne correspond à cette recherche.' : "Aucun formateur n'est rattaché à ce bloc." }}
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
          <p v-if="totalTeachers > teachers.length" class="text-[12px] text-muted px-2 mt-2">
            Seuls les {{ teachers.length }} premiers formateurs sont affichés. Affinez la recherche pour trouver les autres.
          </p>
        </div>

        <p v-if="error" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">{{ error }}</p>

        <div class="flex items-center justify-between gap-2">
          <span class="text-[13px] text-ink-soft">
            {{ selected.size }} sélectionné{{ selected.size > 1 ? 's' : '' }}
          </span>
          <div class="flex gap-2">
            <button type="button"
                    class="h-10 px-4 rounded-[10px] text-sm font-semibold text-ink-soft hover:bg-surface-tint"
                    @click="pickerOpen = false">
              Annuler
            </button>
            <button type="button"
                    class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                    :disabled="saving"
                    @click="confirmPicker">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>
