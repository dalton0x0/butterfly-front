<script setup>
// Ligne de réglage : intitulé, description et interrupteur accessible.
//
// Composant d'affichage seulement : le parent enregistre la valeur et gère les erreurs.
defineProps({
  id: {type: String, required: true},
  label: {type: String, required: true},
  description: {type: String, default: ''},
  checked: {type: Boolean, default: false},
  disabled: {type: Boolean, default: false}
})

defineEmits(['toggle'])
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="min-w-0">
      <h3 :id="`${id}-label`" class="text-[15px] font-semibold text-ink">{{ label }}</h3>
      <p v-if="description" class="text-[13px] text-muted">{{ description }}</p>
    </div>
    <button
      type="button"
      role="switch"
      :aria-checked="checked"
      :aria-labelledby="`${id}-label`"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
      :class="checked ? 'bg-primary' : 'bg-input'"
      @click="$emit('toggle')"
    >
      <span
        class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
        :class="checked ? 'translate-x-[22px]' : 'translate-x-[2px]'"
      ></span>
    </button>
  </div>
</template>
