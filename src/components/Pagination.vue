<script setup>
// Barre de pagination : page courante, total et navigation.
// Le composant ne charge rien lui-même, il émet la page demandée. La vue reste seule
// responsable de ses données, ce qui le rend réutilisable quelle que soit la source.
import {computed} from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  page: {type: Number, required: true},
  totalPages: {type: Number, required: true},
  totalElements: {type: Number, default: 0},
  // Libellé au pluriel de ce qui est listé, pour un résumé compréhensible.
  itemLabel: {type: String, default: 'éléments'}
})

const emit = defineEmits(['change'])

// Numérotation humaine : la première page est la 1 pour l'utilisateur, la 0 pour Spring.
const displayedPage = computed(() => props.page + 1)

const isFirst = computed(() => props.page <= 0)
const isLast = computed(() => props.page >= props.totalPages - 1)

// Une seule page ne justifie pas d'afficher des commandes de navigation inertes.
const isVisible = computed(() => props.totalPages > 1)

function go(target) {
  if (target !== props.page) {
    emit('change', target)
  }
}
</script>

<template>
  <nav
    v-if="isVisible"
    class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-input"
    aria-label="Pagination"
  >
    <p class="text-[13px] text-ink-soft" aria-live="polite">
      Page {{ displayedPage }} sur {{ totalPages }}
      <span v-if="totalElements"> - {{ totalElements }} {{ itemLabel }}</span>
    </p>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1 h-9 px-3 rounded-[10px] border border-input text-[14px]
               text-ink-soft hover:text-ink hover:bg-surface-tint transition-colors
               disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        :disabled="isFirst"
        @click="go(page - 1)"
      >
        <Icon name="chevron_left" :size="18"/>
        Précédent
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1 h-9 px-3 rounded-[10px] border border-input text-[14px]
               text-ink-soft hover:text-ink hover:bg-surface-tint transition-colors
               disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        :disabled="isLast"
        @click="go(page + 1)"
      >
        Suivant
        <Icon name="chevron_right" :size="18"/>
      </button>
    </div>
  </nav>
</template>
