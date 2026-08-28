<script setup>
// Message de retour flottant, visible quel que soit le défilement de la page.
// Les succès disparaissent seuls, les erreurs attendent une fermeture explicite
// pour laisser le temps de les lire et d'agir.
import {onMounted, onUnmounted} from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  message: {type: String, required: true},
  // 'success' ou 'danger'
  variant: {type: String, default: 'success'},
  // Durée en millisecondes avant fermeture automatique. À 0, le message reste affiché.
  duration: {type: Number, default: 4000}
})

const emit = defineEmits(['close'])

let timerId = null

onMounted(() => {
  if (props.duration > 0) {
    timerId = setTimeout(() => emit('close'), props.duration)
  }
})

onUnmounted(() => {
  if (timerId !== null) {
    clearTimeout(timerId)
  }
})
</script>

<template>
  <!-- Teleport vers body : le message reste positionné par rapport à la fenêtre,
       même si un conteneur parent a son propre défilement. -->
  <Teleport to="body">
    <div
      class="fixed bottom-6 right-6 left-6 sm:left-auto sm:max-w-[420px] z-50 flex items-start gap-3 rounded-[12px] px-4 py-3 shadow-[var(--shadow-card)]"
      :class="variant === 'danger' ? 'bg-danger text-white' : 'bg-[#16a34a] text-white'"
      role="status"
      aria-live="polite"
    >
      <Icon :name="variant === 'danger' ? 'warning' : 'check_circle'" :size="20" class="shrink-0 mt-0.5"/>
      <p class="flex-1 text-[14px] leading-snug">{{ message }}</p>
      <button
        type="button"
        class="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Fermer le message"
        @click="emit('close')"
      >
        <Icon name="close" :size="18"/>
      </button>
    </div>
  </Teleport>
</template>
