<script setup>
// Correcteurs désignés sur les exercices d'un bloc.
//
// Quand un formateur quitte le bloc, il reste inscrit comme correcteur de ses exercices
// mais ne reçoit plus rien : ses rendus retombent sur tous les formateurs du bloc. Cette
// carte le signale et permet de confier d'un coup tous ses exercices à un successeur,
// sans ouvrir chaque exercice. Le transfert sert aussi pour un formateur encore présent
// dont on veut alléger la charge.
import {ref, watch} from 'vue'
import {blockService} from '@/services/blockService'
import {useDebouncedRef} from '@/composables/useDebouncedRef'
import {ROLES} from '@/utils/roles'
import {mapBackendError} from '@/utils/validators'
import Avatar from './Avatar.vue'
import Icon from './Icon.vue'
import Modal from './Modal.vue'
import StatusChip from './StatusChip.vue'

const SUCCESSOR_PAGE_SIZE = 20

const props = defineProps({
  blockId: {type: Number, required: true}
})

const correctors = ref([])
const loading = ref(true)
const error = ref('')
const success = ref('')

// Fenêtre de transfert
const source = ref(null)
const search = ref('')
const debouncedSearch = useDebouncedRef(search)
const successors = ref([])
const successorsLoading = ref(false)
const successorId = ref(null)
const transferring = ref(false)
const transferError = ref('')

const fullName = (u) => `${u.firstName} ${u.lastName}`
const exerciseCount = (count) => `${count} exercice${count > 1 ? 's' : ''}`

async function load() {
  loading.value = true
  error.value = ''
  try {
    correctors.value = await blockService.getCorrectors(props.blockId)
  } catch (err) {
    error.value = mapBackendError(err).globalError
  } finally {
    loading.value = false
  }
}

async function loadSuccessors() {
  successorsLoading.value = true
  transferError.value = ''
  try {
    const page = await blockService.getMembers(
      props.blockId,
      {role: ROLES.TEACHER, search: debouncedSearch.value.trim() || undefined},
      {size: SUCCESSOR_PAGE_SIZE}
    )
    // On ne transfère pas un compte vers lui-même.
    successors.value = page.items.filter((t) => t.id !== source.value?.userId)
  } catch (err) {
    transferError.value = mapBackendError(err).globalError
  } finally {
    successorsLoading.value = false
  }
}

function openTransfer(corrector) {
  source.value = corrector
  search.value = ''
  successorId.value = null
  success.value = ''
  loadSuccessors()
}

function closeTransfer() {
  source.value = null
}

async function confirmTransfer() {
  transferring.value = true
  transferError.value = ''
  try {
    const result = await blockService.transferCorrections(props.blockId, source.value.userId, successorId.value)
    success.value = result.message
    closeTransfer()
    await load()
  } catch (err) {
    transferError.value = mapBackendError(err).globalError
  } finally {
    transferring.value = false
  }
}

watch(debouncedSearch, () => {
  if (source.value) {
    loadSuccessors()
  }
})

load()

// La page recharge la carte quand les membres changent : retirer un formateur du bloc
// change son état ici.
defineExpose({reload: load})
</script>

<template>
  <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
    <h2 class="text-[17px] font-semibold text-ink">Correcteurs des exercices</h2>
    <p class="text-[13px] text-muted mt-1 mb-4">
      Formateurs désignés comme correcteurs sur au moins un exercice du bloc.
    </p>

    <p v-if="success" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-4" role="status">
      {{ success }}
    </p>

    <p v-if="loading" class="text-[14px] text-muted">Chargement des correcteurs...</p>
    <p v-else-if="error" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">{{ error }}</p>
    <p v-else-if="correctors.length === 0" class="text-[14px] text-ink-soft">
      Aucun correcteur désigné : les rendus sont envoyés à tous les formateurs du bloc.
    </p>

    <ul v-else class="divide-y divide-line-soft">
      <li v-for="c in correctors" :key="c.userId" class="flex flex-wrap items-center gap-3 py-3">
        <Avatar :name="fullName(c)" :size="36"/>
        <div class="min-w-0 flex-1">
          <p class="text-[14px] font-medium text-ink truncate">{{ fullName(c) }}</p>
          <p class="text-[12px] text-muted truncate">{{ c.email }}</p>
        </div>
        <span class="text-[13px] text-ink-soft tabular-nums">{{ exerciseCount(c.exerciseCount) }}</span>
        <StatusChip v-if="!c.teachesBlock" label="Plus formateur du bloc" variant="warning" icon="warning"/>
        <button
          type="button"
          class="h-9 px-3 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-1.5 hover:bg-surface-tint transition-colors"
          @click="openTransfer(c)"
        >
          <Icon name="arrow_forward" :size="16"/>
          Transférer ses corrections
        </button>
      </li>
    </ul>

    <Modal v-if="source" @close="closeTransfer">
      <div class="p-6 flex flex-col gap-4">
        <div>
          <h2 class="text-[18px] font-semibold text-ink">Transférer les corrections</h2>
          <p class="text-[13px] text-ink-soft mt-1">
            Les {{ exerciseCount(source.exerciseCount) }} de {{ fullName(source) }} seront confiés au formateur
            choisi. Les autres correcteurs de ces exercices restent en place.
          </p>
        </div>

        <div class="flex items-center gap-2 h-10 px-3 border border-input rounded-[10px] bg-white">
          <Icon name="search" :size="18" class="text-muted"/>
          <label for="successor-search" class="sr-only">Rechercher un formateur</label>
          <input id="successor-search" v-model="search" placeholder="Nom ou e-mail"
                 class="flex-1 outline-none text-[14px] bg-transparent"/>
        </div>

        <div class="max-h-[300px] overflow-y-auto -mx-2">
          <p v-if="successorsLoading && successors.length === 0" class="text-[14px] text-muted px-2">
            Chargement des formateurs...
          </p>
          <p v-else-if="successors.length === 0" class="text-[14px] text-ink-soft px-2">
            {{ search ? 'Aucun formateur ne correspond à cette recherche.' : 'Aucun autre formateur dans ce bloc.' }}
          </p>
          <fieldset v-else>
            <legend class="sr-only">Successeur</legend>
            <label v-for="t in successors" :key="t.id" :for="`successor-${t.id}`"
                   class="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors"
                   :class="successorId === t.id ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-surface-tint'">
              <input :id="`successor-${t.id}`" v-model="successorId" type="radio" name="successor" :value="t.id"
                     class="w-4 h-4 accent-[#0047ab] shrink-0"/>
              <Avatar :src="t.avatar" :name="fullName(t)" :size="32"/>
              <span class="min-w-0 flex-1">
                <span class="text-[14px] text-ink block truncate">{{ fullName(t) }}</span>
                <span class="text-[12px] text-muted block truncate">{{ t.email }}</span>
              </span>
            </label>
          </fieldset>
        </div>

        <p v-if="transferError" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">
          {{ transferError }}
        </p>

        <div class="flex justify-end gap-2">
          <button type="button" class="h-10 px-4 rounded-[10px] text-sm font-semibold text-ink-soft hover:bg-surface-tint"
                  @click="closeTransfer">
            Annuler
          </button>
          <button type="button"
                  class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  :disabled="!successorId || transferring"
                  @click="confirmTransfer">
            {{ transferring ? 'Transfert...' : 'Transférer' }}
          </button>
        </div>
      </div>
    </Modal>
  </section>
</template>
