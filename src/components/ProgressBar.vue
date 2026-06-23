<script setup>
// Barre de progression linéaire.
import {computed} from 'vue'

const props = defineProps({
  value: {type: Number, default: 0},
  showLabel: {type: Boolean, default: false}
})

const clamped = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<template>
  <div class="flex items-center gap-3 w-full">
    <div class="h-2 flex-1 rounded-full bg-[#e2e8f0] overflow-hidden">
      <div class="h-full rounded-full bg-primary transition-all" :style="{ width: clamped + '%' }"></div>
    </div>
    <span v-if="showLabel" class="text-sm font-semibold text-primary tabular-nums">{{ clamped }} %</span>
  </div>
</template>
