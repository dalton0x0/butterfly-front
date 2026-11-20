<script setup>
// Indicateur d'un tableau de bord : une icône, un nombre, un libellé.
// Partagé par les tableaux de bord de chaque rôle pour qu'ils se ressemblent.
import Icon from './Icon.vue'

defineProps({
  label: {type: String, required: true},
  value: {type: [Number, String], required: true},
  icon: {type: String, required: true}
})
</script>

<template>
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex items-center gap-4">
    <div class="w-11 h-11 rounded-full bg-accent/15 text-primary flex items-center justify-center shrink-0">
      <Icon :name="icon" :size="22"/>
    </div>
    <div class="min-w-0">
      <p class="text-[26px] font-semibold text-navy leading-none tabular-nums">{{ value }}</p>
      <p class="text-[13px] text-ink-soft mt-1 truncate">{{ label }}</p>
    </div>
  </div>
</template>
