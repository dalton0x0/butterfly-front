<script setup>
// Fenêtre modale réutilisable. Le contenu est fourni via le slot par défaut.
// Se ferme au clic sur le fond, sur la croix, ou avec la touche Echap.
import {onMounted, onUnmounted} from 'vue'
import Icon from './Icon.vue'

const emit = defineEmits(['close'])

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <transition name="modal">
    <div
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-[420px] overflow-hidden relative">
        <button
          class="absolute top-3 right-3 text-muted hover:text-ink p-1.5 rounded-full hover:bg-surface-tint transition-colors z-10"
          aria-label="Fermer"
          @click="emit('close')"
        >
          <Icon name="close" :size="20"/>
        </button>
        <slot/>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
