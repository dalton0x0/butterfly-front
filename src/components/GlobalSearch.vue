<script setup>
// Recherche globale de la barre de navigation.
//
// La saisie est retardée (useDebouncedRef) puis envoyée au serveur qui applique le
// périmètre de l'utilisateur. Les résultats sont regroupés par nature. Un résultat
// verrouillé reste visible mais n'est pas cliquable comme dans la liste d'un module.
//
// Le champ s'ouvre par-dessus la barre de navigation au lieu de s'y insérer. Inséré, il
// poussait les liens en s'élargissant : l'animation saccadait et la barre de l'admin,
// déjà chargée n'avait plus la place. Superposé, il prend la même place quel que soit
// le nombre de liens sur mobile comme sur ordinateur.
//
// Le composant suppose que le conteneur de la barre est positionné (relative) : c'est
// lui qui sert de repère au champ superposé.
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
const trigger = ref(null)
// Terme dont la réponse affichée est issue. Tant qu'il diffère de la saisie, une
// recherche est en attente : délai de frappe écoulé ou requête en cours.
const searchedTerm = ref('')
const term = ref('')
const debouncedTerm = useDebouncedRef(term, 250)
const response = ref(null)
const activeIndex = ref(-1)

const {loading, error, run} = useAsyncTask('La recherche a échoué.')

const trimmed = computed(() => term.value.trim())
const tooShort = computed(() => trimmed.value.length < MIN_SEARCH_LENGTH)
const groups = computed(() => toSearchGroups(response.value, auth.role))
const pending = computed(() => !tooShort.value && searchedTerm.value !== trimmed.value)

// Un seul état affiché à la fois et toujours un : le panneau ne s'ouvre jamais vide.
// Sans cet état, il apparaissait vide entre le deuxième caractère et l'arrivée de la
// réponse, le temps du délai de frappe.
const panelState = computed(() => {
  if (tooShort.value) {
    return 'short'
  }
  if (error.value && !pending.value) {
    return 'error'
  }
  if (groups.value.length > 0) {
    return 'results'
  }
  if (!pending.value && !loading.value) {
    return 'empty'
  }
  return 'searching'
})

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
  const searched = value.trim()
  const result = await run(() => searchService.search(searched))
  if (result) {
    response.value = result
    searchedTerm.value = searched
  } else if (error.value) {
    searchedTerm.value = searched
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
  const wasOpen = open.value
  open.value = false
  term.value = ''
  searchedTerm.value = ''
  response.value = null
  activeIndex.value = -1
  // Le focus revient au bouton qui a ouvert la recherche pour le clavier.
  if (wasOpen) {
    nextTick(() => trigger.value?.focus())
  }
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
  <!-- Bouton d'ouverture : il reste à sa place, le champ s'ouvre par-dessus -->
  <button
    ref="trigger"
    type="button"
    class="inline-flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
    aria-label="Rechercher"
    :aria-expanded="open"
    @click="toggle"
  >
    <Icon name="search" :size="22"/>
  </button>

  <!-- Couche transparente : un clic à l'extérieur ferme la recherche -->
  <div v-if="open" class="fixed inset-0 z-40" @click="close"></div>

  <Transition name="search-overlay">
    <div
      v-if="open"
      class="absolute inset-y-0 right-0 left-0 sm:left-auto sm:w-[520px] z-50 flex items-center px-4 sm:px-6 bg-primary-dark"
    >
      <div class="relative w-full">
        <div class="flex items-center gap-1 h-10 pl-3 pr-1 rounded-full bg-white/15">
          <Icon name="search" :size="20" class="text-white/80 shrink-0"/>
          <label for="navbar-search" class="sr-only">Rechercher dans la plateforme</label>
          <input
            id="navbar-search"
            ref="input"
            v-model="term"
            type="text"
            role="combobox"
            autocomplete="off"
            aria-controls="navbar-search-results"
            :aria-expanded="trimmed.length > 0"
            :aria-activedescendant="activeKey ? `navbar-search-${activeKey}` : undefined"
            placeholder="Rechercher un cours, un module, un exercice..."
            class="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-white/60 px-1"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="openActive"
            @keydown.esc="close"
          />
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 shrink-0"
            aria-label="Fermer la recherche"
            @click="close"
          >
            <Icon name="close" :size="18"/>
          </button>
        </div>

        <!-- Résultats : jamais vide, un seul état affiché à la fois -->
        <div
          v-if="trimmed.length > 0"
          id="navbar-search-results"
          role="listbox"
          aria-label="Résultats de recherche"
          :aria-busy="pending"
          class="absolute left-0 right-0 top-full mt-3 max-h-[70vh] overflow-auto bg-surface rounded-2xl shadow-lg border border-line py-2"
        >
          <p v-if="panelState === 'short'" class="px-4 py-3 text-[13px] text-muted">
            Saisissez au moins {{ MIN_SEARCH_LENGTH }} caractères.
          </p>
          <p v-else-if="panelState === 'error'" class="px-4 py-3 text-[13px] text-danger">{{ error }}</p>
          <p v-else-if="panelState === 'searching'" class="px-4 py-3 text-[13px] text-muted">Recherche...</p>
          <p v-else-if="panelState === 'empty'" class="px-4 py-3 text-[13px] text-muted">
            Aucun résultat pour « {{ trimmed }} ».
          </p>

          <!-- Pendant une nouvelle recherche, les résultats précédents restent affichés
               et s'estompent : le panneau ne se vide pas à chaque frappe. -->
          <div v-else class="transition-opacity" :class="{ 'opacity-60': pending }">
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
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Apparition en fondu avec un léger glissement : seules l'opacité et la transformation
   sont animées, deux propriétés que le navigateur anime sans recalculer la mise en page.
   L'ancienne version animait la largeur, ce qui décalait les liens à chaque image. */
.search-overlay-enter-active,
.search-overlay-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.search-overlay-enter-from,
.search-overlay-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>
