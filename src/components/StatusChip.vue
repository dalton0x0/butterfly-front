<script setup>
// Chip de statut
import {computed} from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  label: {type: String, required: true},
  variant: {type: String, default: 'neutral'},
  icon: {type: String, default: ''}
})

const classes = computed(() => {
  const map = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[#16a34a]/12 text-[#16a34a]',
    warning: 'bg-[#f59e0b]/15 text-[#b45309]',
    danger: 'bg-[#ba1a1a]/10 text-[#ba1a1a]',
    neutral: 'bg-[#6d8196]/12 text-[#6d8196]'
  }
  return map[props.variant] || map.neutral
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium whitespace-nowrap"
    :class="classes"
  >
    <Icon v-if="icon" :name="icon" :size="16"/>
    {{ label }}
  </span>
</template>
