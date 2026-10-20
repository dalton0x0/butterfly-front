<script setup>
// Recherche globale de la barre de navigation.
//
// La saisie est retardée (useDebouncedRef) puis envoyée au serveur qui applique le
// périmètre de l'utilisateur. Les résultats sont regroupés par nature. Un résultat
// verrouillé reste visible mais n'est pas cliquable comme dans la liste d'un module.
//
// Clavier : flèches pour se déplacer, Entrée pour ouvrir, Échap pour fermer.
import {computed, nextTick, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {useDebouncedRef} from '@/composables/useDebouncedRef'
import {MIN_SEARCH_LENGTH, searchService} from '@/services/searchService'
import {toSearchGroups} from '@/utils/searchResults'
import Icon from './Icon.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const open = ref(false)
const input = ref(null)
const term = ref('')
const debouncedTerm = useDebouncedRef(term, 250)
const response = ref(null)
const activeIndex = ref(-1)

const {loading, error, run} = useAsyncTask('La recherche a échoué.')

const trimmed = computed(() => term.value.trim())
const tooShort = computed(() => trimmed.value.length < MIN_SEARCH_LENGTH)
const groups = computed(() => toSearchGroups(response.value, auth.role))

// Résultats atteignables au clavier, dans l'ordre d'affichage.
const navigable = computed(() =>
  groups.value.flatMap((group) => group.hits).filter((hit) => !hit.locked && hit.to))

const activeKey = computed(() => {
  const hit = navigable.value[activeIndex.value]
  return hit ? hitKey(hit) : null
})

function hitKey(hit) {
  return `${hit.type}-${hit.id}`
}

watch(debouncedTerm, async (value) => {
  activeIndex.value = -1
  if (value.trim().length < MIN_SEARCH_LENGTH) {
    response.value = null
    return
  }
  const result = await run(() => searchService.search(value.trim()))
  if (result) {
    response.value = result
  }
})

// Un changement de page ferme la recherche : le résultat choisi est ouvert.
watch(() => route.fullPath, close)

function toggle() {
  if (open.value) {
    close()
    return
  }
  open.value = true
  nextTick(() => input.value?.focus())
}

function close() {
  open.value = false
  term.value = ''
  response.value = null
  activeIndex.value = -1
}

function move(step) {
  const count = navigable.value.length
  if (count === 0) {
    return
  }
  activeIndex.value = (activeIndex.value + step + count) % count
}

function openActive() {
  const hit = navigable.value[activeIndex.value] ?? navigable.value[0]
  if (hit) {
    router.push(hit.to)
  }
}
</script>

<template>
  <div class="relative hidden sm:flex items-center">
    <!-- Couche transparente : un clic à l'extérieur ferme la recherche -->
    <div v-if="open" class="fixed inset-0 z-40" @click="close"></div>

    <div
      v-if="open"
      class="relative z-50 flex items-center gap-2 h-9 px-3 mr-1 rounded-full bg-white/15 backdrop-blur-sm"
    >
      <Icon name="search" :size="20" class="text-white/80"/>
      <label for="navbar-search" class="sr-only">Rechercher dans la plateforme</label>
      <input
        id="navbar-search"
        ref="input"
        v-model="term"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-controls="navbar-search-results"
        :aria-expanded="!tooShort"
        :aria-activedescendant="activeKey ? `navbar-search-${activeKey}` : undefined"
        placeholder="Rechercher..."
        class="bg-transparent outline-none text-sm text-white placeholder:text-white/60 w-56"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="openActive"
        @keydown.esc="close"
      />
      <button class="text-white/70 hover:text-white" aria-label="Fermer la recherche" @click="close">
        <Icon name="close" :size="18"/>
      </button>
    </div>

    <button
      v-else
      class="text-white p-2 rounded-full hover:bg-white/10 transition-colors"
      aria-label="Rechercher"
      @click="toggle"
    >
      <Icon name="search" :size="22"/>
    </button>

    <!-- Résultats -->
    <div
      v-if="open && trimmed.length > 0"
      id="navbar-search-results"
      role="listbox"
      aria-label="Résultats de recherche"
      class="absolute right-0 top-full mt-3 z-50 w-[420px] max-h-[70vh] overflow-auto bg-surface rounded-2xl shadow-lg border border-line py-2"
    >
      <p v-if="tooShort" class="px-4 py-3 text-[13px] text-muted">
        Saisissez au moins {{ MIN_SEARCH_LENGTH }} caractères.
      </p>
      <p v-else-if="error" class="px-4 py-3 text-[13px] text-danger">{{ error }}</p>
      <p v-else-if="loading && !response" class="px-4 py-3 text-[13px] text-muted">Recherche...</p>
      <p v-else-if="response && groups.length === 0" class="px-4 py-3 text-[13px] text-muted">
        Aucun résultat pour « {{ trimmed }} ».
      </p>

      <section v-for="group in groups" :key="group.key" class="py-1">
        <h3 class="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {{ group.label }}
        </h3>
        <component
          :is="hit.locked || !hit.to ? 'div' : 'RouterLink'"
          v-for="hit in group.hits"
          :id="`navbar-search-${hitKey(hit)}`"
          :key="hitKey(hit)"
          :to="hit.locked ? undefined : hit.to"
          role="option"
          :aria-selected="activeKey === hitKey(hit)"
          :aria-disabled="hit.locked ? 'true' : undefined"
          class="flex items-center gap-3 px-4 py-2 transition-colors"
          :class="[
            hit.locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-surface-hover',
            activeKey === hitKey(hit) ? 'bg-surface-tint' : ''
          ]"
        >
          <Icon :name="hit.locked ? 'lock' : group.icon" :size="18"
                :class="hit.locked ? 'text-muted' : 'text-primary'" class="shrink-0"/>
          <span class="min-w-0">
            <span class="block text-[14px] text-ink truncate">{{ hit.title }}</span>
            <span v-if="hit.context || hit.locked" class="block text-[12px] text-muted truncate">
              {{ hit.locked ? 'Verrouillé' : '' }}{{ hit.locked && hit.context ? ' · ' : '' }}{{ hit.context }}
            </span>
          </span>
        </component>
      </section>
    </div>
  </div>
</template>
