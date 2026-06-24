<script setup>
// Anneau de progression circulaire dessiné en SVG.
import {computed} from 'vue'

const props = defineProps({
  value: {type: Number, default: 0},
  size: {type: Number, default: 88},
  stroke: {type: Number, default: 8}
})

const clamped = computed(() => Math.min(100, Math.max(0, props.value)))
const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => circumference.value * (1 - clamped.value / 100))
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="#e2e8f0"
        :stroke-width="stroke"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="var(--color-primary)"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="transition-all"
      />
    </svg>
    <span class="absolute text-base font-semibold text-primary tabular-nums">{{ clamped }} %</span>
  </div>
</template>
